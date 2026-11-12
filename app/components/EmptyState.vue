<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
}>()
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-16 text-center">
    <div class="flex size-14 items-center justify-center rounded-2xl bg-navy-100 text-navy-700">
      <UIcon :name="icon" class="size-7" aria-hidden="true" />
    </div>
    <h2 class="text-lg font-semibold text-navy-900">{{ title }}</h2>
    <p class="text-sm text-slate-600">{{ description }}</p>
    <UButton
      v-if="actionLabel && actionTo"
      :to="actionTo"
      size="lg"
      class="bg-brand-gradient mt-2 shadow-md shadow-navy-500/25"
    >
      {{ actionLabel }}
    </UButton>
  </section>
</template>
