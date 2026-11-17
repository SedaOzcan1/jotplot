import type { NewNote, NoteFilters, NoteListItem } from '~/utils/notes'

/** How many notes the list loads at a time; "Daha fazla göster" loads the next page. */
export const NOTE_LIST_LIMIT = 30

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

  /** One page of notes, newest first, matching the search text, type, and mode. */
  async function listNotes(filters: NoteFilters = {}, offset = 0): Promise<NoteListItem[]> {
    const { data, error } = await supabase
      .rpc('search_notes', {
        p_query: filters.query?.trim() || undefined,
        p_type: filters.type ?? undefined,
        p_mode: filters.mode ?? undefined,
      })
      .select(
        'id, title, raw_text, type, status, created_at, summaries(decisions, proposed_tasks), tasks(count)',
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + NOTE_LIST_LIMIT - 1)
    if (error) throw toNoteServiceError(error)
    return data as unknown as NoteListItem[]
  }

  return { createNote, listNotes }
}
