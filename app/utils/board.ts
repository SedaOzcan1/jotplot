import { z } from 'zod'
import { TASK_TITLE_MAX_LENGTH } from '~/utils/noteResult'

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** Column titles; the default board stores the same titles in `boards.columns`. */
export const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: 'Yapılacak',
  doing: 'Devam Ediyor',
  done: 'Tamamlandı',
}

/** Shorter titles for the mobile column tabs (wireframe 5). */
export const COLUMN_SHORT_TITLES: Record<TaskStatus, string> = {
  todo: 'Yapılacak',
  doing: 'Devam',
  done: 'Tamam',
}

export interface BoardTask {
  id: string
  title: string
  assignee: string | null
  due_date: string | null
  status: TaskStatus
  position: number
  source_id: string | null
  /** The note the task came from, when it still exists. */
  sources: { title: string | null; raw_text: string | null; type: string } | null
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus)
}

/** Tasks of one column, in board order. */
export function columnTasks(tasks: BoardTask[], status: TaskStatus): BoardTask[] {
  return tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
}

/**
 * Position for a task placed in `status` just before `beforeId`, or at the end when `beforeId` is
 * missing. Positions are numbers between the neighbours, so only the moved task changes.
 */
export function positionFor(
  tasks: BoardTask[],
  movingId: string,
  status: TaskStatus,
  beforeId?: string | null,
): number {
  const column = columnTasks(tasks, status).filter((task) => task.id !== movingId)
  const index = beforeId ? column.findIndex((task) => task.id === beforeId) : -1
  if (index === -1) {
    const last = column.at(-1)
    return last ? last.position + 1 : 1
  }
  const next = column[index]!
  const previous = column[index - 1]
  return previous ? (previous.position + next.position) / 2 : next.position - 1
}

/** Returns the list with one task moved; the original list is not changed. */
export function moveTask(
  tasks: BoardTask[],
  id: string,
  status: TaskStatus,
  beforeId?: string | null,
): { tasks: BoardTask[]; position: number } {
  const position = positionFor(tasks, id, status, beforeId)
  return {
    position,
    tasks: tasks.map((task) => (task.id === id ? { ...task, status, position } : task)),
  }
}

/** Fields the task dialog edits. Empty strings mean "not set". */
export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Görevin bir başlığı olmalı.')
    .max(TASK_TITLE_MAX_LENGTH, `Başlık en fazla ${TASK_TITLE_MAX_LENGTH} karakter olabilir.`),
  assignee: z.string().trim(),
  dueDate: z.union([
    z.literal(''),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih seç.'),
  ]),
  status: z.enum(TASK_STATUSES),
})

export type TaskForm = z.input<typeof taskFormSchema>

export interface TaskFields {
  title: string
  assignee: string | null
  due_date: string | null
  status: TaskStatus
}

export function validateTaskForm(values: Partial<TaskForm>) {
  const result = taskFormSchema.safeParse({
    title: values.title ?? '',
    assignee: values.assignee ?? '',
    dueDate: values.dueDate ?? '',
    status: values.status ?? 'todo',
  })
  if (result.success) return []
  return result.error.issues.map((issue) => ({
    name: String(issue.path[0]),
    message: issue.message,
  }))
}

export function toTaskFields(form: TaskForm): TaskFields {
  const parsed = taskFormSchema.parse(form)
  return {
    title: parsed.title,
    assignee: parsed.assignee || null,
    due_date: parsed.dueDate || null,
    status: parsed.status,
  }
}

export function toTaskForm(
  task?: Pick<BoardTask, 'title' | 'assignee' | 'due_date' | 'status'>,
): TaskForm {
  return {
    title: task?.title ?? '',
    assignee: task?.assignee ?? '',
    dueDate: task?.due_date ?? '',
    status: task?.status ?? 'todo',
  }
}

/** Message shown when a change could not be saved; the board shows the last saved state. */
export const BOARD_SAVE_ERROR = 'Değişiklik kaydedilemedi; görev eski yerine döndü. Tekrar dene.'

/**
 * How close a task's due date is, for the card's colour and date badge: overdue, today, tomorrow,
 * later, no date, or done (a finished task is never late).
 */
export type DueState = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'none' | 'done'

const istanbulDate = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/Istanbul',
})

/** Today as YYYY-MM-DD in Turkish time, so "today" does not change at midnight UTC. */
export function todayInTurkey(now = new Date()) {
  return istanbulDate.format(now)
}

function nextDay(date: string) {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}

export function dueState(task: Pick<BoardTask, 'due_date' | 'status'>, today: string): DueState {
  if (task.status === 'done') return 'done'
  if (!task.due_date) return 'none'
  if (task.due_date < today) return 'overdue'
  if (task.due_date === today) return 'today'
  if (task.due_date === nextDay(today)) return 'tomorrow'
  return 'upcoming'
}

/** Words shown before the date, so the state is not told by colour alone. */
export const DUE_STATE_LABELS: Partial<Record<DueState, string>> = {
  overdue: 'Gecikti',
  today: 'Bugün',
  tomorrow: 'Yarın',
}

/** Icon for the note type a task came from. */
export function sourceIcon(type: string) {
  return type === 'audio' ? 'i-lucide-mic' : type === 'pdf' ? 'i-lucide-file' : 'i-lucide-file-text'
}
