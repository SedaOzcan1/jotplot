<script setup lang="ts">
useHead({ titleTemplate: (t) => (t && t !== 'Jotplot' ? `${t} · Jotplot` : 'Jotplot') })
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
