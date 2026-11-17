import type { BoardTask, TaskFields, TaskStatus } from '~/utils/board'

export interface Board {
  id: string
  name: string
}

const TASK_COLUMNS =
  'id, title, assignee, due_date, status, position, source_id, sources(title, raw_text)'

function toNoteServiceError(error: { code?: string | null }) {
  return new NoteServiceError(error.code === '42501' ? 'not_signed_in' : error.code || 'unknown')
}

/**
 * The user's default board for a mode and its tasks. Row Level Security limits every query to the
 * user's own rows. Multiple boards per user arrive with F4.
 */
export function useBoard() {
  const supabase = useSupabaseClient()

  async function loadBoard(mode: string): Promise<{ board: Board | null; tasks: BoardTask[] }> {
    const { data: board, error } = await supabase
      .from('boards')
      .select('id, name')
      .eq('is_default', true)
      .eq('mode', mode)
      .maybeSingle()
    if (error) throw toNoteServiceError(error)
    if (!board) return { board: null, tasks: [] }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('board_id', board.id)
      .order('position')
    if (tasksError) throw toNoteServiceError(tasksError)
    return { board, tasks: tasks as BoardTask[] }
  }

  async function moveTask(id: string, status: TaskStatus, position: number): Promise<void> {
    const { error } = await supabase.from('tasks').update({ status, position }).eq('id', id)
    if (error) throw toNoteServiceError(error)
  }

  async function updateTask(id: string, fields: TaskFields & { position?: number }) {
    const { data, error } = await supabase
      .from('tasks')
      .update(fields)
      .eq('id', id)
      .select(TASK_COLUMNS)
      .single()
    if (error) throw toNoteServiceError(error)
    return data as BoardTask
  }

  async function createTask(boardId: string, fields: TaskFields, position: number) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ board_id: boardId, ...fields, position })
      .select(TASK_COLUMNS)
      .single()
    if (error) throw toNoteServiceError(error)
    return data as BoardTask
  }

  async function deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw toNoteServiceError(error)
  }

  return { loadBoard, moveTask, updateTask, createTask, deleteTask }
}
