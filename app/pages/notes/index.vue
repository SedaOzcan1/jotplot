<script setup lang="ts">
import type { NoteListItem, NoteType } from '~/utils/notes'

definePageMeta({ title: 'Notlar' })
useSeoMeta({ title: 'Notlar' })

const route = useRoute()
const router = useRouter()
const { listNotes } = useNotes()
const { mode } = useAppMode()

// Filters live in the URL, so they survive going to a note and back.
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const type = computed(() => parseNoteType(route.query.type))
const hasFilters = computed(() => query.value.trim() !== '' || type.value !== null)

function setFilters(next: { q?: string; type?: NoteType | null }) {
  const q = next.q ?? query.value
  const t = next.type === undefined ? type.value : next.type
  void router.replace({ query: { ...(q.trim() ? { q } : {}), ...(t ? { type: t } : {}) } })
}

// The search box updates the URL shortly after the user stops typing.
const searchText = ref(query.value)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchText, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => setFilters({ q: value }), 300)
})
watch(query, (value) => {
  if (value !== searchText.value) searchText.value = value
})
onBeforeUnmount(() => clearTimeout(searchTimer))

function clearFilters() {
  clearTimeout(searchTimer)
  searchText.value = ''
  void router.replace({ query: {} })
}

// Notes are personal; they are loaded in the browser only and never rendered on the server.
const filters = computed(() => ({ query: query.value, type: type.value, mode: mode.value }))
const {
  data: firstPage,
  status,
  error,
  refresh,
} = useAsyncData('notes', () => listNotes(filters.value), { server: false, watch: [filters] })

/** Pages loaded with "Daha fazla göster" after the first one. */
const morePages = ref<NoteListItem[]>([])
const loadingMore = ref(false)
const loadMoreError = ref(false)
/** A full page means there may be more notes to load. */
const hasMore = ref(false)
watch(
  firstPage,
  (page) => {
    morePages.value = []
    loadMoreError.value = false
    hasMore.value = (page?.length ?? 0) === NOTE_LIST_LIMIT
  },
  { immediate: true },
)

const notes = computed(() => [...(firstPage.value ?? []), ...morePages.value])

async function loadMore() {
  loadingMore.value = true
  loadMoreError.value = false
  try {
    const page = await listNotes(filters.value, notes.value.length)
    morePages.value = [...morePages.value, ...page]
    hasMore.value = page.length === NOTE_LIST_LIMIT
  } catch {
    loadMoreError.value = true
  } finally {
    loadingMore.value = false
  }
}

const typeOptions: { value: NoteType | null; label: string }[] = [
  { value: null, label: 'Tümü' },
  ...NOTE_TYPES.map((value) => ({ value, label: NOTE_TYPE_LABELS[value] })),
]

const loading = computed(
  () => !firstPage.value && (status.value === 'pending' || status.value === 'idle'),
)
const noNotesYet = computed(
  () => !hasFilters.value && !loading.value && !error.value && !notes.value.length,
)
</script>

<template>
  <div>
    <EmptyState
      v-if="noNotesYet"
      icon="i-lucide-notebook-text"
      title="Henüz notun yok"
      description="İlk toplantı notunu yapıştır, görevleri senin için çıkaralım."
      action-label="İlk notunu oluştur"
      action-to="/notes/new"
    />

    <template v-else>
      <div role="search" class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <UFormField label="Ara" class="w-full lg:max-w-md">
          <UInput
            v-model="searchText"
            type="search"
            placeholder="Not başlığı veya içeriği…"
            icon="i-lucide-search"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <div role="group" aria-label="Not türü" class="flex flex-wrap gap-2 lg:pb-1">
          <button
            v-for="option in typeOptions"
            :key="option.label"
            type="button"
            :aria-pressed="type === option.value"
            class="rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition"
            :class="
              type === option.value
                ? 'bg-brand-gradient text-white shadow-sm'
                : 'bg-navy-100 text-navy-900 hover:bg-navy-200'
            "
            @click="setFilters({ type: option.value })"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        <span class="sr-only">Notlar yükleniyor</span>
        <USkeleton v-for="n in 3" :key="n" class="h-20 w-full rounded-xl" />
      </div>

      <div v-else-if="error && !firstPage" class="max-w-3xl space-y-3">
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

      <div
        v-else-if="!notes.length"
        role="status"
        class="flex flex-col items-center gap-2 rounded-xl bg-white px-4 py-10 text-center ring-1 ring-navy-100"
      >
        <UIcon name="i-lucide-search-x" class="size-8 text-navy-500" aria-hidden="true" />
        <p class="font-semibold text-navy-900">Aramana uygun not bulunamadı</p>
        <p class="text-sm text-slate-500">Başka bir kelime dene ya da filtreleri temizle.</p>
        <UButton color="neutral" variant="outline" class="mt-2" @click="clearFilters">
          Filtreleri temizle
        </UButton>
      </div>

      <template v-else>
        <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Notlar">
          <li v-for="note in notes" :key="note.id" class="min-w-0">
            <NuxtLink
              :to="`/notes/${note.id}`"
              class="block h-full rounded-xl bg-white p-4 shadow-sm ring-1 ring-navy-100 transition hover:ring-navy-300 focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:outline-none"
            >
              <h2 class="font-semibold break-words text-navy-900">{{ noteDisplayTitle(note) }}</h2>
              <p class="mt-1 text-xs text-slate-500">
                <time :datetime="note.created_at">{{ formatNoteDate(note.created_at) }}</time>
                · {{ NOTE_TYPE_LABELS[parseNoteType(note.type) ?? 'text'] }}
              </p>
              <p class="mt-2 text-sm font-medium text-navy-900">{{ noteStatusLine(note) }}</p>
            </NuxtLink>
          </li>
        </ul>

        <div v-if="hasMore" class="mt-4 flex flex-col items-center gap-2">
          <p v-if="loadMoreError" role="alert" class="text-sm text-red-700">
            Diğer notlar yüklenemedi. Tekrar dene.
          </p>
          <UButton color="neutral" variant="outline" :loading="loadingMore" @click="loadMore">
            Daha fazla göster
          </UButton>
        </div>
      </template>
    </template>
  </div>
</template>
