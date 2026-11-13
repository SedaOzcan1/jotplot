<script setup lang="ts">
definePageMeta({ layout: 'auth', title: 'Kayıt ol', middleware: 'guest' })
useSeoMeta({ title: 'Kayıt ol' })
</script>

<template>
  <CredentialsForm mode="register" />
</template>
