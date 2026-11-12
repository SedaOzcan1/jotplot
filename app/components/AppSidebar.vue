<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <aside
    class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 bg-linear-to-b from-navy-900 to-navy-800 p-4 lg:flex"
  >
    <NuxtLink
      to="/notes"
      class="mb-4 bg-linear-to-r from-white to-teal-400 bg-clip-text px-2 text-xl font-bold text-transparent"
    >
      Jotplot
    </NuxtLink>
    <UButton
      :to="newNoteItem.to"
      :icon="newNoteItem.icon"
      size="lg"
      block
      class="bg-brand-gradient mb-3 shadow-md shadow-black/20"
    >
      {{ newNoteItem.label }}
    </UButton>
    <nav aria-label="Ana menü" class="flex flex-col gap-1">
      <NuxtLink
        v-for="item in mainNavItems"
        :key="item.to"
        :to="item.to"
        :aria-current="isNavItemActive(item, route.path) ? 'page' : undefined"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-100 transition hover:bg-white/10"
        :class="{ 'bg-white/15 font-semibold text-white': isNavItemActive(item, route.path) }"
      >
        <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
        {{ item.label }}
      </NuxtLink>
    </nav>
    <div class="mt-auto flex flex-col gap-3">
      <ModeSwitch tone="dark" />
      <SignOutButton tone="dark" class="justify-start" />
    </div>
  </aside>
</template>
