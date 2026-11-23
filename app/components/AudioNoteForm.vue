<script setup lang="ts">
import type { AudioNoteDraft } from '~/composables/useAudioNotes'

/** Records in the browser or uploads a file, then saves it as an audio note (T2.2, US-2.1). */
const props = defineProps<{ source: 'record' | 'upload' }>()

const { createAudioNote } = useAudioNotes()
const { getAiUsage } = useAiUsage()
// Shown before recording; the server still enforces the limit.
const { data: usage } = useAsyncData('ai-usage', () => getAiUsage(), { server: false })
const minutesMessage = computed(() => (usage.value ? sttUsageMessage(usage.value) : null))
const minutesUsedUp = computed(() => !!usage.value && sttUsageLevel(usage.value) === 'reached')
const recorder = useAudioRecorder()
const { mode } = useAppMode()
const toast = useToast()
const ready = useIsMounted()

const title = ref('')
const consent = ref(false)
/** When the user ticked the consent box; saved with the note. */
const consentAt = ref<string | null>(null)
watch(consent, (value) => {
  consentAt.value = value ? new Date().toISOString() : null
})

const picked = shallowRef<File | null>(null)
const fileError = ref<string | null>(null)

/** The audio that will be saved: the finished recording or the picked file. */
const audio = computed<Blob | null>(() =>
  props.source === 'record' ? (recorder.recording.value as Blob | null) : picked.value,
)
const uploading = ref(false)
const progress = ref(0)
const uploadError = ref<string | null>(null)
let draft: AudioNoteDraft | null = null
let abort: AbortController | null = null
/** True once the note is saved, so leaving the page no longer warns. */
let saved = false

const previewUrl = ref<string | null>(null)
watch(audio, (blob) => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = blob ? URL.createObjectURL(blob) : null
  draft = null
})

const recording = computed(
  () => recorder.state.value === 'recording' || recorder.state.value === 'paused',
)
/** Unsaved audio that would be lost by leaving the page. */
const hasUnsaved = computed(() => recording.value || (!!audio.value && !uploading.value))

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  fileError.value = audioFileError(file)
  picked.value = fileError.value ? null : file
  uploadError.value = null
}

function discard() {
  if (props.source === 'record') recorder.discard()
  else picked.value = null
  uploadError.value = null
}

