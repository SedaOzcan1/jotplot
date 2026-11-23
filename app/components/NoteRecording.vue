<script setup lang="ts">
import type { NoteTranscript } from '~/composables/useNoteResult'

/**
 * The recording of an audio note with its transcript (T2.5, US-2.2). The player is there from the
 * moment the file is saved; the transcript appears once it is ready, one paragraph per speaker
 * turn. A turn's time jumps the player to that moment, and the turn being played is marked.
 */
const props = defineProps<{
  storagePath: string
  transcript: NoteTranscript | null
  /** Open the transcript at first, for example while there are no tasks to review yet. */
  transcriptOpen?: boolean
}>()

const { getRecordingUrl } = useNoteResult()

const player = ref<HTMLAudioElement | null>(null)
const url = ref<string | null>(null)
const playerError = ref(false)
/** The link expires after an hour; a playback error asks for a new one once. */
let refreshedUrl = false

async function loadUrl() {
  try {
    url.value = await getRecordingUrl(props.storagePath)
    playerError.value = false
  } catch {
    playerError.value = true
  }
}
onMounted(loadUrl)

async function onPlayerError() {
  if (refreshedUrl) {
    playerError.value = true
    return
  }
  refreshedUrl = true
  await loadUrl()
}

const turns = computed(() => speakerTurns(parseSegments(props.transcript?.segments)))
const showSpeakers = computed(() => hasSeveralSpeakers(turns.value))

const currentTime = ref(0)
const playing = ref(false)
const activeIndex = computed(() =>
  playing.value || currentTime.value > 0 ? activeTurnIndex(turns.value, currentTime.value) : -1,
)

function playFrom(seconds: number) {
  const audio = player.value
  if (!audio) return
  audio.currentTime = seconds
  void audio.play().catch(() => {
    // The browser can refuse to start playback; the position is still set.
  })
}
</script>

<template>
  <section class="space-y-3" aria-label="Kayıt">
    <div class="rounded-xl bg-white p-3 ring-1 ring-navy-100">
      <p v-if="playerError" role="alert" class="text-sm text-red-700">
        Kayıt şu an oynatılamıyor. Sayfayı yenileyip tekrar dene.
      </p>
      <audio
        v-else
        ref="player"
        :src="url ?? undefined"
        controls
        preload="metadata"
        class="w-full"
        aria-label="Kaydı dinle"
        @error="onPlayerError"
        @timeupdate="currentTime = player?.currentTime ?? 0"
        @play="playing = true"
        @pause="playing = false"
      />
    </div>

    <details
      v-if="transcript"
      :open="transcriptOpen"
      class="rounded-xl bg-white ring-1 ring-navy-100"
    >
      <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-navy-900">
        Transkript
        <span v-if="transcript.duration_sec" class="font-normal text-slate-500">
          · {{ formatDuration(transcript.duration_sec) }}
        </span>
      </summary>

      <ol v-if="turns.length" class="space-y-3 px-4 pb-4" aria-label="Transkript">
        <li
          v-for="(turn, index) in turns"
          :key="`${turn.start}-${index}`"
          class="-mx-2 rounded-lg px-2 py-1 transition-colors"
          :class="index === activeIndex ? 'bg-teal-50' : ''"
          :aria-current="index === activeIndex ? 'true' : undefined"
        >
          <div class="flex items-baseline gap-2 text-xs">
            <button
              type="button"
              class="font-mono font-semibold text-navy-600 tabular-nums hover:underline focus-visible:underline focus-visible:outline-none"
              :aria-label="`${formatDuration(turn.start)} anından dinle`"
              @click="playFrom(turn.start)"
            >
              {{ formatDuration(turn.start) }}
            </button>
            <span v-if="showSpeakers && speakerLabel(turn.speaker)" class="text-slate-500">
              {{ speakerLabel(turn.speaker) }}
            </span>
          </div>
          <p class="mt-0.5 text-sm break-words text-slate-700">{{ turn.text }}</p>
        </li>
      </ol>
      <p v-else class="px-4 pb-4 text-sm whitespace-pre-wrap break-words text-slate-700">
        {{ transcript.text }}
      </p>
    </details>
  </section>
</template>
