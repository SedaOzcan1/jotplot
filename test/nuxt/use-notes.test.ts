import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from, rpc } = vi.hoisted(() => {
  // A chainable stand-in for the Supabase query builder; `result` is what awaiting it returns.
  const query = {
    result: { data: null as unknown, error: null as unknown },
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  }
  for (const method of ['insert', 'select', 'order'] as const) query[method].mockReturnValue(query)
  query.single.mockImplementation(() => Promise.resolve(query.result))
  query.range.mockImplementation(() => Promise.resolve(query.result))
  return { query, from: vi.fn(() => query), rpc: vi.fn(() => query) }
})

mockNuxtImport('useSupabaseClient', () => () => ({ from, rpc }))

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

  it('lists the first page of notes, newest first, without filters', async () => {
    const notes = [{ id: 'n2' }, { id: 'n1' }]
    query.result = { data: notes, error: null }

    await expect(useNotes().listNotes()).resolves.toEqual(notes)
    expect(rpc).toHaveBeenCalledWith('search_notes', {
      p_query: undefined,
      p_type: undefined,
      p_mode: undefined,
    })
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(query.range).toHaveBeenCalledWith(0, NOTE_LIST_LIMIT - 1)
  })

  it('passes the search text, type, and mode, and loads later pages', async () => {
    query.result = { data: [], error: null }

    await useNotes().listNotes({ query: '  bütçe ', type: 'audio', mode: 'work' }, 30)

    expect(rpc).toHaveBeenCalledWith('search_notes', {
      p_query: 'bütçe',
      p_type: 'audio',
      p_mode: 'work',
    })
    expect(query.range).toHaveBeenCalledWith(30, 30 + NOTE_LIST_LIMIT - 1)
  })

  it('turns a list error into a NoteServiceError', async () => {
    query.result = { data: null, error: { code: 'PGRST301' } }

    await expect(useNotes().listNotes()).rejects.toMatchObject({ code: 'PGRST301' })
  })
})
