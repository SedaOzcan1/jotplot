import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NoteForm from '~/components/NoteForm.vue'

const { notesMock, navigateToMock, usageMock } = vi.hoisted(() => ({
  notesMock: { createNote: vi.fn(), listNotes: vi.fn() },
  navigateToMock: vi.fn(),
  usageMock: { getAiUsage: vi.fn() },
}))

mockNuxtImport('useNotes', () => () => notesMock)
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useAiUsage', () => () => usageMock)

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

/** Fills the form and submits it with one of its two buttons. */
async function fillAndSubmit(
  wrapper: Wrapper,
  title: string,
  text: string,
  button: 'Notu kaydet' | 'Görevleri çıkar' = 'Notu kaydet',
) {
  await wrapper.find('input').setValue(title)
  await wrapper.find('textarea').setValue(text)
  const submit = wrapper
    .findAll('button[type="submit"]')
    .find((candidate: { text(): string }) => candidate.text().includes(button))
  // A real click runs the button's handler first, then submits the form.
  await submit!.trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('NoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usageMock.getAiUsage.mockResolvedValue({
      used: 0,
      limit: 50,
      plan: 'free',
      period: '2026-11-01',
    })
    clearNuxtData('ai-usage')
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

  it('opens the note’s page and starts processing with "Görevleri çıkar"', async () => {
    notesMock.createNote.mockResolvedValue('note-1')
    const wrapper = await mountSuspended(NoteForm)

    await fillAndSubmit(wrapper, '', 'Ayşe raporu cumaya hazırlayacak.', 'Görevleri çıkar')

    expect(notesMock.createNote).toHaveBeenCalledOnce()
    expect(navigateToMock).toHaveBeenCalledWith('/notes/note-1?process=1')
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

  it('disables "Görevleri çıkar" and explains why when the monthly limit is reached', async () => {
    usageMock.getAiUsage.mockResolvedValue({
      used: 50,
      limit: 50,
      plan: 'free',
      period: '2026-11-01',
    })
    const wrapper = await mountSuspended(NoteForm)
    await flushPromises()

    expect(wrapper.text()).toContain('Bu ayki 50 AI işleme hakkını doldurdun')
    const buttons = wrapper.findAll('button[type="submit"]')
    const process = buttons.find((b: { text(): string }) => b.text().includes('Görevleri çıkar'))
    const save = buttons.find((b: { text(): string }) => b.text().includes('Notu kaydet'))
    expect(process!.attributes('disabled')).toBeDefined()
    expect(save!.attributes('disabled')).toBeUndefined()
  })

  it('warns when few requests are left', async () => {
    usageMock.getAiUsage.mockResolvedValue({
      used: 46,
      limit: 50,
      plan: 'free',
      period: '2026-11-01',
    })
    const wrapper = await mountSuspended(NoteForm)
    await flushPromises()

    expect(wrapper.text()).toContain('Bu ay 4 AI işleme hakkın kaldı')
  })
})
