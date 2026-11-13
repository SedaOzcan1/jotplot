import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NoteForm from '~/components/NoteForm.vue'

const { notesMock, navigateToMock } = vi.hoisted(() => ({
  notesMock: { createNote: vi.fn(), listNotes: vi.fn() },
  navigateToMock: vi.fn(),
}))

mockNuxtImport('useNotes', () => () => notesMock)
mockNuxtImport('navigateTo', () => navigateToMock)

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

async function fillAndSubmit(wrapper: Wrapper, title: string, text: string) {
  await wrapper.find('input').setValue(title)
  await wrapper.find('textarea').setValue(text)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('NoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not save an empty note and explains why', async () => {
    const wrapper = await mountSuspended(NoteForm)

    await fillAndSubmit(wrapper, 'Başlık', '   ')

    expect(wrapper.text()).toContain('Not metnini yaz ya da yapıştır.')
    expect(notesMock.createNote).not.toHaveBeenCalled()
  })

  it('saves the trimmed note in the current mode and returns to the notes list', async () => {
    notesMock.createNote.mockResolvedValue('note-1')
    const wrapper = await mountSuspended(NoteForm)

    await fillAndSubmit(wrapper, '  Haftalık toplantı ', '\nAyşe raporu cumaya hazırlayacak.\n')

    expect(notesMock.createNote).toHaveBeenCalledWith({
      title: 'Haftalık toplantı',
      text: 'Ayşe raporu cumaya hazırlayacak.',
      mode: 'work',
    })
    expect(navigateToMock).toHaveBeenCalledWith('/notes')
  })

  it('keeps the typed text and shows an error when saving fails', async () => {
    notesMock.createNote.mockRejectedValue(new Error('network'))
    const wrapper = await mountSuspended(NoteForm)

    await fillAndSubmit(wrapper, '', 'Kaybolmaması gereken not')

    expect(wrapper.find('[role="alert"]').text()).toContain('Yazdığın metin duruyor')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      'Kaybolmaması gereken not',
    )
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('shows how many characters are used out of the limit', async () => {
    const wrapper = await mountSuspended(NoteForm)

    await wrapper.find('textarea').setValue('a'.repeat(1234))

    expect(wrapper.text()).toContain('1.234 / 20.000 karakter')
  })
})
