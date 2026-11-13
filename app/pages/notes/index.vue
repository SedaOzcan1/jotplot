<script setup lang="ts">
definePageMeta({ title: 'Notlar' })
useSeoMeta({ title: 'Notlar' })

const { listNotes } = useNotes()
// Notes are personal; they are loaded in the browser only and never rendered on the server.
const {
  data: notes,
  status,
  error,
  refresh,
} = useAsyncData('notes', () => listNotes(), {
  server: false,
})

const typeLabels: Record<string, string> = { text: 'Metin', audio: 'Ses', pdf: 'PDF' }
</script>

<template>
  <div>
    <div
      v-if="status === 'pending' || status === 'idle'"
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
    >
      <span class="sr-only">Notlar yükleniyor</span>
      <USkeleton v-for="n in 3" :key="n" class="h-20 w-full rounded-xl" />
    </div>

    <div v-else-if="error" class="max-w-3xl space-y-3">
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
      v-else-if="!notes?.length"
      icon="i-lucide-notebook-text"
      title="Henüz notun yok"
      description="İlk toplantı notunu yapıştır, görevleri senin için çıkaralım."
      action-label="İlk notunu oluştur"
      action-to="/notes/new"
    />

    <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Notlar">
      <li
        v-for="note in notes"
        :key="note.id"
        class="min-w-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-navy-100"
      >
        <h2 class="font-semibold break-words text-navy-900">{{ noteDisplayTitle(note) }}</h2>
        <p class="mt-1 text-xs text-slate-500">
          <time :datetime="note.created_at">{{ formatNoteDate(note.created_at) }}</time>
          · {{ typeLabels[note.type] ?? 'Not' }}
        </p>
      </li>
    </ul>
  </div>
</template>
