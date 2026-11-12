<script setup lang="ts">
// Email confirmation links land here. The Supabase client exchanges the code in the URL for a
// session; once the user is known we continue to the page they originally asked for.
definePageMeta({ layout: 'auth', title: 'Giriş doğrulanıyor' })
useSeoMeta({ title: 'Giriş doğrulanıyor' })

const user = useSupabaseUser()
const route = useRoute()
const redirect = useSupabaseCookieRedirect()

const linkFailed = computed(
  () => typeof route.query.error === 'string' || typeof route.query.error_description === 'string',
)

watch(
  user,
  (value) => {
    if (value) navigateTo(safeRedirectPath(redirect.pluck()), { replace: true })
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4 text-center">
    <template v-if="linkFailed">
      <h1 class="text-2xl font-bold text-navy-900">Bağlantı geçersiz</h1>
      <p class="text-sm text-slate-500">
        Doğrulama bağlantısının süresi dolmuş ya da daha önce kullanılmış olabilir.
      </p>
      <UButton to="/login" block size="lg" class="bg-brand-gradient">Giriş sayfasına dön</UButton>
    </template>
    <template v-else>
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-navy-500" />
      <h1 class="text-2xl font-bold text-navy-900">Giriş doğrulanıyor…</h1>
      <p class="text-sm text-slate-500">Birkaç saniye içinde yönlendirileceksin.</p>
      <NuxtLink to="/login" class="text-sm font-semibold text-navy-600 hover:underline">
        Giriş sayfasına dön
      </NuxtLink>
    </template>
  </div>
</template>
