import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from } = vi.hoisted(() => {
  // A chainable stand-in for the Supabase query builder. Awaiting it, or calling a terminal
  // method, returns the next queued result.
  const results: { data: unknown; error: unknown }[] = []
  const next = () => Promise.resolve(results.shift() ?? { data: null, error: null })
  const query = {
    results,
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn(next),
    single: vi.fn(next),
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      next().then(resolve, reject),
  }
  for (const method of ['select', 'eq', 'order', 'update', 'insert', 'delete'] as const) {
    query[method].mockReturnValue(query)
  }
  return { query, from: vi.fn(() => query) }
})

mockNuxtImport('useSupabaseClient', () => () => ({ from }))

describe('useBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    query.results.length = 0
  })

  it('loads the default board for the mode and its tasks', async () => {
    const tasks = [{ id: 't1', title: 'Rapor', status: 'todo', position: 1 }]
    query.results.push({ data: { id: 'board-1', name: 'Panom' }, error: null })
    query.results.push({ data: tasks, error: null })

    const result = await useBoard().loadBoard('work')

    expect(result).toEqual({ board: { id: 'board-1', name: 'Panom' }, tasks })
    expect(from).toHaveBeenNthCalledWith(1, 'boards')
    expect(query.eq).toHaveBeenCalledWith('is_default', true)
    expect(query.eq).toHaveBeenCalledWith('mode', 'work')
    expect(from).toHaveBeenNthCalledWith(2, 'tasks')
    expect(query.eq).toHaveBeenCalledWith('board_id', 'board-1')
  })

  it('returns no board when the mode has none yet', async () => {
    query.results.push({ data: null, error: null })

    await expect(useBoard().loadBoard('student')).resolves.toEqual({ board: null, tasks: [] })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('saves a move with the new status and position', async () => {
    await useBoard().moveTask('t1', 'doing', 2.5)

    expect(query.update).toHaveBeenCalledWith({ status: 'doing', position: 2.5 })
    expect(query.eq).toHaveBeenCalledWith('id', 't1')
  })

  it('throws when a move cannot be saved, so the board can undo it', async () => {
    query.results.push({ data: null, error: { code: '42501' } })

    await expect(useBoard().moveTask('t1', 'done', 1)).rejects.toMatchObject({
      name: 'NoteServiceError',
      code: 'not_signed_in',
    })
  })

  it('creates a task on the board', async () => {
    const fields = { title: 'Rapor', assignee: null, due_date: null, status: 'todo' as const }
    query.results.push({ data: { id: 't2', ...fields }, error: null })

    await expect(useBoard().createTask('board-1', fields, 4)).resolves.toMatchObject({ id: 't2' })
    expect(query.insert).toHaveBeenCalledWith({ board_id: 'board-1', ...fields, position: 4 })
  })

  it('deletes a task', async () => {
    await useBoard().deleteTask('t1')

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 't1')
  })
})
