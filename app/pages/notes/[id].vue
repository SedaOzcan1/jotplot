<script setup lang="ts">
import { ProcessNoteError } from '~/composables/useNoteResult'

definePageMeta({ title: 'Sonuç' })
useSeoMeta({ title: 'Sonuç' })

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const { getNote, getSummary, listNoteTasks, getTranscript, processNote } = useNoteResult()
const ready = useIsMounted()

// Personal data: loaded in the browser only.
const { data, status, error, refresh } = useAsyncData(
  () => `note-${id.value}`,
  async () => {
    const note = await getNote(id.value)
    if (!note) return { note: null, summary: null, boardTasks: [], transcript: null }
    const [summary, boardTasks, transcript] = await Promise.all([
      getSummary(note.id),
      listNoteTasks(note.id),
      note.type === 'audio' ? getTranscript(note.id) : null,
    ])
    return { note, summary, boardTasks, transcript }
  },
  { server: false },
)

const processing = ref(false)
const processError = ref<string | null>(null)
/** The monthly AI limit is reached: retrying would fail again until next month. */
const limitReached = ref(false)

async function runProcessing() {
  if (processing.value) return
  processing.value = true
  processError.value = null
  limitReached.value = false
  try {
    await processNote(id.value)
  } catch (err) {
    limitReached.value = err instanceof ProcessNoteError && err.code === 'limit_reached'
    processError.value =
      err instanceof ProcessNoteError
        ? err.message
        : 'Not işlenemedi. Bağlantını kontrol edip tekrar dene; notun kaydedildi.'
  } finally {
    await refresh()
    processing.value = false
  }
}

// "Görevleri çıkar" on the new note screen opens this page with ?process=1.
watch(
  () => data.value?.note,
  (note) => {
    if (!note || route.query.process !== '1') return
    void router.replace({ query: {} })
    if (note.status === 'pending' && !data.value?.summary) void runProcessing()
  },
  { immediate: true },
)

const note = computed(() => data.value?.note ?? null)
const summary = computed(() => data.value?.summary ?? null)
const noteTitle = computed(() => (note.value ? noteDisplayTitle(note.value) : ''))
const transcript = computed(() => data.value?.transcript ?? null)
/**
 * A recording without a transcript or a PDF without its text: how far that has got is shown
 * instead of the result.
 */
const awaitingSource = computed(
  () =>
    (note.value?.type === 'audio' && !transcript.value) ||
    (note.value?.type === 'pdf' && !note.value.raw_text),
)
/** After transcription the server extracts the tasks on its own (T2.4). */
const analyzingInBackground = computed(
  () => note.value?.type === 'audio' && !!transcript.value && note.value.status === 'processing',
)

