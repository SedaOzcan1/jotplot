/**
 * PDF notes (T3.1): file checks before uploading. The limits match the `documents` bucket and the
 * extract-pdf function (DECISIONS.md).
 */

/** Matches the bucket's file_size_limit (10 MB). */
export const PDF_MAX_BYTES = 10 * 1024 * 1024
/** Checked by the extract-pdf function once the file is uploaded. */
export const PDF_MAX_PAGES = 100

export const PDF_ACCEPT = '.pdf,application/pdf'

export function isPdfFile(file: { type: string; name?: string }) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name ?? '')
}

/** A Turkish error for a PDF that cannot be uploaded, or null when it is fine. */
export function pdfFileError(file: { size: number }): string | null {
  if (file.size === 0) return 'Dosya boş görünüyor. Başka bir dosya seç.'
  if (file.size > PDF_MAX_BYTES) {
    return `PDF çok büyük (${formatFileSize(file.size)}). En fazla ${formatFileSize(PDF_MAX_BYTES)} yükleyebilirsin.`
  }
  return null
}

/** The file name without ".pdf", used as the note's title when none is written. */
export function titleFromFileName(name: string) {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[_]+/g, ' ')
    .trim()
    .slice(0, 200)
}

/** Path in the documents bucket; the database requires exactly this shape. */
export function documentPath(userId: string, noteId: string) {
  return `${userId}/${noteId}.pdf`
}
