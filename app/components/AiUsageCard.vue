<script setup lang="ts">
/** "Bu ayki kullanım" on the settings page (wireframe 8, US-1.6). */
const { getAiUsage } = useAiUsage()

// Personal data: loaded in the browser only.
const {
  data: usage,
  status,
  error,
  refresh,
} = useAsyncData('ai-usage', () => getAiUsage(), {
  server: false,
})

const level = computed(() => (usage.value ? aiUsageLevel(usage.value) : 'ok'))
const percent = computed(() =>
  usage.value ? Math.min(100, Math.round((usage.value.used / usage.value.limit) * 100)) : 0,
)
const message = computed(() => (usage.value ? aiUsageMessage(usage.value) : null))
</script>

<template>
  <section
    aria-labelledby="usage-heading"
    class="space-y-3 rounded-2xl border border-slate-200 bg-white p-6"
  >
    <h2 id="usage-heading" class="text-lg font-semibold text-navy-900">Bu ayki kullanım</h2>

    <USkeleton v-if="!usage && (status === 'pending' || status === 'idle')" class="h-10 w-full" />

    <div v-else-if="error && !usage" class="space-y-2">
      <p class="text-sm text-slate-600">Kullanım bilgisi yüklenemedi.</p>
      <UButton size="sm" color="neutral" variant="outline" @click="refresh()">Tekrar dene</UButton>
    </div>

    <template v-else-if="usage">
      <div
        role="progressbar"
        aria-label="AI işleme kullanımı"
        :aria-valuenow="usage.used"
        aria-valuemin="0"
        :aria-valuemax="usage.limit"
        class="h-2 overflow-hidden rounded-full bg-navy-100"
      >
        <div
          class="h-full rounded-full"
          :class="
            level === 'reached'
              ? 'bg-red-500'
              : level === 'near'
                ? 'bg-amber-500'
                : 'bg-brand-gradient'
          "
          :style="{ width: `${percent}%` }"
        />
      </div>
      <p class="text-sm text-slate-700">
        <span class="font-semibold text-navy-900">{{ usage.used }} / {{ usage.limit }}</span>
        AI işleme · {{ formatResetDateLocative(usage.period) }} yenilenir
      </p>
      <p
        v-if="message"
        class="text-sm"
        :class="level === 'reached' ? 'text-red-700' : 'text-amber-700'"
      >
        {{ message }}
      </p>
      <p class="text-xs text-slate-500">
        Bir notu “Görevleri çıkar” ile işlemek bir hak kullanır. Notları kaydetmek ücretsizdir.
      </p>
    </template>
  </section>
</template>
