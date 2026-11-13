<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewNoteInput } from '~/utils/notes'

const { createNote } = useNotes()
const { mode } = useAppMode()
const toast = useToast()
const ready = useIsMounted()

const state = reactive<NewNoteInput>({ title: '', text: '' })
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const textLength = computed(() => state.text.length)
const overLimit = computed(() => textLength.value > NOTE_TEXT_MAX_LENGTH)
const formatCount = (value: number) => value.toLocaleString('tr-TR')

async function onSubmit(event: FormSubmitEvent<NewNoteInput>) {
  if (saving.value) return
  errorMessage.value = null
  saving.value = true
  try {
    const note = newNoteSchema.parse(event.data)
    await createNote({ ...note, mode: mode.value })
    toast.add({ title: 'Not kaydedildi', color: 'success', icon: 'i-lucide-check' })
    await navigateTo('/notes')
  } catch (error) {
    // The form keeps what the user wrote so they can try again.
    errorMessage.value = noteErrorMessage(error, 'save')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UForm :state="state" :validate="validateNewNote" class="max-w-3xl space-y-4" @submit="onSubmit">
    <UAlert
      v-if="errorMessage"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
    />

    <ModeSwitch label="Notun modu" />

    <UFormField label="Başlık (isteğe bağlı)" name="title">
      <UInput
        v-model="state.title"
        placeholder="Örn. Kampanya haftalık toplantısı"
        :maxlength="NOTE_TITLE_MAX_LENGTH"
        size="lg"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Not" name="text">
      <UTextarea
        v-model="state.text"
        placeholder="Toplantı notunu buraya yapıştır…"
        :rows="14"
        autoresize
        :maxrows="28"
        size="lg"
        class="w-full"
      />
      <template #help>
        <span :class="overLimit ? 'text-error' : 'text-slate-500'">
          {{ formatCount(textLength) }} / {{ formatCount(NOTE_TEXT_MAX_LENGTH) }} karakter
        </span>
      </template>
    </UFormField>

    <UButton
      type="submit"
      size="xl"
      block
      class="bg-brand-gradient"
      :loading="saving"
      :disabled="!ready"
    >
      Notu kaydet
    </UButton>
  </UForm>
</template>
