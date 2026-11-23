import { describe, expect, it } from 'vitest'
import {
  type BoardTask,
  columnTasks,
  dueState,
  moveTask,
  positionFor,
  sourceIcon,
  todayInTurkey,
  toTaskFields,
  toTaskForm,
  validateTaskForm,
} from '~/utils/board'

function task(id: string, status: BoardTask['status'], position: number): BoardTask {
  return {
    id,
    title: id,
    assignee: null,
    due_date: null,
    status,
    position,
    source_id: null,
    sources: null,
  }
}

const tasks = [
  task('a', 'todo', 1),
  task('c', 'todo', 3),
  task('b', 'todo', 2),
  task('d', 'doing', 1),
]

describe('columnTasks', () => {
  it('returns one column in position order', () => {
    expect(columnTasks(tasks, 'todo').map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(columnTasks(tasks, 'done')).toEqual([])
  })
})

describe('positionFor', () => {
  it('puts a task at the end of a column', () => {
    expect(positionFor(tasks, 'd', 'todo')).toBe(4)
  })

  it('puts a task at position 1 in an empty column', () => {
    expect(positionFor(tasks, 'a', 'done')).toBe(1)
  })

  it('puts a task between two cards', () => {
    expect(positionFor(tasks, 'd', 'todo', 'b')).toBe(1.5)
  })

  it('puts a task before the first card', () => {
    expect(positionFor(tasks, 'd', 'todo', 'a')).toBe(0)
  })

  it('ignores the moving task itself when reordering in the same column', () => {
    // Moving "c" before "b": its old place no longer counts.
    expect(positionFor(tasks, 'c', 'todo', 'b')).toBe(1.5)
  })
})

describe('moveTask', () => {
  it('changes only the moved task and leaves the original list unchanged', () => {
    const result = moveTask(tasks, 'a', 'done')

    expect(result.position).toBe(1)
    expect(result.tasks.find((t) => t.id === 'a')).toMatchObject({ status: 'done', position: 1 })
    expect(tasks.find((t) => t.id === 'a')).toMatchObject({ status: 'todo', position: 1 })
    expect(columnTasks(result.tasks, 'todo').map((t) => t.id)).toEqual(['b', 'c'])
  })
})

describe('task form', () => {
  it('requires a title', () => {
    expect(validateTaskForm({ title: '  ' })).toEqual([
      { name: 'title', message: 'Görevin bir başlığı olmalı.' },
    ])
  })

  it('accepts an empty date and rejects a malformed one', () => {
    expect(validateTaskForm({ title: 'Rapor', dueDate: '' })).toEqual([])
    expect(validateTaskForm({ title: 'Rapor', dueDate: '20.11.2026' })).toEqual([
      { name: 'dueDate', message: 'Geçerli bir tarih seç.' },
    ])
  })

  it('turns the form into task fields with nulls for empty values', () => {
    expect(
      toTaskFields({ title: ' Rapor ', assignee: '  ', dueDate: '2026-11-20', status: 'doing' }),
    ).toEqual({ title: 'Rapor', assignee: null, due_date: '2026-11-20', status: 'doing' })
  })

  it('fills the form from a task', () => {
    expect(toTaskForm({ title: 'Rapor', assignee: null, due_date: null, status: 'done' })).toEqual({
      title: 'Rapor',
      assignee: '',
      dueDate: '',
      status: 'done',
    })
  })
})

describe('due dates', () => {
  const today = '2026-11-23'
  const on = (due_date: string | null, status: BoardTask['status'] = 'todo') =>
    dueState({ due_date, status }, today)

  it('tells overdue, today, tomorrow, and later apart', () => {
    expect(on('2026-11-22')).toBe('overdue')
    expect(on('2026-11-23')).toBe('today')
    expect(on('2026-11-24')).toBe('tomorrow')
    expect(on('2026-11-25')).toBe('upcoming')
    expect(on(null)).toBe('none')
  })

  it('never calls a finished task late', () => {
    expect(on('2026-01-01', 'done')).toBe('done')
  })

  it('counts tomorrow across a month and a year', () => {
    expect(dueState({ due_date: '2026-12-01', status: 'doing' }, '2026-11-30')).toBe('tomorrow')
    expect(dueState({ due_date: '2027-01-01', status: 'todo' }, '2026-12-31')).toBe('tomorrow')
  })

  it('uses Turkish time for today', () => {
    // 22:30 UTC on 23 November is already 24 November in Istanbul (UTC+3).
    expect(todayInTurkey(new Date('2026-11-23T22:30:00Z'))).toBe('2026-11-24')
    expect(todayInTurkey(new Date('2026-11-23T20:59:00Z'))).toBe('2026-11-23')
  })
})

describe('sourceIcon', () => {
  it('shows a microphone for recordings and a page for written notes', () => {
    expect(sourceIcon('audio')).toBe('i-lucide-mic')
    expect(sourceIcon('text')).toBe('i-lucide-file-text')
    expect(sourceIcon('pdf')).toBe('i-lucide-file')
  })
})
