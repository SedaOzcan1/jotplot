<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <header
    class="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden"
  >
    <h1 class="min-w-0 truncate text-lg font-semibold text-navy-900">{{ title }}</h1>
    <ModeSwitch compact class="shrink-0" />
  </header>
</template>
