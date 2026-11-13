import { z } from 'zod'
import type { AppMode } from '~/composables/useAppMode'

/** Matches the `sources_text_note_length` check in the database. */
export const NOTE_TEXT_MAX_LENGTH = 20_000
/** Matches the `sources.title` check in the database. */
export const NOTE_TITLE_MAX_LENGTH = 200

export const newNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .max(NOTE_TITLE_MAX_LENGTH, `Başlık en fazla ${NOTE_TITLE_MAX_LENGTH} karakter olabilir.`),
  text: z
    .string()
    .trim()
    .min(1, 'Not metnini yaz ya da yapıştır.')
    .max(
      NOTE_TEXT_MAX_LENGTH,
      `Not en fazla ${NOTE_TEXT_MAX_LENGTH.toLocaleString('tr-TR')} karakter olabilir.`,
    ),
})

export type NewNoteInput = z.input<typeof newNoteSchema>
export type NewNote = z.output<typeof newNoteSchema> & { mode: AppMode }

/** Field errors for the new note form, in the shape Nuxt UI's UForm expects. */
export function validateNewNote(values: Partial<NewNoteInput>) {
  const result = newNoteSchema.safeParse({ title: values.title ?? '', text: values.text ?? '' })
  if (result.success) return []
  return result.error.issues.map((issue) => ({
    name: String(issue.path[0]),
    message: issue.message,
  }))
}

export interface NoteListItem {
  id: string
  title: string | null
  raw_text: string | null
  type: string
  created_at: string
}

/** Title shown in lists: the note's title, else its first non-empty line, else a placeholder. */
export function noteDisplayTitle(note: Pick<NoteListItem, 'title' | 'raw_text'>, maxLength = 80) {
  const title = note.title?.trim()
  if (title) return title
  const firstLine = note.raw_text
    ?.split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  if (!firstLine) return 'Başlıksız not'
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength - 1)}…` : firstLine
}

const TIME_ZONE = 'Europe/Istanbul'
const shortDate = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})
const shortDateWithYear = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})
const yearOf = new Intl.DateTimeFormat('tr-TR', { year: 'numeric', timeZone: TIME_ZONE })

/** Short Turkish date such as "12 Kas"; the year is added for notes from another year. */
export function formatNoteDate(iso: string, now = new Date()) {
  const date = new Date(iso)
  const sameYear = yearOf.format(date) === yearOf.format(now)
  return (sameYear ? shortDate : shortDateWithYear).format(date)
}

export class NoteServiceError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'NoteServiceError'
  }
}

export function noteErrorMessage(error: unknown, action: 'save' | 'load') {
  if (error instanceof NoteServiceError && error.code === 'not_signed_in') {
    return 'Oturumun sona ermiş. Tekrar giriş yap; yazdığın not bu sayfada duruyor.'
  }
  return action === 'save'
    ? 'Not kaydedilemedi. Yazdığın metin duruyor; bağlantını kontrol edip tekrar dene.'
    : 'Notlar yüklenemedi. Bağlantını kontrol edip tekrar dene.'
}
