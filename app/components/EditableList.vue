<script setup lang="ts">
/** A list of short texts that can be edited, removed, and added to (decisions, questions). */
const items = defineModel<string[]>({ required: true })

defineProps<{
  /** Name of one item, used in labels: "Karar", "Soru". */
  itemLabel: string
  addLabel: string
  placeholder?: string
}>()

const listRef = ref<HTMLElement | null>(null)

async function add() {
  items.value = [...items.value, '']
  await nextTick()
  const inputs = listRef.value?.querySelectorAll('textarea')
  inputs?.[inputs.length - 1]?.focus()
}

function remove(index: number) {
  items.value = items.value.filter((_, i) => i !== index)
}

function update(index: number, value: string) {
  items.value = items.value.map((item, i) => (i === index ? value : item))
}
</script>

<template>
  <div ref="listRef" class="space-y-2">
    <div v-for="(item, index) in items" :key="index" class="flex items-start gap-2">
      <!-- Grows with the text so long decisions stay fully visible on phones. -->
      <UTextarea
        :model-value="item"
        :aria-label="`${itemLabel} ${index + 1}`"
        :placeholder="placeholder"
        :rows="1"
        autoresize
        class="min-w-0 flex-1"
        @update:model-value="update(index, String($event))"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        :aria-label="`${itemLabel} ${index + 1} sil`"
        @click="remove(index)"
      />
    </div>
    <UButton color="primary" variant="link" icon="i-lucide-plus" class="px-0" @click="add">
      {{ addLabel }}
    </UButton>
  </div>
</template>
