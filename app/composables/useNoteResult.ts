import type { AppMode } from '~/composables/useAppMode'
import type { ResultPayload, SummaryRow } from '~/utils/noteResult'

export interface NoteDetail {
  id: string
  title: string | null
  raw_text: string | null
  type: string
  mode: AppMode
  status: string
  created_at: string
}

export interface NoteTask {
  id: string
  title: string
  assignee: string | null
  due_date: string | null
}

/** An error from the process-note function, with the Turkish message it returned. */
export class ProcessNoteError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ProcessNoteError'
  }
}

const PROCESS_FALLBACK_MESSAGE =
  'Not işlenemedi. Bağlantını kontrol edip tekrar dene; notun kaydedildi.'

/** Reads `{ error: { code, message } }` from a failed function response. */
async function toProcessNoteError(error: unknown): Promise<ProcessNoteError> {
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    const body = (await context.json().catch(() => null)) as {
      error?: { code?: string; message?: string }
    } | null
    if (body?.error?.message) {
      return new ProcessNoteError(body.error.code ?? 'unknown', body.error.message)
    }
  }
  return new ProcessNoteError('unknown', PROCESS_FALLBACK_MESSAGE)
}

function toNoteServiceError(error: { code?: string | null }) {
  return new NoteServiceError(error.code === '42501' ? 'not_signed_in' : error.code || 'unknown')
}

/** One note, its AI result, and the tasks that were added to the board from it. */
export function useNoteResult() {
  const supabase = useSupabaseClient()

  async function getNote(id: string): Promise<NoteDetail | null> {
    const { data, error } = await supabase
      .from('sources')
      .select('id, title, raw_text, type, mode, status, created_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw toNoteServiceError(error)
    return data as NoteDetail | null
  }

  async function getSummary(sourceId: string): Promise<SummaryRow | null> {
    const { data, error } = await supabase
      .from('summaries')
      .select('id, summary, decisions, concepts, questions, proposed_tasks')
      .eq('source_id', sourceId)
      .maybeSingle()
    if (error) throw toNoteServiceError(error)
    return data
  }

  async function listNoteTasks(sourceId: string): Promise<NoteTask[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, assignee, due_date')
      .eq('source_id', sourceId)
      .order('position')
    if (error) throw toNoteServiceError(error)
    return data
  }

  /** Runs the AI on the note (Edge Function); the result is saved on the server. */
  async function processNote(sourceId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('process-note', { body: { sourceId } })
    if (error) throw await toProcessNoteError(error)
  }

  /** Saves edits without adding tasks to the board, so nothing typed is lost. */
  async function saveDraft(summaryId: string, result: ResultPayload): Promise<void> {
    const { error } = await supabase
      .from('summaries')
      .update({
        summary: result.summary,
        decisions: result.decisions,
        concepts: result.concepts,
        questions: result.questions,
        proposed_tasks: result.tasks,
      })
      .eq('id', summaryId)
    if (error) throw toNoteServiceError(error)
  }

  /** Saves edits and adds the tasks to the default board; returns how many were added. */
  async function approve(summaryId: string, result: ResultPayload): Promise<number> {
    const { data, error } = await supabase.rpc('approve_summary', {
      p_summary_id: summaryId,
      p_summary: result.summary,
      p_decisions: result.decisions,
      p_concepts: result.concepts,
      p_questions: result.questions,
      p_tasks: result.tasks,
    })
    if (error) throw toNoteServiceError(error)
    return data
  }

  return { getNote, getSummary, listNoteTasks, processNote, saveDraft, approve }
}
