<script setup lang="ts">
useSeoMeta({ title: 'Jotplot' })
</script>

<template>
  <main
    class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-navy-50 px-6 text-center"
  >
    <h1 class="bg-brand-gradient bg-clip-text text-4xl font-bold text-transparent">Jotplot</h1>
    <p class="max-w-sm text-slate-600">
      Toplantı notlarını görevlere dönüştüren asistanın hazırlanıyor.
    </p>
    <UButton class="bg-brand-gradient" size="lg" disabled>Yakında</UButton>
  </main>
</template>
