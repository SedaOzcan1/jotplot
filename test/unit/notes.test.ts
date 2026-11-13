import { describe, expect, it } from 'vitest'
import {
  formatNoteDate,
  newNoteSchema,
  NOTE_TEXT_MAX_LENGTH,
  noteDisplayTitle,
  noteErrorMessage,
  NoteServiceError,
  validateNewNote,
} from '~/utils/notes'

describe('validateNewNote', () => {
  it('accepts a note with text and no title', () => {
    expect(validateNewNote({ title: '', text: 'Toplantı notu' })).toEqual([])
  })

  it('requires text that is not only whitespace', () => {
    expect(validateNewNote({ title: 'Başlık', text: '  \n ' })).toEqual([
      { name: 'text', message: 'Not metnini yaz ya da yapıştır.' },
    ])
  })

  it('limits the text to 20,000 characters', () => {
    expect(validateNewNote({ text: 'a'.repeat(NOTE_TEXT_MAX_LENGTH) })).toEqual([])
    expect(validateNewNote({ text: 'a'.repeat(NOTE_TEXT_MAX_LENGTH + 1) })).toEqual([
      { name: 'text', message: 'Not en fazla 20.000 karakter olabilir.' },
    ])
  })

  it('limits the title to 200 characters', () => {
    expect(validateNewNote({ title: 'b'.repeat(201), text: 'metin' })).toEqual([
      { name: 'title', message: 'Başlık en fazla 200 karakter olabilir.' },
    ])
  })

  it('trims the title and text before saving', () => {
    expect(newNoteSchema.parse({ title: '  Haftalık  ', text: '\n Not \n' })).toEqual({
      title: 'Haftalık',
      text: 'Not',
    })
  })
})

describe('noteDisplayTitle', () => {
  it('uses the title when there is one', () => {
    expect(noteDisplayTitle({ title: 'Sprint planı', raw_text: 'Metin' })).toBe('Sprint planı')
  })

  it('falls back to the first non-empty line of the text', () => {
    expect(
      noteDisplayTitle({ title: null, raw_text: '\n  Ayşe raporu hazırlayacak\nikinci' }),
    ).toBe('Ayşe raporu hazırlayacak')
  })

  it('shortens a long first line', () => {
    const title = noteDisplayTitle({ title: '', raw_text: 'x'.repeat(100) }, 10)
    expect(title).toBe(`${'x'.repeat(9)}…`)
  })

  it('uses a placeholder when there is no title or text', () => {
    expect(noteDisplayTitle({ title: null, raw_text: null })).toBe('Başlıksız not')
  })
})

describe('formatNoteDate', () => {
  const now = new Date('2026-11-13T12:00:00Z')

  it('shows a short Turkish date in Istanbul time', () => {
    expect(formatNoteDate('2026-11-12T08:00:00Z', now)).toBe('12 Kas')
    // 22:30 UTC on 12 November is already 13 November in Istanbul.
    expect(formatNoteDate('2026-11-12T22:30:00Z', now)).toBe('13 Kas')
  })

  it('adds the year for notes from another year', () => {
    expect(formatNoteDate('2025-12-30T08:00:00Z', now)).toBe('30 Ara 2025')
  })
})

describe('noteErrorMessage', () => {
  it('tells the user their text is kept when saving fails', () => {
    expect(noteErrorMessage(new Error('network'), 'save')).toContain('Yazdığın metin duruyor')
  })

  it('asks the user to sign in again when the session has expired', () => {
    expect(noteErrorMessage(new NoteServiceError('not_signed_in'), 'save')).toContain(
      'Tekrar giriş yap',
    )
  })

  it('has a message for a failed list load', () => {
    expect(noteErrorMessage(new NoteServiceError('unknown'), 'load')).toBe(
      'Notlar yüklenemedi. Bağlantını kontrol edip tekrar dene.',
    )
  })
})
