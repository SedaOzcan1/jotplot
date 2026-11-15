import { z } from 'zod'

/** Matches the `tasks.title` check in the database. */
export const TASK_TITLE_MAX_LENGTH = 300

export const TASK_TYPES = ['task', 'assignment', 'exam', 'study_topic'] as const
export type TaskType = (typeof TASK_TYPES)[number]

/** A task as the AI proposes it and as `approve_summary` expects it. */
export const resultTaskSchema = z.object({
  title: z.string(),
  type: z.enum(TASK_TYPES).catch('task'),
  assignee: z.string().nullable().catch(null),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .catch(null),
})
export type ResultTask = z.infer<typeof resultTaskSchema>

/** Reads `summaries.proposed_tasks`; entries that are not tasks are skipped. */
export function parseProposedTasks(value: unknown): ResultTask[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = resultTaskSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

export function parseStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/** Form state: empty strings instead of nulls, and a stable key for each task row. */
export interface EditableTask {
  key: string
  title: string
  type: TaskType
  assignee: string
  dueDate: string
}

export interface EditableResult {
  summary: string
  decisions: string[]
  concepts: string[]
  questions: string[]
  tasks: EditableTask[]
}

export interface SummaryRow {
  id: string
  summary: string
  decisions: unknown
  concepts: unknown
  questions: unknown
  proposed_tasks: unknown
}

let keyCounter = 0
export function newTaskKey() {
  keyCounter += 1
  return `task-${keyCounter}`
}

export function emptyTask(): EditableTask {
  return { key: newTaskKey(), title: '', type: 'task', assignee: '', dueDate: '' }
}

export function toEditableResult(row: SummaryRow): EditableResult {
  return {
    summary: row.summary,
    decisions: parseStringList(row.decisions),
    concepts: parseStringList(row.concepts),
    questions: parseStringList(row.questions),
    tasks: parseProposedTasks(row.proposed_tasks).map((task) => ({
      key: newTaskKey(),
      title: task.title,
      type: task.type,
      assignee: task.assignee ?? '',
      dueDate: task.due_date ?? '',
    })),
  }
}

export interface ResultPayload {
  summary: string
  decisions: string[]
  concepts: string[]
  questions: string[]
  tasks: ResultTask[]
}

/** Trims every field and drops empty list items; tasks keep their order. */
export function toResultPayload(result: EditableResult): ResultPayload {
  const clean = (items: string[]) => items.map((item) => item.trim()).filter(Boolean)
  return {
    summary: result.summary.trim(),
    decisions: clean(result.decisions),
    concepts: clean(result.concepts),
    questions: clean(result.questions),
    tasks: result.tasks.map((task) => ({
      title: task.title.trim(),
      type: task.type,
      assignee: task.assignee.trim() || null,
      due_date: task.dueDate || null,
    })),
  }
}

/** Keys of tasks that cannot be added to the board, with the reason shown under the title. */
export function taskTitleErrors(tasks: EditableTask[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const task of tasks) {
    const title = task.title.trim()
    if (!title) errors[task.key] = 'Görevin bir başlığı olmalı.'
    else if (title.length > TASK_TITLE_MAX_LENGTH) {
      errors[task.key] = `Başlık en fazla ${TASK_TITLE_MAX_LENGTH} karakter olabilir.`
    }
  }
  return errors
}

const taskDate = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** "18 Kas" for a YYYY-MM-DD date. */
export function formatTaskDate(value: string) {
  return taskDate.format(new Date(`${value}T00:00:00Z`))
}

export const NOTE_STATUS_LABELS: Record<string, string> = {
  pending: 'Henüz işlenmedi',
  processing: 'İşleniyor…',
  failed: 'İşlenemedi',
}
