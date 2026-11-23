import { describe, expect, it } from 'vitest'
import {
  documentPath,
  isPdfFile,
  PDF_MAX_BYTES,
  pdfFileError,
  titleFromFileName,
} from '~/utils/pdf'

describe('isPdfFile', () => {
  it('knows a PDF by its type or its name', () => {
    expect(isPdfFile({ type: 'application/pdf', name: 'a' })).toBe(true)
    expect(isPdfFile({ type: '', name: 'Ders Notu.PDF' })).toBe(true)
    expect(isPdfFile({ type: 'audio/mpeg', name: 'kayit.mp3' })).toBe(false)
  })
})

describe('pdfFileError', () => {
  it('accepts a PDF up to 10 MB', () => {
    expect(pdfFileError({ size: PDF_MAX_BYTES })).toBeNull()
  })

  it('explains an empty or too large file in Turkish', () => {
    expect(pdfFileError({ size: 0 })).toContain('boş')
    expect(pdfFileError({ size: 12 * 1024 * 1024 })).toBe(
      'PDF çok büyük (12 MB). En fazla 10 MB yükleyebilirsin.',
    )
  })
})

describe('titleFromFileName', () => {
  it('names the note after the file', () => {
    expect(titleFromFileName('Veri_Yapilari_6.hafta.pdf')).toBe('Veri Yapilari 6.hafta')
    expect(titleFromFileName('Rapor.PDF')).toBe('Rapor')
  })
})

describe('documentPath', () => {
  it('stores the file in the user folder under the note id, as the database requires', () => {
    expect(documentPath('user-1', 'note-1')).toBe('user-1/note-1.pdf')
  })
})
