<script setup lang="ts">
import { ProcessNoteError } from '~/composables/useNoteResult'

/**
 * The PDF of a PDF note (T3.1): a link to open the file and, once it is read, its text. A PDF
 * whose text was never read is read on its own when the page opens; if it cannot be read, the
 * reason is shown (scanned, too long, or damaged).
 */
const props = defineProps<{
  note: { id: string; status: string; storage_path: string; raw_text: string | null }
  /** Open the text at first, for example while there are no tasks to review yet. */
  textOpen?: boolean
}>()
const emit = defineEmits<{ refresh: [] }>()

const { extractPdf, getDocumentUrl } = useNoteResult()
const ready = useIsMounted()

const extracting = ref(false)
const extractError = ref<string | null>(null)

async function extract() {
  if (extracting.value) return
  extracting.value = true
  extractError.value = null
  try {
    await extractPdf(props.note.id)
  } catch (error) {
    extractError.value =
      error instanceof ProcessNoteError
        ? error.message
        : 'PDF okunamadı. Bağlantını kontrol edip tekrar dene; dosyan saklanıyor.'
  } finally {
    extracting.value = false
    emit('refresh')
  }
}

onMounted(() => {
  if (props.note.status === 'pending' && !props.note.raw_text) void extract()
})

const opening = ref(false)
const openError = ref(false)
/** Opens the file in a new tab with a short-lived link. */
async function openPdf() {
  opening.value = true
  openError.value = false
  // The tab is opened right away so the browser does not block it as a pop-up.
  const tab = window.open('', '_blank')
  try {
    const url = await getDocumentUrl(props.note.storage_path)
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch {
    tab?.close()
    openError.value = true
  } finally {
    opening.value = false
  }
}

const reading = computed(
  () => extracting.value || (props.note.status === 'processing' && !props.note.raw_text),
)
</script>

<template>
  <section class="space-y-3" aria-label="PDF">
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-external-link"
        :loading="opening"
        :disabled="!ready"
        @click="openPdf"
      >
        PDF’i aç
      </UButton>
      <p v-if="openError" role="alert" class="text-sm text-red-700">
        PDF şu an açılamıyor. Biraz sonra tekrar dene.
      </p>
    </div>

    <div
      v-if="reading"
      role="status"
      class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-10 text-center ring-1 ring-navy-100"
    >
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-navy-500" />
      <p class="font-semibold text-navy-900">PDF okunuyor…</p>
      <p class="text-sm text-slate-500">Metni çıkarılıyor; bu genelde birkaç saniye sürer.</p>
    </div>

    <template v-else-if="!note.raw_text && (extractError || note.status === 'failed')">
      <UAlert
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-file-x"
        title="PDF okunamadı"
        :description="
          extractError ??
          'Taranmış ya da fotoğraftan oluşan, 100 sayfadan uzun veya bozuk bir PDF olabilir. Dosyan saklanıyor.'
        "
      />
      <UButton
        size="xl"
        block
        color="neutral"
        variant="outline"
        icon="i-lucide-rotate-cw"
        :disabled="!ready"
        @click="extract"
      >
        Tekrar dene
      </UButton>
    </template>

    <details
      v-else-if="note.raw_text"
      :open="textOpen"
      class="rounded-xl bg-white ring-1 ring-navy-100"
    >
      <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-navy-900">
        PDF’in metni
      </summary>
      <p
        class="max-h-[60vh] overflow-y-auto px-4 pb-4 text-sm whitespace-pre-wrap break-words text-slate-700"
      >
        {{ note.raw_text }}
      </p>
    </details>

    <div
      v-else
      class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-10 text-center ring-1 ring-navy-100"
    >
      <UIcon name="i-lucide-file-text" class="size-8 text-navy-500" aria-hidden="true" />
      <p class="font-semibold text-navy-900">PDF’in metni henüz çıkarılmadı</p>
      <UButton size="lg" class="bg-brand-gradient" :disabled="!ready" @click="extract">
        Metni çıkar
      </UButton>
    </div>
  </section>
</template>
