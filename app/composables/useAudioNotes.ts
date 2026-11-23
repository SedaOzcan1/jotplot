import type { AppMode } from '~/composables/useAppMode'
import type { AudioExtension } from '~/utils/audio'

export type AudioUploadErrorCode = 'not_signed_in' | 'too_large' | 'network' | 'aborted' | 'unknown'

export class AudioUploadError extends Error {
  constructor(readonly code: AudioUploadErrorCode) {
    super(code)
    this.name = 'AudioUploadError'
  }
}

export function audioUploadErrorMessage(error: unknown) {
  const code = error instanceof AudioUploadError ? error.code : 'unknown'
  switch (code) {
    case 'not_signed_in':
      return 'Oturumun sona ermiş. Başka bir sekmede tekrar giriş yapıp buradan yeniden dene; kaydın bu sayfada duruyor.'
    case 'too_large':
      return `Dosya ${formatFileSize(AUDIO_MAX_BYTES)} sınırını aşıyor. Daha kısa bir kayıt seç.`
    case 'aborted':
      return 'Yükleme durduruldu. Kaydın bu sayfada duruyor; istediğinde tekrar yükleyebilirsin.'
    default:
      return 'Kayıt yüklenemedi. Kaydın bu sayfada duruyor; bağlantını kontrol edip tekrar dene.'
  }
}

/**
 * A recording on its way to becoming a note. The note id is chosen before uploading so the file
 * can be stored under it; `uploaded` lets a retry skip the upload when only saving the note failed.
 */
export interface AudioNoteDraft {
  id: string
  file: Blob
  extension: AudioExtension
  title: string
  mode: AppMode
  /** When the user confirmed that everyone in the recording agreed (KVKK). */
  consentConfirmedAt: string
  uploaded: boolean
}

export function createAudioNoteDraft(
  file: Blob,
  details: Pick<AudioNoteDraft, 'extension' | 'title' | 'mode' | 'consentConfirmedAt'>,
): AudioNoteDraft {
  return { id: crypto.randomUUID(), file, uploaded: false, ...details }
}

/** Sends the file with XMLHttpRequest, which reports upload progress (fetch does not). */
function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value)
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    })
    request.addEventListener('load', () =>
      resolve({ status: request.status, body: request.responseText }),
    )
    request.addEventListener('error', () => reject(new AudioUploadError('network')))
    request.addEventListener('abort', () => reject(new AudioUploadError('aborted')))
    signal?.addEventListener('abort', () => request.abort(), { once: true })
    request.send(body)
  })
}

/**
 * Audio notes (T2.2): uploads the recording to the private `recordings` bucket, then saves the
 * note. Storage policies allow uploads only into the user's own folder, and the database checks
 * that the note points to that file and has the consent time.
 */
export function useAudioNotes() {
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()

  async function userAndToken() {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) throw new AudioUploadError('not_signed_in')
    return { userId: session.user.id, token: session.access_token }
  }

  async function uploadRecording(
    draft: AudioNoteDraft,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
  ) {
    if (draft.file.size > AUDIO_MAX_BYTES) throw new AudioUploadError('too_large')
    const { userId, token } = await userAndToken()
    const path = recordingPath(userId, draft.id, draft.extension)
    const { url, key } = config.public.supabase as { url: string; key: string }
    const response = await putWithProgress(
      `${url}/storage/v1/object/recordings/${path}`,
      draft.file,
      {
        Authorization: `Bearer ${token}`,
        apikey: key,
        'Content-Type': audioContentType(draft.file, draft.extension),
        'x-upsert': 'false',
      },
      onProgress,
      signal,
    )
    const code = storageErrorCode(response)
    // The file is already there from an earlier attempt whose answer was lost.
    if (code !== null && code !== '409') {
      if (code === '413') throw new AudioUploadError('too_large')
      if (code === '401' || /jwt|token/i.test(response.body)) {
        throw new AudioUploadError('not_signed_in')
      }
      throw new AudioUploadError('unknown')
    }
    draft.uploaded = true
    onProgress(1)
  }

  async function saveAudioNote(draft: AudioNoteDraft): Promise<string> {
    const { userId } = await userAndToken()
    const { error } = await supabase.from('sources').insert({
      id: draft.id,
      type: 'audio',
      title: draft.title.trim() || null,
      mode: draft.mode,
      storage_path: recordingPath(userId, draft.id, draft.extension),
      consent_confirmed_at: draft.consentConfirmedAt,
    })
    // 23505: the note was saved by an earlier attempt whose answer was lost.
    if (error && error.code !== '23505') {
      throw new AudioUploadError(error.code === '42501' ? 'not_signed_in' : 'unknown')
    }
    return draft.id
  }

  /** Uploads the file unless an earlier attempt did, then saves the note; returns its id. */
  async function createAudioNote(
    draft: AudioNoteDraft,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
  ) {
    if (!draft.uploaded) await uploadRecording(draft, onProgress, signal)
    return saveAudioNote(draft)
  }

  return { createAudioNote }
}
