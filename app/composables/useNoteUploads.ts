import type { AppMode } from '~/composables/useAppMode'
import type { AudioExtension } from '~/utils/audio'

export type UploadKind = 'audio' | 'pdf'

/** Turkish message for a failed upload; the file stays on the page in every case. */
export function uploadErrorMessage(error: unknown, kind: UploadKind) {
  const code = error instanceof UploadError ? error.code : 'unknown'
  const kept = kind === 'audio' ? 'Kaydın bu sayfada duruyor' : 'Dosyan bu sayfada duruyor'
  switch (code) {
    case 'not_signed_in':
      return `Oturumun sona ermiş. Başka bir sekmede tekrar giriş yapıp buradan yeniden dene; ${kept.toLocaleLowerCase('tr-TR')}.`
    case 'too_large':
      return `Dosya ${formatFileSize(kind === 'audio' ? AUDIO_MAX_BYTES : PDF_MAX_BYTES)} sınırını aşıyor.`
    case 'aborted':
      return `Yükleme durduruldu. ${kept}; istediğinde tekrar yükleyebilirsin.`
    default:
      return `${kind === 'audio' ? 'Kayıt' : 'Dosya'} yüklenemedi. ${kept}; bağlantını kontrol edip tekrar dene.`
  }
}

/**
 * A recording or PDF on its way to becoming a note. The note id is chosen before uploading so the
 * file can be stored under it; `uploaded` lets a retry skip the upload when only saving the note
 * failed.
 */
export interface UploadDraft {
  id: string
  kind: UploadKind
  file: Blob
  /** The file's extension; always "pdf" for a PDF. */
  extension: AudioExtension | 'pdf'
  title: string
  mode: AppMode
  /** For recordings: when the user confirmed that everyone in it agreed (KVKK). */
  consentConfirmedAt: string | null
  uploaded: boolean
}

export function createUploadDraft(
  file: Blob,
  details: Omit<UploadDraft, 'id' | 'file' | 'uploaded'>,
): UploadDraft {
  return { id: crypto.randomUUID(), file, uploaded: false, ...details }
}

const BUCKETS: Record<UploadKind, string> = { audio: 'recordings', pdf: 'documents' }

/**
 * Notes from files (T2.2, T3.1): uploads a recording to the private `recordings` bucket or a PDF
 * to `documents`, then saves the note. Storage policies allow uploads only into the user's own
 * folder, and the database checks that the note points to that file (and, for recordings, has the
 * consent time).
 */
export function useNoteUploads() {
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()

  async function userAndToken() {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) throw new UploadError('not_signed_in')
    return { userId: session.user.id, token: session.access_token }
  }

  function pathFor(userId: string, draft: UploadDraft) {
    return draft.kind === 'pdf'
      ? documentPath(userId, draft.id)
      : recordingPath(userId, draft.id, draft.extension as AudioExtension)
  }

  async function uploadFile(
    draft: UploadDraft,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
  ) {
    const limit = draft.kind === 'pdf' ? PDF_MAX_BYTES : AUDIO_MAX_BYTES
    if (draft.file.size > limit) throw new UploadError('too_large')
    const { userId, token } = await userAndToken()
    const { url, key } = config.public.supabase as { url: string; key: string }
    const response = await postWithProgress(
      `${url}/storage/v1/object/${BUCKETS[draft.kind]}/${pathFor(userId, draft)}`,
      draft.file,
      {
        Authorization: `Bearer ${token}`,
        apikey: key,
        'Content-Type':
          draft.kind === 'pdf'
            ? 'application/pdf'
            : audioContentType(draft.file, draft.extension as AudioExtension),
        'x-upsert': 'false',
      },
      onProgress,
      signal,
    )
    const code = storageErrorCode(response)
    // 409: the file is already there from an earlier attempt whose answer was lost.
    if (code !== null && code !== '409') {
      if (code === '413') throw new UploadError('too_large')
      if (code === '401' || /jwt|token/i.test(response.body)) {
        throw new UploadError('not_signed_in')
      }
      throw new UploadError('unknown')
    }
    draft.uploaded = true
    onProgress(1)
  }

  async function saveNote(draft: UploadDraft): Promise<string> {
    const { userId } = await userAndToken()
    const { error } = await supabase.from('sources').insert({
      id: draft.id,
      type: draft.kind,
      title: draft.title.trim() || null,
      mode: draft.mode,
      storage_path: pathFor(userId, draft),
      consent_confirmed_at: draft.consentConfirmedAt,
    })
    // 23505: the note was saved by an earlier attempt whose answer was lost.
    if (error && error.code !== '23505') {
      throw new UploadError(error.code === '42501' ? 'not_signed_in' : 'unknown')
    }
    return draft.id
  }

  /** Uploads the file unless an earlier attempt did, then saves the note; returns its id. */
  async function createNoteFromFile(
    draft: UploadDraft,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
  ) {
    if (!draft.uploaded) await uploadFile(draft, onProgress, signal)
    return saveNote(draft)
  }

  return { createNoteFromFile }
}