async function save() {
  const blob = audio.value
  if (!blob || uploading.value || !consentAt.value) return
  const extension = audioExtension({ type: blob.type, name: picked.value?.name })
  if (!extension) {
    uploadError.value = 'Bu kayıt türü desteklenmiyor.'
    return
  }
  // A retry reuses the draft, so a file that already reached Storage is not sent again.
  draft ??= createAudioNoteDraft(blob, {
    extension,
    title: title.value,
    mode: mode.value,
    consentConfirmedAt: consentAt.value,
  })
  draft.title = title.value
  uploading.value = true
  uploadError.value = null
  progress.value = 0
  abort = new AbortController()
  try {
    const id = await createAudioNote(draft, (value) => (progress.value = value), abort.signal)
    saved = true
    toast.add({ title: 'Kayıt yüklendi', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/notes/${id}`)
  } catch (error) {
    uploadError.value = audioUploadErrorMessage(error)
  } finally {
    uploading.value = false
    abort = null
  }
}

const LEAVE_WARNING = 'Kaydın henüz kaydedilmedi. Sayfadan çıkarsan kayıt silinecek.'

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsaved.value || saved) return
  event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  abort?.abort()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
onBeforeRouteLeave(() => {
  if (saved || (!hasUnsaved.value && !uploading.value)) return true
  return window.confirm(LEAVE_WARNING)
})

const sizeLabel = computed(() => (audio.value ? formatFileSize(audio.value.size) : ''))
const consentLabel =
  props.source === 'record'
    ? 'Kayıttaki herkese kayıt aldığımı söyledim ve onaylarını aldım.'
    : 'Bu kayıttaki herkesin kaydedilmeye onay verdiğini doğrularım.'
</script>

<template>
  <div class="max-w-3xl space-y-4">
    <UAlert
      v-if="minutesMessage"
      :color="minutesUsedUp ? 'warning' : 'info'"
      variant="subtle"
      icon="i-lucide-gauge"
      :description="minutesMessage"
    />

    <ModeSwitch label="Notun modu" />

    <UFormField label="Kaydın başlığı (isteğe bağlı)">
      <UInput
        v-model="title"
        placeholder="Örn. Ürün ekibi haftalık toplantısı"
        :maxlength="NOTE_TITLE_MAX_LENGTH"
        size="lg"
        class="w-full"
      />
    </UFormField>

    <section
      class="space-y-3 rounded-xl bg-white p-4 ring-1 ring-navy-100"
      aria-labelledby="consent-title"
    >
      <div class="flex items-start gap-2">
        <UIcon
          name="i-lucide-shield-check"
          class="mt-0.5 size-5 shrink-0 text-teal-600"
          aria-hidden="true"
        />
        <div class="space-y-1 text-sm">
          <h2 id="consent-title" class="font-semibold text-navy-900">Kayıt için onay</h2>
          <p class="text-slate-600">
            Bir toplantıyı ya da dersi kaydetmeden önce kayıttaki herkese haber vermen ve onaylarını
            alman gerekir (KVKK). Kayıt yalnızca senin hesabında saklanır ve notunu çıkarmak için
            yazıya dökülür.
          </p>
        </div>
      </div>
      <UCheckbox
        v-model="consent"
        :label="consentLabel"
        :disabled="!ready || recording || uploading"
      />
    </section>

    <!-- Recording ---------------------------------------------------------------------------- -->
    <section v-if="source === 'record' && !audio" class="space-y-3" aria-label="Ses kaydı">
      <UAlert
        v-if="recorder.error.value"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-mic-off"
        :description="recorder.error.value"
      />

      <div
        v-if="recording"
        class="flex flex-col items-center gap-4 rounded-xl bg-white px-4 py-8 text-center ring-1 ring-navy-100"
      >
        <p class="flex items-center gap-2 text-sm font-medium text-navy-900">
          <span
            class="size-2.5 rounded-full"
            :class="
              recorder.state.value === 'recording' ? 'animate-pulse bg-red-600' : 'bg-slate-400'
            "
            aria-hidden="true"
          />
          {{ recorder.state.value === 'recording' ? 'Kaydediliyor' : 'Duraklatıldı' }}
        </p>
        <p
          role="timer"
          aria-label="Kayıt süresi"
          class="font-mono text-4xl font-semibold text-navy-900 tabular-nums"
        >
          {{ formatDuration(recorder.elapsedSeconds.value) }}
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <UButton
            v-if="recorder.state.value === 'recording'"
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-lucide-pause"
            @click="recorder.pause()"
          >
            Duraklat
          </UButton>
          <UButton
            v-else
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-lucide-play"
            @click="recorder.resume()"
          >
            Devam et
          </UButton>
          <UButton
            size="lg"
            class="bg-brand-gradient"
            icon="i-lucide-square"
            @click="recorder.stop()"
          >
            Kaydı bitir
          </UButton>
        </div>
        <p class="max-w-md text-xs text-slate-500">
          <template v-if="recorder.wakeLockActive.value">
            Ekran kayıt bitene kadar açık kalacak. Kayıt sürerken bu sekmeden ayrılma.
          </template>
          <template v-else>
            Telefonunun ekranı kapanırsa ya da sekmeden ayrılırsan kayıt durabilir; ekranı açık tut.
            Uzun kayıtlar için telefonunun ses kaydedicisini kullanıp dosya yükleyebilirsin.
          </template>
        </p>
      </div>

      <div
        v-else
        class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-8 text-center ring-1 ring-navy-100"
      >
        <UIcon name="i-lucide-mic" class="size-8 text-navy-500" aria-hidden="true" />
        <p class="text-sm text-slate-600">
          Kayıt tarayıcında yapılır; en fazla {{ formatFileSize(AUDIO_MAX_BYTES) }}, yaklaşık 1,5
          saat.
        </p>
        <UButton
          size="xl"
          class="bg-brand-gradient"
          icon="i-lucide-mic"
          :loading="recorder.state.value === 'starting'"
          :disabled="!ready || !consent"
          @click="recorder.start()"
        >
          Kaydı başlat
        </UButton>
        <p v-if="!consent" class="text-xs text-slate-500">
          Başlamak için önce onay kutusunu işaretle.
        </p>
      </div>
    </section>

    <!-- File upload ---------------------------------------------------------------------------- -->
    <section v-if="source === 'upload' && !audio" class="space-y-3" aria-label="Dosya yükleme">
      <UAlert
        v-if="fileError"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-file-x"
        :description="fileError"
      />
      <div
        class="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-8 text-center ring-1 ring-navy-100"
      >
        <UIcon name="i-lucide-file-audio" class="size-8 text-navy-500" aria-hidden="true" />
        <p class="text-sm text-slate-600">
          MP3, M4A, WAV, WEBM, OGG, AAC veya FLAC; en fazla {{ formatFileSize(AUDIO_MAX_BYTES) }}.
        </p>
        <label
          class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand-gradient px-4 py-2.5 text-base font-medium text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-75 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy-500"
        >
          <UIcon name="i-lucide-upload" class="size-5" aria-hidden="true" />
          Ses dosyası seç
          <input
            type="file"
            class="sr-only"
            :accept="AUDIO_ACCEPT"
            :disabled="!ready || !consent"
            @change="onFileChange"
          />
        </label>
        <p v-if="!consent" class="text-xs text-slate-500">
          Dosya seçmek için önce onay kutusunu işaretle.
        </p>
      </div>
    </section>

    <!-- Ready to save ---------------------------------------------------------------------------- -->
    <section v-if="audio" class="space-y-3" aria-label="Kaydedilecek ses">
      <UAlert
        v-if="recorder.notice.value && source === 'record'"
        color="warning"
        variant="subtle"
        icon="i-lucide-info"
        :description="recorder.notice.value"
      />
      <div class="space-y-3 rounded-xl bg-white p-4 ring-1 ring-navy-100">
        <p class="text-sm font-medium text-navy-900">
          <template v-if="source === 'record'">
            Kayıt · {{ formatDuration(recorder.elapsedSeconds.value) }} · {{ sizeLabel }}
          </template>
          <template v-else>{{ picked?.name }} · {{ sizeLabel }}</template>
        </p>
        <audio v-if="previewUrl" :src="previewUrl" controls class="w-full" aria-label="Önizleme" />
      </div>

      <div v-if="uploading" class="space-y-2" role="status">
        <UProgress :model-value="Math.round(progress * 100)" aria-label="Yükleme ilerlemesi" />
        <div class="flex items-center justify-between text-sm text-slate-600">
          <span>Yükleniyor… %{{ Math.round(progress * 100) }}</span>
          <UButton color="neutral" variant="link" size="sm" @click="abort?.abort()">Durdur</UButton>
        </div>
      </div>

      <UAlert
        v-if="uploadError"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="uploadError"
      />

      <div class="grid gap-3 sm:grid-cols-2">
        <UButton
          size="xl"
          block
          color="neutral"
          variant="outline"
          :icon="source === 'record' ? 'i-lucide-rotate-ccw' : 'i-lucide-replace'"
          :disabled="uploading"
          @click="discard"
        >
          {{ source === 'record' ? 'Sil ve yeniden kaydet' : 'Başka dosya seç' }}
        </UButton>
        <UButton
          size="xl"
          block
          class="bg-brand-gradient"
          :icon="uploadError ? 'i-lucide-rotate-cw' : 'i-lucide-cloud-upload'"
          :loading="uploading"
          :disabled="!ready || uploading || !consent"
          @click="save"
        >
          {{ uploadError ? 'Tekrar dene' : 'Kaydı yükle' }}
        </UButton>
      </div>
      <a
        v-if="uploadError && previewUrl && source === 'record'"
        :href="previewUrl"
        :download="`jotplot-kayit.${audioExtension({ type: audio.type }) ?? 'webm'}`"
        class="block text-center text-sm font-semibold text-navy-600 underline"
      >
        Kaydı cihazıma indir
      </a>
    </section>
  </div>
</template>
