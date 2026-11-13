import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from } = vi.hoisted(() => {
  // A chainable stand-in for the Supabase query builder; `result` is what awaiting it returns.
  const query = {
    result: { data: null as unknown, error: null as unknown },
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  }
  for (const method of ['insert', 'select', 'order'] as const) query[method].mockReturnValue(query)
  query.single.mockImplementation(() => Promise.resolve(query.result))
  query.limit.mockImplementation(() => Promise.resolve(query.result))
  return { query, from: vi.fn(() => query) }
})

mockNuxtImport('useSupabaseClient', () => () => ({ from }))

describe('useNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves a text note and returns its id', async () => {
    query.result = { data: { id: 'note-1' }, error: null }

    const id = await useNotes().createNote({ title: '', text: 'Toplantı notu', mode: 'work' })

    expect(id).toBe('note-1')
    expect(from).toHaveBeenCalledWith('sources')
    expect(query.insert).toHaveBeenCalledWith({
      type: 'text',
      title: null,
      raw_text: 'Toplantı notu',
      mode: 'work',
    })
  })

  it('reports a missing session as not_signed_in', async () => {
    query.result = { data: null, error: { code: '42501', message: 'permission denied' } }

    await expect(
      useNotes().createNote({ title: 'A', text: 'B', mode: 'work' }),
    ).rejects.toMatchObject({ name: 'NoteServiceError', code: 'not_signed_in' })
  })

  it('lists the newest notes first', async () => {
    const notes = [{ id: 'n2' }, { id: 'n1' }]
    query.result = { data: notes, error: null }

    await expect(useNotes().listNotes()).resolves.toEqual(notes)
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(query.limit).toHaveBeenCalledWith(NOTE_LIST_LIMIT)
  })

  it('turns a list error into a NoteServiceError', async () => {
    query.result = { data: null, error: { code: 'PGRST301' } }

    await expect(useNotes().listNotes()).rejects.toMatchObject({ code: 'PGRST301' })
  })
})
