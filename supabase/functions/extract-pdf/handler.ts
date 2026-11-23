import { z } from 'zod'

/**
 * Extracts the text of a PDF note (T3.1). POST with `{ "sourceId": "<uuid>" }` and the user's
 * access token. The file is read with the user's own permissions, its text is saved as the note's
 * raw_text, and the note becomes ready. Extraction takes seconds, so the answer waits for it and
 * can say exactly why a PDF could not be read. Kept free of Deno APIs so it can be tested.
 */

/** At most this many pages (DECISIONS.md). */
export const PDF_MAX_PAGES = 100

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export type ErrorCode =
  | 'invalid_request'
  | 'not_signed_in'
  | 'note_not_found'
  | 'unsupported_note'
  | 'too_many_pages'
  | 'no_text'
  | 'unreadable_pdf'
  | 'internal'

const ERRORS: Record<ErrorCode, { status: number; message: string }> = {
  invalid_request: { status: 400, message: 'İstek geçersiz.' },
  not_signed_in: { status: 401, message: 'Oturumun sona ermiş. Tekrar giriş yap.' },
  note_not_found: { status: 404, message: 'PDF bulunamadı.' },
  unsupported_note: { status: 400, message: 'Bu not bir PDF değil.' },
  too_many_pages: {
    status: 422,
    message: `Bu PDF çok uzun. En fazla ${PDF_MAX_PAGES} sayfalık PDF yükleyebilirsin.`,
  },
  no_text: {
    status: 422,
    message:
      'Bu PDF’te seçilebilir metin bulunamadı. Taranmış ya da fotoğraftan oluşan bir PDF olabilir.',
  },
  unreadable_pdf: {
    status: 422,
    message: 'Bu PDF açılamadı. Bozuk ya da şifreli olabilir.',
  },
  internal: { status: 500, message: 'PDF okunamadı. Biraz sonra tekrar dene; dosyan saklanıyor.' },
}

const requestSchema = z.object({ sourceId: z.uuid() })

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(code: ErrorCode): Response {
  const { status, message } = ERRORS[code]
  return json({ error: { code, message } }, status)
}

export interface PdfNote {
  id: string
  type: string
  status: string
  storage_path: string | null
  raw_text: string | null
}

/** An opened PDF: its page count is known before any text is read. */
export interface OpenedPdf {
  pageCount: number
  /** The text of each page. */
  pages(): Promise<string[]>
}

/** The file could not be opened as a PDF (damaged, encrypted, or not a PDF at all). */
export class UnreadablePdfError extends Error {
  constructor(message = 'unreadable_pdf') {
    super(message)
    this.name = 'UnreadablePdfError'
  }
}

/** Data access with the signed-in user's permissions. */
export interface UserScope {
  userId: string
  loadNote(sourceId: string): Promise<PdfNote | null>
  /** Marks the note as processing; false when extraction is already running or done. */
  startExtraction(sourceId: string): Promise<boolean>
  downloadPdf(storagePath: string): Promise<Uint8Array>
  /** Saves the text and marks the note ready. */
  saveText(sourceId: string, text: string): Promise<void>
  markFailed(sourceId: string): Promise<void>
}

export interface ExtractPdfDeps {
  /** Returns null when the access token is missing or invalid. */
  userScope(authorization: string | null): Promise<UserScope | null>
  /** Throws UnreadablePdfError when the file is not a readable PDF. */
  openPdf(bytes: Uint8Array): Promise<OpenedPdf>
  log?: (message: string, details?: Record<string, unknown>) => void
}

/**
 * Joins the pages into one text: spaces tidied, empty lines collapsed, pages separated by a blank
 * line. Returns an empty string when there is nothing to read.
 */
export function pdfPagesToText(pages: string[]): string {
  return pages
    .map((page) =>
      page
        .replaceAll(String.fromCharCode(0), '')
        .split('\n')
        .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n')
}

/** A PDF counts as having text only if it has some letters; page numbers alone are not enough. */
export function hasReadableText(text: string): boolean {
  return (text.match(/\p{L}/gu) ?? []).length >= 20
}

export function createHandler(deps: ExtractPdfDeps) {
  const log = deps.log ?? (() => {})

  return async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
    if (request.method !== 'POST') return errorResponse('invalid_request')

    const scope = await deps.userScope(request.headers.get('Authorization'))
    if (!scope) return errorResponse('not_signed_in')

    const body = requestSchema.safeParse(await request.json().catch(() => null))
    if (!body.success) return errorResponse('invalid_request')
    const { sourceId } = body.data

    let note: PdfNote | null
    try {
      note = await scope.loadNote(sourceId)
      if (!note) return errorResponse('note_not_found')
      if (note.type !== 'pdf' || !note.storage_path) return errorResponse('unsupported_note')
      if (note.raw_text) return json({ sourceId, status: 'ready' })
      // Only one request extracts a file; another one reports that it is already running.
      if (!(await scope.startExtraction(sourceId))) {
        return json({ sourceId, status: 'processing' }, 202)
      }
    } catch (error) {
      log('Starting a PDF extraction failed', { sourceId, error: String(error) })
      return errorResponse('internal')
    }

    const fail = async (code: ErrorCode, error?: unknown) => {
      log('Extracting a PDF failed', { sourceId, code, error: error ? String(error) : undefined })
      await scope.markFailed(sourceId).catch(() => {})
      return errorResponse(code)
    }

    try {
      const pdf = await deps.openPdf(await scope.downloadPdf(note.storage_path))
      if (pdf.pageCount > PDF_MAX_PAGES) return await fail('too_many_pages')
      const text = pdfPagesToText(await pdf.pages())
      if (!hasReadableText(text)) return await fail('no_text')

      await scope.saveText(sourceId, text)
      return json({ sourceId, status: 'ready', pageCount: pdf.pageCount })
    } catch (error) {
      return await fail(error instanceof UnreadablePdfError ? 'unreadable_pdf' : 'internal', error)
    }
  }
}
