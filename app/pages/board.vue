<script setup lang="ts">
definePageMeta({ title: 'Pano' })
useSeoMeta({ title: 'Pano' })
</script>

<template>
  <EmptyState
    icon="i-lucide-kanban"
    title="Panon şimdilik boş"
    description="Notlarından çıkan görevler burada Yapılacak, Devam Ediyor ve Tamamlandı kolonlarında görünecek."
    action-label="Not oluştur"
    action-to="/notes/new"
  />
</template>
