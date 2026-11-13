import type { NewNote, NoteListItem } from '~/utils/notes'

/** How many notes the list shows until search and paging arrive in T1.8. */
export const NOTE_LIST_LIMIT = 50

function toNoteServiceError(error: { code?: string | null }) {
  // 42501: permission denied, which is what a request without a valid session gets.
  return new NoteServiceError(error.code === '42501' ? 'not_signed_in' : error.code || 'unknown')
}

/**
 * Notes (rows in `sources`) of the signed-in user. Row Level Security limits every query to the
 * user's own rows, and `user_id` defaults to the signed-in user on insert.
 */
export function useNotes() {
  const supabase = useSupabaseClient()

  async function createNote(note: NewNote): Promise<string> {
    const { data, error } = await supabase
      .from('sources')
      .insert({
        type: 'text',
        title: note.title || null,
        raw_text: note.text,
        mode: note.mode,
      })
      .select('id')
      .single()
    if (error) throw toNoteServiceError(error)
    return data.id
  }

  async function listNotes(): Promise<NoteListItem[]> {
    const { data, error } = await supabase
      .from('sources')
      .select('id, title, raw_text, type, created_at')
      .order('created_at', { ascending: false })
      .limit(NOTE_LIST_LIMIT)
    if (error) throw toNoteServiceError(error)
    return data
  }

  return { createNote, listNotes }
}