// While a recording is transcribed or its tasks are extracted on the server, or another tab reads
// a PDF, check every few seconds; the result appears without reloading.
const POLL_MS = 3000
let pollTimer: ReturnType<typeof setInterval> | undefined
watch(
  () =>
    note.value?.status === 'processing' &&
    (note.value.type === 'audio' || (note.value.type === 'pdf' && !note.value.raw_text)),
  (busy) => {
    clearInterval(pollTimer)
    if (busy) pollTimer = setInterval(() => void refresh(), POLL_MS)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearInterval(pollTimer))

const showFailure = computed(
  () =>
    !processing.value &&
    !summary.value &&
    (processError.value !== null || note.value?.status === 'failed'),
)
</script>

<template>
  <div>
    <div
      v-if="!data && (status === 'pending' || status === 'idle')"
      class="max-w-3xl space-y-3"
      aria-busy="true"
    >
      <span class="sr-only">Not yükleniyor</span>
      <USkeleton class="h-8 w-2/3 rounded-lg" />
      <USkeleton class="h-32 w-full rounded-xl" />
    </div>

    <div v-else-if="error && !data" class="max-w-3xl space-y-3">
      <UAlert
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="noteErrorMessage(error, 'load')"
      />
      <UButton color="neutral" variant="outline" icon="i-lucide-rotate-cw" @click="refresh()">
        Tekrar dene
      </UButton>
    </div>

    <EmptyState
      v-else-if="!note"
      icon="i-lucide-file-question"
      title="Not bulunamadı"
      description="Bu not silinmiş ya da sana ait değil."
      action-label="Notlara dön"
      action-to="/notes"
    />

    <div v-else class="max-w-3xl space-y-4">
      <header class="space-y-1">
        <h2 class="text-xl font-bold break-words text-navy-900">{{ noteTitle }}</h2>
        <p class="text-xs text-slate-500">
          <time :datetime="note.created_at">{{ formatNoteDate(note.created_at) }}</time>
        </p>
      </header>

      <NoteRecording
        v-if="note.type === 'audio' && note.storage_path"
        :storage-path="note.storage_path"
        :transcript="transcript"
        :transcript-open="!summary"
      />

      <AudioNoteStatus
        v-if="note.type === 'audio' && awaitingSource"
        :note="note"
        @refresh="refresh()"
      />

      <PdfNoteText
        v-else-if="note.type === 'pdf' && note.storage_path"
        :note="{ ...note, storage_path: note.storage_path }"
        :text-open="!summary"
        @refresh="refresh()"
      />

      <details v-else-if="note.raw_text" class="rounded-xl bg-white ring-1 ring-navy-100">
        <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-navy-900">
          Notun metni
        </summary>
        <p class="px-4 pb-4 text-sm whitespace-pre-wrap break-words text-slate-700">
          {{ note.raw_text }}
        </p>
      </details>

      <template v-if="awaitingSource" />

      <div
        v-else-if="(processing || analyzingInBackground) && !summary"
        role="status"
        class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-10 text-center ring-1 ring-navy-100"
      >
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-navy-500" />
        <p class="font-semibold text-navy-900">
          {{ note.type === 'audio' ? 'Görevler çıkarılıyor…' : 'Notun işleniyor…' }}
        </p>
        <p class="text-sm text-slate-500">
          Özet, kararlar ve görevler çıkarılıyor. Bu genelde birkaç saniye sürer.
        </p>
      </div>

      <template v-else-if="showFailure && limitReached">
        <UAlert
          role="alert"
          color="warning"
          variant="subtle"
          icon="i-lucide-gauge"
          title="Bu ayki AI hakkın doldu"
          :description="processError ?? undefined"
        />
        <UButton to="/settings" size="xl" block color="neutral" variant="outline">
          Kullanımı gör
        </UButton>
      </template>

      <template v-else-if="showFailure">
        <UAlert
          role="alert"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="Not işlenemedi"
          :description="
            processError ?? 'Son deneme başarısız oldu. Notun kaydedildi; tekrar deneyebilirsin.'
          "
        />
        <UButton
          size="xl"
          block
          class="bg-brand-gradient"
          icon="i-lucide-rotate-cw"
          :disabled="!ready"
          @click="runProcessing"
        >
          Tekrar dene
        </UButton>
      </template>

      <NoteResultEditor
        v-else-if="summary"
        :summary="summary"
        :mode="note.mode"
        :board-tasks="data?.boardTasks ?? []"
        :reprocessing="processing"
        @retry="runProcessing"
        @approved="refresh()"
      />

      <div
        v-else
        class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-10 text-center ring-1 ring-navy-100"
      >
        <UIcon name="i-lucide-sparkles" class="size-8 text-navy-500" aria-hidden="true" />
        <p class="font-semibold text-navy-900">
          {{ note.status === 'processing' ? 'Not işleniyor görünüyor' : 'Bu not henüz işlenmedi' }}
        </p>
        <p class="text-sm text-slate-500">Özet, kararlar ve görevleri çıkarmak için notu işle.</p>
        <UButton
          size="lg"
          class="bg-brand-gradient"
          icon="i-lucide-sparkles"
          :disabled="!ready"
          @click="runProcessing"
        >
          Görevleri çıkar
        </UButton>
      </div>

      <UAlert
        v-if="processError && summary"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="processError"
      />
    </div>
  </div>
</template>
