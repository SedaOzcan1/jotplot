<script setup lang="ts">
definePageMeta({ title: 'Yeni not', modeSwitchInPage: true })
useSeoMeta({ title: 'Yeni not' })

const TABS = [
  { label: 'Yaz', icon: 'i-lucide-pencil-line', value: 'write', slot: 'write' as const },
  { label: 'Kaydet', icon: 'i-lucide-mic', value: 'record', slot: 'record' as const },
  { label: 'Dosya yükle', icon: 'i-lucide-upload', value: 'upload', slot: 'upload' as const },
]
type Tab = (typeof TABS)[number]['value']

// The open tab is kept in the URL (?tab=record) so it survives a reload and can be linked to.
const route = useRoute()
const router = useRouter()
const tab = computed<Tab>({
  get: () => TABS.find((item) => item.value === route.query.tab)?.value ?? 'write',
  set: (value) => void router.replace({ query: value === 'write' ? {} : { tab: value } }),
})
// Hidden tabs stay mounted (unmount-on-hide off) so a recording survives switching tabs.
</script>

<template>
  <UTabs
    v-model="tab"
    :items="TABS"
    :unmount-on-hide="false"
    variant="link"
    class="max-w-3xl"
    :ui="{ list: 'mb-4' }"
  >
    <template #write><NoteForm /></template>
    <template #record><AudioNoteForm source="record" /></template>
    <template #upload><AudioNoteForm source="upload" /></template>
  </UTabs>
</template>
