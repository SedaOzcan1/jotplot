<script setup lang="ts">
const route = useRoute()
const [notes, board, ask, settings] = mainNavItems
const leftItems = [notes!, board!]
const rightItems = [ask!, settings!]
</script>

<template>
  <nav
    aria-label="Ana menü"
    class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
  >
    <ul class="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
      <li v-for="item in leftItems" :key="item.to" class="flex justify-center">
        <NuxtLink
          :to="item.to"
          :aria-current="isNavItemActive(item, route.path) ? 'page' : undefined"
          class="flex min-w-14 flex-col items-center gap-0.5 py-1 text-[11px] font-medium"
          :class="isNavItemActive(item, route.path) ? 'text-navy-600' : 'text-slate-500'"
        >
          <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </li>
      <li class="flex justify-center">
        <NuxtLink
          :to="newNoteItem.to"
          :aria-label="newNoteItem.label"
          :aria-current="isNavItemActive(newNoteItem, route.path) ? 'page' : undefined"
          class="bg-brand-gradient flex size-12 items-center justify-center rounded-full text-white shadow-lg shadow-navy-500/30"
        >
          <UIcon :name="newNoteItem.icon" class="size-6" aria-hidden="true" />
        </NuxtLink>
      </li>
      <li v-for="item in rightItems" :key="item.to" class="flex justify-center">
        <NuxtLink
          :to="item.to"
          :aria-current="isNavItemActive(item, route.path) ? 'page' : undefined"
          class="flex min-w-14 flex-col items-center gap-0.5 py-1 text-[11px] font-medium"
          :class="isNavItemActive(item, route.path) ? 'text-navy-600' : 'text-slate-500'"
        >
          <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
