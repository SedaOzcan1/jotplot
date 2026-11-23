<script setup lang="ts">
import { ProcessNoteError, type NoteTranscript } from '~/composables/useNoteResult'

/**
 * Transcription state of an audio note (T2.3, US-2.2). A recording that was never transcribed
 * starts on its own; while it is processing, the note is checked again every few seconds.
 */
const props = defineProps<{
  note: { id: string; status: string }
  transcript: NoteTranscript | null
}>()
const emit = defineEmits<{ refresh: [] }>()

/** How often the note is checked while it is being transcribed. */
const POLL_MS = 3000

const { transcribeAudio } = useNoteResult()
const ready = useIsMounted()

const starting = ref(false)
const startError = ref<string | null>(null)
const limitReached = ref(false)
/** Start on its own only once per visit, so a refused start does not repeat in a loop. */
let autoStarted = false

async function start() {
  if (starting.value) return
  starting.value = true
  startError.value = null
  limitReached.value = false
  try {
    await transcribeAudio(props.note.id)
  } catch (error) {
    limitReached.value = error instanceof ProcessNoteError && error.code === 'limit_reached'
    startError.value =
      error instanceof ProcessNoteError
        ? error.message
        : 'Kayıt yazıya dökülemedi. Bağlantını kontrol edip tekrar dene; kaydın saklanıyor.'
  } finally {
    starting.value = false
    emit('refresh')
  }
}

onMounted(() => {
  if (props.note.status === 'pending' && !props.transcript && !autoStarted) {
    autoStarted = true
    void start()
  }
})

const processing = computed(() => starting.value || props.note.status === 'processing')

let timer: ReturnType<typeof setInterval> | undefined
watch(
  () => props.note.status === 'processing',
  (isProcessing) => {
    clearInterval(timer)
    if (isProcessing) timer = setInterval(() => emit('refresh'), POLL_MS)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div
    v-if="processing"
    role="status"
    class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-10 text-center ring-1 ring-navy-100"
  >
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-navy-500" />
    <p class="font-semibold text-navy-900">Kaydın yazıya dökülüyor…</p>
    <p class="max-w-md text-sm text-slate-500">
      Bu genelde bir dakikadan kısa sürer. Sayfadan ayrılabilirsin; iş arka planda devam eder.
    </p>
  </div>

  <template v-else-if="limitReached">
    <UAlert
      role="alert"
      color="warning"
      variant="subtle"
      icon="i-lucide-gauge"
      title="Bu ayki ses dakikan doldu"
      :description="startError ?? undefined"
    />
    <UButton to="/settings" size="xl" block color="neutral" variant="outline">
      Kullanımı gör
    </UButton>
  </template>

  <template v-else-if="startError || note.status === 'failed'">
    <UAlert
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Kayıt yazıya dökülemedi"
      :description="
        startError ??
        'Kayıtta anlaşılır bir konuşma olmayabilir ya da servis geçici olarak yanıt vermedi. Kaydın saklanıyor; tekrar deneyebilirsin.'
      "
    />
    <UButton
      size="xl"
      block
      class="bg-brand-gradient"
      icon="i-lucide-rotate-cw"
      :disabled="!ready"
      @click="start"
    >
      Tekrar dene
    </UButton>
  </template>

  <section
    v-else-if="transcript"
    class="space-y-2 rounded-xl bg-white p-4 ring-1 ring-navy-100"
    aria-labelledby="transcript-title"
  >
    <h3 id="transcript-title" class="font-semibold text-navy-900">
      Transkript
      <span v-if="transcript.duration_sec" class="text-sm font-normal text-slate-500">
        · {{ formatDuration(transcript.duration_sec) }}
      </span>
    </h3>
    <p class="text-sm whitespace-pre-wrap break-words text-slate-700">{{ transcript.text }}</p>
  </section>

  <div
    v-else
    class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-10 text-center ring-1 ring-navy-100"
  >
    <UIcon name="i-lucide-file-audio" class="size-8 text-navy-500" aria-hidden="true" />
    <p class="font-semibold text-navy-900">Kayıt henüz yazıya dökülmedi</p>
    <UButton size="lg" class="bg-brand-gradient" :disabled="!ready" @click="start">
      Yazıya dök
    </UButton>
  </div>
</template>
