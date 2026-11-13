<script setup lang="ts">
const props = withDefaults(defineProps<{ tone?: 'light' | 'dark' }>(), { tone: 'light' })

const { signOut } = useAuth()
const toast = useToast()
const loading = ref(false)
const ready = useIsMounted()

async function onSignOut() {
  loading.value = true
  try {
    await signOut()
    await navigateTo('/login', { replace: true })
  } catch (error) {
    toast.add({ title: 'Çıkış yapılamadı', description: authErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UButton
    icon="i-lucide-log-out"
    :color="props.tone === 'dark' ? 'neutral' : 'error'"
    :variant="props.tone === 'dark' ? 'ghost' : 'soft'"
    :class="props.tone === 'dark' ? 'text-navy-100 hover:bg-white/10 hover:text-white' : ''"
    :loading="loading"
    :disabled="!ready"
    @click="onSignOut"
  >
    Çıkış yap
  </UButton>
</template>
