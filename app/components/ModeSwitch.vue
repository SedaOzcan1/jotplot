<script setup lang="ts">
import { availableModes, type AppMode } from '~/composables/useAppMode'

defineProps<{ tone?: 'light' | 'dark'; compact?: boolean }>()

const { mode, setMode } = useAppMode()

const options: { value: AppMode; label: string; icon: string }[] = [
  { value: 'work', label: 'Çalışan', icon: 'i-lucide-briefcase-business' },
  { value: 'student', label: 'Öğrenci', icon: 'i-lucide-graduation-cap' },
]
</script>

<template>
  <div role="group" aria-label="Mod seçimi" class="flex flex-wrap gap-1.5">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="mode === option.value"
      :disabled="!availableModes.includes(option.value)"
      class="inline-flex items-center gap-1.5 rounded-full whitespace-nowrap px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed"
      :class="[
        mode === option.value
          ? 'bg-brand-gradient text-white shadow-sm'
          : tone === 'dark'
            ? 'bg-white/10 text-navy-100 disabled:opacity-70'
            : 'bg-navy-100 text-navy-900 disabled:opacity-70',
      ]"
      @click="setMode(option.value)"
    >
      <UIcon :name="option.icon" class="size-3.5" aria-hidden="true" />
      {{ option.label }}
      <span
        v-if="!availableModes.includes(option.value)"
        class="font-normal"
        :class="{ 'max-[400px]:sr-only': compact }"
        >· yakında</span
      >
    </button>
  </div>
</template>
