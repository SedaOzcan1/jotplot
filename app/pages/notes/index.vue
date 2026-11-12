<script setup lang="ts">
definePageMeta({ title: 'Notlar' })
useSeoMeta({ title: 'Notlar' })
</script>

<template>
  <EmptyState
    icon="i-lucide-notebook-text"
    title="Henüz notun yok"
    description="İlk toplantı notunu yapıştır, görevleri senin için çıkaralım."
    action-label="İlk notunu oluştur"
    action-to="/notes/new"
  />
</template>
