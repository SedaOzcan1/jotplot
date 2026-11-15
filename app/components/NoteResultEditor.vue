<script setup lang="ts">
import type { AppMode } from '~/composables/useAppMode'
import type { NoteTask } from '~/composables/useNoteResult'
import type { SummaryRow } from '~/utils/noteResult'

const props = defineProps<{
  summary: SummaryRow
  mode: AppMode
  /** Tasks already on the board from this note. */
  boardTasks: NoteTask[]
  /** True while the AI is running again for this note. */
  reprocessing?: boolean
}>()

const emit = defineEmits<{ retry: []; approved: [added: number] }>()

const { saveDraft, approve } = useNoteResult()
const toast = useToast()
const ready = useIsMounted()

const result = ref<EditableResult>(toEditableResult(props.summary))
const titleErrors = ref<Record<string, string>>({})
const approving = ref(false)
const approveError = ref<string | null>(null)
const confirmingRetry = ref(false)

// Edits are saved automatically shortly after the user stops typing.
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
const saveState = ref<SaveState>('idle')
let saveTimer: ReturnType<typeof setTimeout> | undefined
let skipNextSave = false
/** True while there are edits that have not been sent to the server yet. */
let dirty = false

function cancelPendingSave() {
  clearTimeout(saveTimer)
  dirty = false
}

async function saveNow() {
  cancelPendingSave()
  saveState.value = 'saving'
  try {
    await saveDraft(props.summary.id, toResultPayload(result.value))
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  }
}

watch(
  result,
  () => {
    if (skipNextSave) {
      skipNextSave = false
      return
    }
    dirty = true
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveNow, 800)
  },
  { deep: true },
)

// A new AI result (after "Tekrar dene") replaces the form.
watch(
  () => props.summary,
  (summary) => {
    skipNextSave = true
    result.value = toEditableResult(summary)
    titleErrors.value = {}
  },
)

onBeforeUnmount(() => {
  // Save pending edits when the user leaves the page before the timer fires.
  if (dirty) void saveNow()
})

const isWork = computed(() => props.mode === 'work')
const listLabels = computed(() =>
  isWork.value
    ? { questions: 'Açık sorular', question: 'Soru', addQuestion: 'Soru ekle' }
    : { questions: 'Çalışma soruları', question: 'Soru', addQuestion: 'Soru ekle' },
)

function addTask() {
  result.value.tasks.push(emptyTask())
}

function removeTask(key: string) {
  result.value.tasks = result.value.tasks.filter((task) => task.key !== key)
  titleErrors.value = Object.fromEntries(
    Object.entries(titleErrors.value).filter(([taskKey]) => taskKey !== key),
  )
}

async function onApprove() {
  approveError.value = null
  titleErrors.value = taskTitleErrors(result.value.tasks)
  if (Object.keys(titleErrors.value).length) {
    approveError.value = 'Panoya eklemeden önce her göreve bir başlık yaz.'
    return
  }
  approving.value = true
  // Approving saves every field, so a pending draft save must not overwrite it afterwards.
  cancelPendingSave()
  try {
    const added = await approve(props.summary.id, toResultPayload(result.value))
    toast.add({
      title: added ? `${added} görev panoya eklendi` : 'Değişiklikler kaydedildi',
      color: 'success',
      icon: 'i-lucide-check',
    })
    emit('approved', added)
  } catch (error) {
    approveError.value =
      error instanceof NoteServiceError && error.code === 'not_signed_in'
        ? 'Oturumun sona ermiş. Tekrar giriş yap; düzenlemelerin kaydedildi.'
        : 'Görevler panoya eklenemedi. Bağlantını kontrol edip tekrar dene.'
  } finally {
    approving.value = false
  }
}

