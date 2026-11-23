<script setup lang="ts">
import type { BoardTask, DueState } from '~/utils/board'

const props = defineProps<{ task: BoardTask; dragging?: boolean }>()
const emit = defineEmits<{ open: [] }>()

const dateLabel = computed(() => (props.task.due_date ? formatTaskDate(props.task.due_date) : null))
const due = computed(() => dueState(props.task, todayInTurkey()))
const dueWord = computed(() => DUE_STATE_LABELS[due.value] ?? null)

/** The left stripe shows how close the due date is; the date badge says it in words too. */
const STRIPE: Record<DueState, string> = {
  overdue: 'border-red-500',
  today: 'border-amber-500',
  tomorrow: 'border-amber-500',
  upcoming: 'border-teal-500',
  none: 'border-teal-500',
  done: 'border-slate-300',
}
const DATE_BADGE: Record<DueState, string> = {
  overdue: 'bg-red-100 text-red-800',
  today: 'bg-amber-100 text-amber-900',
  tomorrow: 'bg-amber-100 text-amber-900',
  upcoming: 'bg-navy-100',
  none: 'bg-navy-100',
  done: 'bg-navy-100',
}

const source = computed(() =>
  props.task.sources && props.task.source_id
    ? {
        to: `/notes/${props.task.source_id}`,
        title: noteDisplayTitle(props.task.sources, 60),
        icon: sourceIcon(props.task.sources.type),
      }
    : null,
)
</script>

<template>
  <!-- The button opens the move and edit dialog, which also works with a keyboard. The note badge
       is a separate link below it, because a link cannot sit inside a button. On desktop the card
       can be dragged to another column as well. -->
  <div
    class="rounded-xl border-l-4 bg-white shadow-sm ring-1 ring-navy-100 transition hover:ring-navy-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy-500"
    :class="[STRIPE[due], { 'opacity-50': dragging }]"
  >
    <button
      type="button"
      class="block w-full p-3 text-left focus-visible:outline-none"
      :class="{ 'pb-2': source }"
      @click="emit('open')"
    >
      <span class="block font-semibold break-words text-navy-900">{{ task.title }}</span>
      <span class="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
        <span class="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5">
          <UIcon name="i-lucide-user" class="size-3" aria-hidden="true" />
          <span class="sr-only">Sorumlu:</span>
          {{ task.assignee ?? '—' }}
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
          :class="DATE_BADGE[due]"
        >
          <UIcon
            :name="due === 'overdue' ? 'i-lucide-alarm-clock' : 'i-lucide-calendar'"
            class="size-3"
            aria-hidden="true"
          />
          <span class="sr-only">Tarih:</span>
          <span v-if="dueWord" class="font-semibold">{{ dueWord }} ·</span>
          {{ dateLabel ?? '—' }}
        </span>
      </span>
    </button>
    <NuxtLink
      v-if="source"
      :to="source.to"
      draggable="false"
      class="flex max-w-full items-center gap-1 px-3 pb-3 text-xs text-slate-500 hover:text-navy-700 hover:underline focus-visible:text-navy-700 focus-visible:underline focus-visible:outline-none"
      :aria-label="`Kaynak not: ${source.title}`"
    >
      <UIcon :name="source.icon" class="size-3 shrink-0" aria-hidden="true" />
      <span class="truncate">{{ source.title }}</span>
    </NuxtLink>
  </div>
</template>
