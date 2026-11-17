<script setup lang="ts">
import type { BoardTask } from '~/utils/board'

const props = defineProps<{ task: BoardTask; dragging?: boolean }>()
const emit = defineEmits<{ open: [] }>()

const dateLabel = computed(() => (props.task.due_date ? formatTaskDate(props.task.due_date) : null))
</script>

<template>
  <!-- The whole card is a button: a tap opens the move and edit dialog, which also works with a
       keyboard. On desktop the card can be dragged to another column as well. -->
  <button
    type="button"
    class="block w-full rounded-xl border-l-4 border-teal-500 bg-white p-3 text-left shadow-sm ring-1 ring-navy-100 transition hover:ring-navy-300 focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:outline-none"
    :class="{ 'opacity-50': dragging }"
    @click="emit('open')"
  >
    <span class="block font-semibold break-words text-navy-900">{{ task.title }}</span>
    <span class="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
      <span class="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5">
        <UIcon name="i-lucide-user" class="size-3" aria-hidden="true" />
        <span class="sr-only">Sorumlu:</span>
        {{ task.assignee ?? '—' }}
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5">
        <UIcon name="i-lucide-calendar" class="size-3" aria-hidden="true" />
        <span class="sr-only">Tarih:</span>
        {{ dateLabel ?? '—' }}
      </span>
    </span>
  </button>
</template>
