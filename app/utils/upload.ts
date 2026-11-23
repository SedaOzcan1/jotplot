/** Errors while uploading a recording or a PDF, by cause. */
export type UploadErrorCode = 'not_signed_in' | 'too_large' | 'network' | 'aborted' | 'unknown'

export class UploadError extends Error {
  constructor(readonly code: UploadErrorCode) {
    super(code)
    this.name = 'UploadError'
  }
}

/** Sends a file with XMLHttpRequest, which reports upload progress (fetch does not). */
export function postWithProgress(
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
    request.addEventListener('error', () => reject(new UploadError('network')))
    request.addEventListener('abort', () => reject(new UploadError('aborted')))
    signal?.addEventListener('abort', () => request.abort(), { once: true })
    request.send(body)
  })
}
