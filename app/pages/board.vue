<script setup lang="ts">
import type { BoardTask, TaskFields, TaskStatus } from '~/utils/board'

definePageMeta({ title: 'Pano' })
useSeoMeta({ title: 'Pano' })

const { mode } = useAppMode()
const board = useBoard()
const toast = useToast()

// Personal data: loaded in the browser only.
const { data, status, error, refresh } = useAsyncData(
  () => `board-${mode.value}`,
  () => board.loadBoard(mode.value),
  { server: false },
)

/** Local copy of the tasks; moves show at once and are undone if saving fails. */
const tasks = ref<BoardTask[]>([])
watch(data, (value) => (tasks.value = value?.tasks ?? []), { immediate: true })

const boardError = ref<string | null>(null)

/** Column shown on phones, where one column is visible at a time (wireframe 5). */
const activeStatus = ref<TaskStatus>('todo')

const columns = computed(() =>
  TASK_STATUSES.map((status) => ({ status, tasks: columnTasks(tasks.value, status) })),
)

async function move(id: string, status: TaskStatus, beforeId?: string | null) {
  const current = tasks.value.find((task) => task.id === id)
  if (!current) return
  const previous = tasks.value
  const result = moveTask(previous, id, status, beforeId)
  if (current.status === status && current.position === result.position) return
  boardError.value = null
  tasks.value = result.tasks
  try {
    await board.moveTask(id, status, result.position)
  } catch {
    tasks.value = previous
    // On phones, show the column the card went back to.
    activeStatus.value = current.status
    boardError.value = BOARD_SAVE_ERROR
  }
}

// Dragging on desktop (native drag and drop; phones use the dialog's move buttons).
const draggingId = ref<string | null>(null)
const dropStatus = ref<TaskStatus | null>(null)

function onDragStart(event: DragEvent, id: string) {
  draggingId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggingId.value = null
  dropStatus.value = null
}

function onDrop(event: DragEvent, status: TaskStatus) {
  const id = event.dataTransfer?.getData('text/plain') || draggingId.value
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-task-id]')
  const beforeId = target?.dataset.taskId !== id ? target?.dataset.taskId : undefined
  onDragEnd()
  if (id) void move(id, status, beforeId)
}

// Dialog for creating, editing, moving, and deleting a task.
const dialogOpen = ref(false)
const dialogTask = ref<BoardTask | null>(null)
const dialogStatus = ref<TaskStatus>('todo')
const dialogSaving = ref(false)
const dialogError = ref<string | null>(null)

function openTask(task: BoardTask) {
  dialogTask.value = task
  dialogError.value = null
  dialogOpen.value = true
}

function openNewTask(status: TaskStatus) {
  dialogTask.value = null
  dialogStatus.value = status
  dialogError.value = null
  dialogOpen.value = true
}

function onDialogMove(status: TaskStatus) {
  const task = dialogTask.value
  dialogOpen.value = false
  if (task) {
    activeStatus.value = status
    void move(task.id, status)
  }
}

function replaceTask(saved: BoardTask) {
  tasks.value = tasks.value.some((task) => task.id === saved.id)
    ? tasks.value.map((task) => (task.id === saved.id ? saved : task))
    : [...tasks.value, saved]
}

async function onDialogSave(fields: TaskFields) {
  const boardId = data.value?.board?.id
  if (!boardId) return
  dialogSaving.value = true
  dialogError.value = null
  try {
    const existing = dialogTask.value
    if (existing) {
      const moved = existing.status !== fields.status
      const position = moved ? positionFor(tasks.value, existing.id, fields.status) : undefined
      replaceTask(
        await board.updateTask(existing.id, { ...fields, ...(moved ? { position } : {}) }),
      )
    } else {
      const position = positionFor(tasks.value, '', fields.status)
      replaceTask(await board.createTask(boardId, fields, position))
      toast.add({ title: 'Görev eklendi', color: 'success', icon: 'i-lucide-check' })
    }
    dialogOpen.value = false
  } catch {
    dialogError.value = 'Görev kaydedilemedi. Bağlantını kontrol edip tekrar dene.'
  } finally {
    dialogSaving.value = false
  }
}

async function onDialogDelete() {
  const task = dialogTask.value
  if (!task) return
  dialogSaving.value = true
  dialogError.value = null
  try {
    await board.deleteTask(task.id)
    tasks.value = tasks.value.filter((item) => item.id !== task.id)
    dialogOpen.value = false
    toast.add({ title: 'Görev silindi', color: 'success', icon: 'i-lucide-check' })
  } catch {
    dialogError.value = 'Görev silinemedi. Bağlantını kontrol edip tekrar dene.'
  } finally {
    dialogSaving.value = false
  }
}
</script>

