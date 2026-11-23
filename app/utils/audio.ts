/**
 * Audio notes (T2.2, US-2.1): file checks, recorder formats, and display helpers. The limits match
 * the `recordings` bucket and the `sources_audio_file` check in the database.
 */

/** Matches the bucket's file_size_limit (25 MB). */
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024

/** File extensions the database accepts, by MIME type. */
const EXTENSION_BY_TYPE: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
}

export const AUDIO_EXTENSIONS = ['webm', 'ogg', 'mp3', 'm4a', 'mp4', 'wav', 'aac', 'flac'] as const
export type AudioExtension = (typeof AUDIO_EXTENSIONS)[number]

/** For the file picker: extensions and types it offers. */
export const AUDIO_ACCEPT = [
  ...AUDIO_EXTENSIONS.map((extension) => `.${extension}`),
  ...Object.keys(EXTENSION_BY_TYPE),
].join(',')

/** The MIME type without parameters: "audio/webm;codecs=opus" → "audio/webm". */
export function baseMimeType(type: string) {
  return type.split(';')[0]!.trim().toLowerCase()
}

/**
 * The extension to store a file under. The MIME type decides when the browser knows it; otherwise
 * the file name does (some phones report an empty type for .m4a files).
 */
export function audioExtension(file: { type: string; name?: string }): AudioExtension | null {
  const fromType = EXTENSION_BY_TYPE[baseMimeType(file.type)]
  if (fromType) return fromType as AudioExtension
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  return AUDIO_EXTENSIONS.includes(fromName as AudioExtension) ? (fromName as AudioExtension) : null
}

/** The type sent to Storage, which accepts only audio/* types. */
export function audioContentType(file: { type: string }, extension: AudioExtension) {
  const type = baseMimeType(file.type)
  if (type.startsWith('audio/')) return type
  return extension === 'mp3'
    ? 'audio/mpeg'
    : extension === 'm4a' || extension === 'mp4'
      ? 'audio/mp4'
      : `audio/${extension}`
}

/** A Turkish error for a file that cannot be uploaded, or null when it is fine. */
export function audioFileError(file: { type: string; name?: string; size: number }): string | null {
  if (!audioExtension(file)) {
    return 'Bu dosya türü desteklenmiyor. MP3, M4A, WAV, WEBM, OGG, AAC veya FLAC ses dosyası seç.'
  }
  if (file.size === 0) return 'Dosya boş görünüyor. Başka bir dosya seç.'
  if (file.size > AUDIO_MAX_BYTES) {
    return `Dosya çok büyük (${formatFileSize(file.size)}). En fazla ${formatFileSize(AUDIO_MAX_BYTES)} yükleyebilirsin.`
  }
  return null
}

/**
 * The first recording format the browser supports. Opus in WebM is small and works in Chrome,
 * Edge, and Firefox; Safari records AAC in MP4.
 */
export function pickRecorderType(isTypeSupported: (type: string) => boolean): string | null {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((type) => isTypeSupported(type)) ?? null
}

/** "1,5 MB", "820 KB". */
export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  const megabytes = bytes / (1024 * 1024)
  return `${megabytes.toLocaleString('tr-TR', { maximumFractionDigits: megabytes < 10 ? 1 : 0 })} MB`
}

/** Elapsed recording time: "0:07", "12:34", "1:02:03". */
export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Path in the recordings bucket; the database requires exactly this shape. */
export function recordingPath(userId: string, noteId: string, extension: AudioExtension) {
  return `${userId}/${noteId}.${extension}`
}

/**
 * Storage answers most errors with HTTP 400 and puts the real code in the body, for example
 * `{"statusCode":"413","error":"Payload too large"}`. Returns that code, or null on success.
 */
export function storageErrorCode(response: { status: number; body: string }): string | null {
  if (response.status >= 200 && response.status < 300) return null
  try {
    const parsed = JSON.parse(response.body) as { statusCode?: unknown }
    if (parsed.statusCode !== undefined) return String(parsed.statusCode)
  } catch {
    // Not JSON, for example a proxy error page.
  }
  return String(response.status)
}
