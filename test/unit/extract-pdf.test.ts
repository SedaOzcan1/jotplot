import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createHandler,
  type ExtractPdfDeps,
  hasReadableText,
  type PdfNote,
  pdfPagesToText,
  UnreadablePdfError,
} from '../../supabase/functions/extract-pdf/handler'

const SOURCE_ID = 'cccccccc-0000-4000-8000-000000000001'
const PAGES = [
  'Veri Yapıları  -  6. hafta\n\n\n\nİkili arama ağaçları anlatıldı.',
  '   \n  ',
  'Ödev 3 on yedi Aralık’ta teslim.\u0000',
]

describe('pdfPagesToText', () => {
  it('tidies spaces, drops empty pages, and separates pages with a blank line', () => {
    expect(pdfPagesToText(PAGES)).toBe(
      'Veri Yapıları - 6. hafta\n\nİkili arama ağaçları anlatıldı.\n\nÖdev 3 on yedi Aralık’ta teslim.',
    )
  })

  it('returns nothing for pages without text', () => {
    expect(pdfPagesToText(['', '  \n '])).toBe('')
  })
})

describe('hasReadableText', () => {
  it('needs some letters, not only page numbers', () => {
    expect(hasReadableText('1\n\n2\n\n3')).toBe(false)
    expect(hasReadableText('İkili arama ağaçları anlatıldı.')).toBe(true)
  })
})

describe('extract-pdf', () => {
  let note: PdfNote | null
  let pageCount: number
  let deps: ExtractPdfDeps & { openPdf: ReturnType<typeof vi.fn> }
  let scope: {
    startExtraction: ReturnType<typeof vi.fn>
    downloadPdf: ReturnType<typeof vi.fn>
    saveText: ReturnType<typeof vi.fn>
    markFailed: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    note = {
      id: SOURCE_ID,
      type: 'pdf',
      status: 'pending',
      storage_path: `user-1/${SOURCE_ID}.pdf`,
      raw_text: null,
    }
    pageCount = 3
    scope = {
      startExtraction: vi.fn().mockResolvedValue(true),
      downloadPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
      saveText: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    }
    deps = {
      userScope: async (authorization) =>
        authorization === 'Bearer valid'
          ? { userId: 'user-1', loadNote: async () => note, ...scope }
          : null,
      openPdf: vi.fn().mockImplementation(async () => ({
        pageCount,
        pages: async () => PAGES,
      })),
    }
  })

  function post(body: unknown, authorization = 'Bearer valid') {
    return createHandler(deps)(
      new Request('http://localhost/functions/v1/extract-pdf', {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }

  async function errorCode(response: Response) {
    return ((await response.json()) as { error: { code: string } }).error.code
  }

  it('answers the browser’s CORS preflight', async () => {
    const response = await createHandler(deps)(
      new Request('http://localhost', { method: 'OPTIONS' }),
    )
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('needs a signed-in user and a valid note id', async () => {
    expect(await errorCode(await post({ sourceId: SOURCE_ID }, 'Bearer nope'))).toBe(
      'not_signed_in',
    )
    expect(await errorCode(await post({ sourceId: 42 }))).toBe('invalid_request')
  })

  it('saves the text of the PDF and reports the page count', async () => {
    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sourceId: SOURCE_ID, status: 'ready', pageCount: 3 })
    expect(scope.downloadPdf).toHaveBeenCalledWith(`user-1/${SOURCE_ID}.pdf`)
    expect(scope.saveText).toHaveBeenCalledWith(SOURCE_ID, pdfPagesToText(PAGES))
  })

  it('refuses notes that are missing or not PDFs', async () => {
    note = null
    expect(await errorCode(await post({ sourceId: SOURCE_ID }))).toBe('note_not_found')
    note = { id: SOURCE_ID, type: 'audio', status: 'pending', storage_path: 'x', raw_text: null }
    expect(await errorCode(await post({ sourceId: SOURCE_ID }))).toBe('unsupported_note')
    expect(scope.startExtraction).not.toHaveBeenCalled()
  })

  it('does not read a PDF that already has its text, or one being read', async () => {
    note!.raw_text = 'Metin'
    expect(await (await post({ sourceId: SOURCE_ID })).json()).toEqual({
      sourceId: SOURCE_ID,
      status: 'ready',
    })

    note!.raw_text = null
    scope.startExtraction.mockResolvedValue(false)
    expect((await post({ sourceId: SOURCE_ID })).status).toBe(202)
    expect(deps.openPdf).not.toHaveBeenCalled()
  })

  it('refuses a PDF longer than 100 pages without reading its text', async () => {
    pageCount = 101
    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(422)
    expect(await errorCode(response)).toBe('too_many_pages')
    expect(scope.markFailed).toHaveBeenCalledWith(SOURCE_ID)
    expect(scope.saveText).not.toHaveBeenCalled()
  })

  it('explains a scanned PDF without text', async () => {
    deps.openPdf.mockResolvedValue({ pageCount: 2, pages: async () => ['', '12'] })
    const response = await post({ sourceId: SOURCE_ID })

    expect(await errorCode(response)).toBe('no_text')
    expect(scope.markFailed).toHaveBeenCalled()
  })

  it('explains a file that cannot be opened as a PDF', async () => {
    deps.openPdf.mockRejectedValue(new UnreadablePdfError('Invalid PDF structure'))
    expect(await errorCode(await post({ sourceId: SOURCE_ID }))).toBe('unreadable_pdf')
  })

  it('marks the note failed when the file cannot be downloaded', async () => {
    scope.downloadPdf.mockRejectedValue(new Error('storage down'))
    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(500)
    expect(scope.markFailed).toHaveBeenCalledWith(SOURCE_ID)
  })
})