<template>
  <div>
    <div
      v-if="!data && (status === 'pending' || status === 'idle')"
      class="grid gap-4 lg:grid-cols-3"
      aria-busy="true"
    >
      <span class="sr-only">Pano yükleniyor</span>
      <USkeleton v-for="n in 3" :key="n" class="h-48 w-full rounded-2xl" />
    </div>

    <div v-else-if="error && !data" class="max-w-3xl space-y-3">
      <UAlert
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        description="Pano yüklenemedi. Bağlantını kontrol edip tekrar dene."
      />
      <UButton color="neutral" variant="outline" icon="i-lucide-rotate-cw" @click="refresh()">
        Tekrar dene
      </UButton>
    </div>

    <template v-else-if="data?.board">
      <div v-if="!tasks.length" class="flex flex-col items-center">
        <EmptyState
          icon="i-lucide-kanban"
          title="Panon şimdilik boş"
          description="Notlarından çıkan görevler burada Yapılacak, Devam Ediyor ve Tamamlandı kolonlarında görünecek."
          action-label="Not oluştur"
          action-to="/notes/new"
        />
        <UButton color="primary" variant="link" icon="i-lucide-plus" @click="openNewTask('todo')">
          Kendin görev ekle
        </UButton>
      </div>

      <div v-else class="space-y-4">
        <UAlert
          v-if="boardError"
          role="alert"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="boardError"
        />

        <!-- Phones show one column at a time; the tabs switch between columns. -->
        <div role="tablist" aria-label="Kolonlar" class="flex gap-2 overflow-x-auto lg:hidden">
          <button
            v-for="column in columns"
            :id="`tab-${column.status}`"
            :key="column.status"
            type="button"
            role="tab"
            :aria-selected="activeStatus === column.status"
            :aria-controls="`column-${column.status}`"
            class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap"
            :class="
              activeStatus === column.status
                ? 'bg-brand-gradient text-white shadow-sm'
                : 'bg-navy-100 text-navy-900'
            "
            @click="activeStatus = column.status"
          >
            {{ COLUMN_SHORT_TITLES[column.status] }} {{ column.tasks.length }}
          </button>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <section
            v-for="column in columns"
            :id="`column-${column.status}`"
            :key="column.status"
            :aria-label="COLUMN_TITLES[column.status]"
            class="min-w-0 rounded-2xl transition lg:min-h-96 lg:bg-navy-100/60 lg:p-3"
            :class="[
              activeStatus === column.status ? '' : 'max-lg:hidden',
              dropStatus === column.status ? 'lg:ring-2 lg:ring-teal-400' : '',
            ]"
            @dragover.prevent="dropStatus = column.status"
            @dragleave="dropStatus = dropStatus === column.status ? null : dropStatus"
            @drop.prevent="onDrop($event, column.status)"
          >
            <h2 class="mb-3 hidden text-sm font-semibold text-navy-900 lg:block">
              {{ COLUMN_TITLES[column.status] }} · {{ column.tasks.length }}
            </h2>
            <ul class="space-y-3" :aria-label="`${COLUMN_TITLES[column.status]} görevleri`">
              <li
                v-for="task in column.tasks"
                :key="task.id"
                :data-task-id="task.id"
                draggable="true"
                @dragstart="onDragStart($event, task.id)"
                @dragend="onDragEnd"
              >
                <BoardTaskCard
                  :task="task"
                  :dragging="draggingId === task.id"
                  @open="openTask(task)"
                />
              </li>
            </ul>
            <p v-if="!column.tasks.length" class="py-4 text-center text-sm text-slate-500">
              Bu kolonda görev yok.
            </p>
            <UButton
              color="primary"
              variant="link"
              icon="i-lucide-plus"
              block
              class="mt-2"
              @click="openNewTask(column.status)"
            >
              Görev ekle
            </UButton>
          </section>
        </div>

        <p class="hidden text-xs text-slate-500 lg:block">
          Kartları kolonlar arasında sürükleyip bırakabilir ya da karta tıklayıp taşıyabilirsin.
        </p>
      </div>
    </template>

    <TaskDialog
      v-model:open="dialogOpen"
      :task="dialogTask"
      :status="dialogStatus"
      :saving="dialogSaving"
      :error="dialogError"
      @save="onDialogSave"
      @move="onDialogMove"
      @delete="onDialogDelete"
    />
  </div>
</template>
