import { describe, expect, it } from 'vitest'
import {
  type BoardTask,
  columnTasks,
  moveTask,
  positionFor,
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
