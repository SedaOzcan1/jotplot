import { describe, expect, it } from 'vitest'
import {
  emptyTask,
  formatTaskDate,
  parseProposedTasks,
  taskTitleErrors,
  toEditableResult,
  toResultPayload,
} from '~/utils/noteResult'
import { noteStatusLine } from '~/utils/notes'

const row = {
  id: 'summary-1',
  summary: 'Özet',
  decisions: ['Lansman ertelendi'],
  concepts: [],
  questions: ['Ajans kim?', 42],
  proposed_tasks: [
    { title: 'Görselleri hazırla', type: 'task', assignee: 'Elif', due_date: '2026-11-20' },
    { title: 'Bütçeyi güncelle', type: 'unknown', assignee: null, due_date: 'cuma' },
    'bozuk',
  ],
}

describe('toEditableResult', () => {
  it('turns a saved summary into form state with empty strings for missing values', () => {
    const result = toEditableResult(row)

    expect(result.summary).toBe('Özet')
    expect(result.questions).toEqual(['Ajans kim?'])
    expect(result.tasks.map(({ key: _key, ...task }) => task)).toEqual([
      { title: 'Görselleri hazırla', type: 'task', assignee: 'Elif', dueDate: '2026-11-20' },
      // Unknown types fall back to "task" and invalid dates are dropped.
      { title: 'Bütçeyi güncelle', type: 'task', assignee: '', dueDate: '' },
    ])
    expect(new Set(result.tasks.map((task) => task.key)).size).toBe(2)
  })
})

describe('parseProposedTasks', () => {
  it('returns an empty list for anything that is not a list', () => {
    expect(parseProposedTasks({ title: 'x' })).toEqual([])
    expect(parseProposedTasks(null)).toEqual([])
  })
})

describe('toResultPayload', () => {
  it('trims fields, drops empty list items, and turns empty strings into null', () => {
    const result = toEditableResult(row)
    result.decisions.push('   ')
    result.tasks[0]!.title = '  Görselleri hazırla  '
    result.tasks[1]!.assignee = '  '

    expect(toResultPayload(result)).toEqual({
      summary: 'Özet',
      decisions: ['Lansman ertelendi'],
      concepts: [],
      questions: ['Ajans kim?'],
      tasks: [
        { title: 'Görselleri hazırla', type: 'task', assignee: 'Elif', due_date: '2026-11-20' },
        { title: 'Bütçeyi güncelle', type: 'task', assignee: null, due_date: null },
      ],
    })
  })
})

describe('taskTitleErrors', () => {
  it('flags tasks without a title or with a title that is too long', () => {
    const empty = emptyTask()
    const long = { ...emptyTask(), title: 'x'.repeat(301) }
    const fine = { ...emptyTask(), title: 'Raporu hazırla' }

    expect(taskTitleErrors([empty, long, fine])).toEqual({
      [empty.key]: 'Görevin bir başlığı olmalı.',
      [long.key]: 'Başlık en fazla 300 karakter olabilir.',
    })
  })
})

describe('formatTaskDate', () => {
  it('shows a short Turkish date', () => {
    expect(formatTaskDate('2026-11-18')).toBe('18 Kas')
  })
})

describe('noteStatusLine', () => {
  it('describes notes that have not been processed yet', () => {
    expect(noteStatusLine({ status: 'pending', summaries: [], tasks: [{ count: 0 }] })).toBe(
      'Henüz işlenmedi',
    )
    expect(noteStatusLine({ status: 'processing', summaries: null, tasks: null })).toBe(
      'İşleniyor…',
    )
    expect(noteStatusLine({ status: 'failed', summaries: [], tasks: null })).toBe('İşlenemedi')
  })

  it('describes where a recording is in transcription', () => {
    const audio = (status: string) =>
      noteStatusLine({ type: 'audio', status, summaries: [], tasks: [{ count: 0 }] })
    expect(audio('pending')).toBe('Yazıya dökülmeyi bekliyor')
    expect(audio('processing')).toBe('Yazıya dökülüyor…')
    expect(audio('failed')).toBe('Yazıya dökülemedi')
    expect(audio('ready')).toBe('Transkript hazır')
  })

  it('counts proposed and approved tasks and the decisions', () => {
    expect(
      noteStatusLine({
        status: 'ready',
        summaries: [{ decisions: ['a', 'b'], proposed_tasks: [{}, {}] }],
        tasks: [{ count: 2 }],
      }),
    ).toBe('4 görev · 2 karar')
    expect(
      noteStatusLine({
        status: 'ready',
        summaries: [{ decisions: [], proposed_tasks: [] }],
        tasks: [{ count: 0 }],
      }),
    ).toBe('0 görev')
  })
})
