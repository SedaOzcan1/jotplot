<script setup lang="ts">
import type { BoardTask, TaskFields, TaskForm, TaskStatus } from '~/utils/board'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  /** The task to edit, or null to create a new one. */
  task: BoardTask | null
  /** Column of a new task. */
  status: TaskStatus
  saving?: boolean
  /** Shown inside the dialog when saving or deleting failed; the fields keep their values. */
  error?: string | null
}>()

const emit = defineEmits<{
  save: [fields: TaskFields]
  move: [status: TaskStatus]
  delete: []
}>()

const state = reactive<TaskForm>(toTaskForm())
const confirmingDelete = ref(false)

watch(
  () => [open.value, props.task] as const,
  ([isOpen, task]) => {
    if (!isOpen) return
    Object.assign(
      state,
      toTaskForm(task ?? { title: '', assignee: null, due_date: null, status: props.status }),
    )
    confirmingDelete.value = false
  },
  { immediate: true },
)

const otherStatuses = computed(() =>
  TASK_STATUSES.filter((status) => status !== props.task?.status),
)

const sourceTitle = computed(() =>
  props.task?.sources ? noteDisplayTitle(props.task.sources, 60) : null,
)

function onSubmit() {
  emit('save', toTaskFields(state))
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="task ? 'Görevi düzenle' : 'Yeni görev'"
    :description="task ? undefined : `${COLUMN_TITLES[status]} kolonuna eklenecek.`"
  >
    <template #body>
      <div class="space-y-5">
        <div v-if="task" class="space-y-2">
          <p id="task-move-label" class="text-sm font-medium text-navy-900">Taşı</p>
          <div role="group" aria-labelledby="task-move-label" class="flex flex-wrap gap-2">
            <UButton
              v-for="target in otherStatuses"
              :key="target"
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-right"
              @click="emit('move', target)"
            >
              {{ COLUMN_TITLES[target] }}
            </UButton>
          </div>
        </div>

        <UForm
          id="task-form"
          :state="state"
          :validate="validateTaskForm"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField label="Görev" name="title">
            <UInput
              v-model="state.title"
              :maxlength="TASK_TITLE_MAX_LENGTH"
              placeholder="Örn. Sunumu hazırla"
              class="w-full"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Sorumlu" name="assignee">
              <UInput
                v-model="state.assignee"
                placeholder="—"
                icon="i-lucide-user"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Tarih" name="dueDate">
              <UInput v-model="state.dueDate" type="date" class="w-full" />
            </UFormField>
          </div>
        </UForm>

        <NuxtLink
          v-if="task?.source_id"
          :to="`/notes/${task.source_id}`"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:underline"
        >
          <UIcon name="i-lucide-file-text" class="size-4" aria-hidden="true" />
          Kaynak nota git<span v-if="sourceTitle" class="font-normal text-slate-500"
            >: {{ sourceTitle }}</span
          >
        </NuxtLink>

        <UAlert
          v-if="error"
          role="alert"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="error"
        />

        <div
          v-if="confirmingDelete"
          role="alertdialog"
          aria-labelledby="task-delete-title"
          class="space-y-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-200"
        >
          <p id="task-delete-title" class="text-sm text-navy-900">
            Bu görev panodan kalıcı olarak silinecek.
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton color="neutral" variant="outline" @click="confirmingDelete = false">
              Vazgeç
            </UButton>
            <UButton color="error" :loading="saving" @click="emit('delete')">Görevi sil</UButton>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <UButton
          v-if="task && !confirmingDelete"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="confirmingDelete = true"
        >
          Sil
        </UButton>
        <span v-else />
        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" @click="open = false">Vazgeç</UButton>
          <UButton type="submit" form="task-form" class="bg-brand-gradient" :loading="saving">
            Kaydet
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
