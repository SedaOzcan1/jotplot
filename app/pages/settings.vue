<script setup lang="ts">
definePageMeta({ title: 'Ayarlar' })
useSeoMeta({ title: 'Ayarlar' })

const user = useSupabaseUser()
const email = computed(() => (typeof user.value?.email === 'string' ? user.value.email : null))
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <section
      aria-labelledby="account-heading"
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <h2 id="account-heading" class="text-lg font-semibold text-navy-900">Hesap</h2>
      <div class="text-sm">
        <p class="text-slate-500">Giriş yapılan e-posta</p>
        <p class="font-medium break-all text-slate-900">{{ email ?? '—' }}</p>
      </div>
      <SignOutButton />
    </section>

    <EmptyState
      icon="i-lucide-settings"
      title="Diğer ayarlar hazırlanıyor"
      description="Kullanım, gizlilik ve hesap silme ayarları sonraki adımlarda burada olacak."
    />
  </div>
</template>
