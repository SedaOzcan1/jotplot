<script setup lang="ts">
definePageMeta({ layout: 'auth', title: 'Giriş yap', middleware: 'guest' })
useSeoMeta({ title: 'Giriş yap' })
</script>

<template>
  <CredentialsForm mode="login" />
</template>