function onRetry() {
  confirmingRetry.value = false
  emit('retry')
}
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <div
      class="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-slate-600 ring-1 ring-navy-100"
    >
      <UIcon name="i-lucide-pencil" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>Panoya eklemeden önce her alanı düzenleyebilirsin. Değişikliklerin otomatik kaydedilir.</p>
    </div>

    <section class="space-y-2" aria-labelledby="result-summary">
      <h2 id="result-summary" class="text-sm font-semibold text-slate-600">Özet</h2>
      <UTextarea
        v-model="result.summary"
        aria-labelledby="result-summary"
        autoresize
        :rows="3"
        class="w-full"
      />
    </section>

    <section v-if="isWork" class="space-y-2" aria-labelledby="result-decisions">
      <h2 id="result-decisions" class="text-sm font-semibold text-slate-600">
        Kararlar ({{ result.decisions.length }})
      </h2>
      <EditableList v-model="result.decisions" item-label="Karar" add-label="Karar ekle" />
    </section>

    <section v-else class="space-y-2" aria-labelledby="result-concepts">
      <h2 id="result-concepts" class="text-sm font-semibold text-slate-600">
        Kavramlar ({{ result.concepts.length }})
      </h2>
      <EditableList v-model="result.concepts" item-label="Kavram" add-label="Kavram ekle" />
    </section>

    <section class="space-y-2" aria-labelledby="result-tasks">
      <h2 id="result-tasks" class="text-sm font-semibold text-slate-600">
        Görevler ({{ result.tasks.length }})
      </h2>

      <ul v-if="result.tasks.length" class="space-y-3" aria-label="Önerilen görevler">
        <li
          v-for="(task, index) in result.tasks"
          :key="task.key"
          class="space-y-3 rounded-xl border-l-4 border-teal-500 bg-white p-3 shadow-sm ring-1 ring-navy-100"
        >
          <div class="flex items-start gap-2">
            <UFormField
              :label="`Görev ${index + 1}`"
              :error="titleErrors[task.key]"
              class="min-w-0 flex-1"
            >
              <UInput
                v-model="task.title"
                :maxlength="TASK_TITLE_MAX_LENGTH"
                placeholder="Örn. Sunumu hazırla"
                class="w-full"
              />
            </UFormField>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="mt-6"
              :aria-label="`Görev ${index + 1} sil`"
              @click="removeTask(task.key)"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <UFormField label="Sorumlu">
              <UInput v-model="task.assignee" placeholder="—" icon="i-lucide-user" class="w-full" />
            </UFormField>
            <UFormField label="Tarih">
              <UInput v-model="task.dueDate" type="date" class="w-full" />
            </UFormField>
          </div>
        </li>
      </ul>
      <p v-else-if="!boardTasks.length" class="text-sm text-slate-500">
        Bu notta görev bulunamadı. İstersen kendin ekleyebilirsin.
      </p>

      <UButton color="primary" variant="link" icon="i-lucide-plus" class="px-0" @click="addTask">
        Görev ekle
      </UButton>

      <div v-if="boardTasks.length" class="rounded-xl bg-teal-50 p-3 text-sm ring-1 ring-teal-200">
        <p class="font-medium text-navy-900">Panodaki görevler ({{ boardTasks.length }})</p>
        <ul class="mt-1 list-disc ps-5 text-slate-700" aria-label="Panodaki görevler">
          <li v-for="task in boardTasks" :key="task.id">
            {{ task.title }}
            <span v-if="task.assignee || task.due_date" class="text-slate-500">
              ·
              {{
                [task.assignee, task.due_date && formatTaskDate(task.due_date)]
                  .filter(Boolean)
                  .join(' · ')
              }}
            </span>
          </li>
        </ul>
        <NuxtLink to="/board" class="mt-2 inline-block font-semibold text-navy-600 hover:underline">
          Panoya git
        </NuxtLink>
      </div>
    </section>

    <section class="space-y-2" aria-labelledby="result-questions">
      <h2 id="result-questions" class="text-sm font-semibold text-slate-600">
        {{ listLabels.questions }} ({{ result.questions.length }})
      </h2>
      <EditableList
        v-model="result.questions"
        :item-label="listLabels.question"
        :add-label="listLabels.addQuestion"
      />
    </section>

    <UAlert
      v-if="approveError"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="approveError"
    />

    <div
      v-if="confirmingRetry"
      role="alertdialog"
      aria-labelledby="retry-title"
      class="space-y-3 rounded-xl bg-white p-4 ring-1 ring-navy-100"
    >
      <p id="retry-title" class="text-sm text-navy-900">
        Not yeniden işlenecek ve bu sonuçtaki düzenlemelerin yerine yeni sonuç gelecek. Panodaki
        görevler değişmez.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="outline" @click="confirmingRetry = false">
          Vazgeç
        </UButton>
        <UButton class="bg-brand-gradient" @click="onRetry">Yeniden işle</UButton>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <UButton
        size="xl"
        block
        color="neutral"
        variant="outline"
        :disabled="!ready || reprocessing || approving"
        :loading="reprocessing"
        @click="confirmingRetry = true"
      >
        Tekrar dene
      </UButton>
      <UButton
        size="xl"
        block
        class="bg-brand-gradient"
        :disabled="!ready || reprocessing || !result.tasks.length"
        :loading="approving"
        @click="onApprove"
      >
        Panoya ekle
      </UButton>
    </div>

    <p class="text-center text-xs text-slate-500" aria-live="polite">
      <template v-if="saveState === 'saving'">Kaydediliyor…</template>
      <template v-else-if="saveState === 'saved'">Değişiklikler kaydedildi</template>
      <template v-else-if="saveState === 'error'">
        Değişiklikler kaydedilemedi.
        <button type="button" class="font-semibold text-navy-600 underline" @click="saveNow">
          Tekrar kaydet
        </button>
      </template>
    </p>
  </div>
</template>
