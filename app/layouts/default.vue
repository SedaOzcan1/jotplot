<script setup lang="ts">
const route = useRoute()
const title = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : 'Jotplot'))
</script>

<template>
  <div class="flex min-h-dvh bg-navy-50">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopBar :title="title" />
      <main class="flex-1 px-4 pt-4 pb-24 lg:px-8 lg:pt-8 lg:pb-8">
        <h1 class="mb-6 hidden text-2xl font-bold text-navy-900 lg:block">{{ title }}</h1>
        <slot />
      </main>
    </div>
    <AppBottomNav />
  </div>
</template>
