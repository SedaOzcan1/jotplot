<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{ mode: AuthMode }>()

const { signIn, signUp, signInWithGoogle } = useAuth()

const state = reactive<Credentials>({ email: '', password: '' })
const showPassword = ref(false)
const errorMessage = ref<string | null>(null)
const confirmationEmail = ref<string | null>(null)
const googleLoading = ref(false)
const redirect = useSupabaseCookieRedirect()
const ready = useIsMounted()

const copy = computed(() =>
  props.mode === 'login'
    ? {
        title: 'Tekrar hoş geldin',
        subtitle: 'Notlarına ve panona ulaşmak için giriş yap.',
        submit: 'Giriş yap',
        switchText: 'Hesabın yok mu?',
        switchLabel: 'Kayıt ol',
        switchTo: '/register',
      }
    : {
        title: 'Hesap oluştur',
        subtitle: 'Toplantı notlarını dakikalar içinde göreve dönüştür.',
        submit: 'Kayıt ol',
        switchText: 'Zaten hesabın var mı?',
        switchLabel: 'Giriş yap',
        switchTo: '/login',
      },
)

function validate(values: Partial<Credentials>) {
  return validateCredentials(values, props.mode)
}

async function onSubmit(event: FormSubmitEvent<Credentials>) {
  errorMessage.value = null
  confirmationEmail.value = null
  const credentials = { email: event.data.email.trim(), password: event.data.password }
  try {
    if (props.mode === 'login') {
      await signIn(credentials)
    } else {
      const { needsEmailConfirmation } = await signUp(credentials)
      if (needsEmailConfirmation) {
        confirmationEmail.value = credentials.email
        return
      }
    }
    await navigateTo(safeRedirectPath(redirect.pluck()), { replace: true })
  } catch (error) {
    errorMessage.value = authErrorMessage(error)
  }
}

async function onGoogle() {
  errorMessage.value = null
  googleLoading.value = true
  try {
    // On success the browser leaves for Google, so the button keeps its loading state.
    await signInWithGoogle()
  } catch (error) {
    errorMessage.value = authErrorMessage(error)
    googleLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1 text-center">
      <h1 class="text-2xl font-bold text-navy-900">{{ copy.title }}</h1>
      <p class="text-sm text-slate-500">{{ copy.subtitle }}</p>
    </header>

    <UAlert
      v-if="errorMessage"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
    />

    <UAlert
      v-if="confirmationEmail"
      role="status"
      color="success"
      variant="subtle"
      icon="i-lucide-mail-check"
      title="E-postanı kontrol et"
      :description="`${confirmationEmail} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıklayınca giriş yapılacak.`"
    />

    <UButton
      block
      size="lg"
      color="neutral"
      variant="outline"
      :loading="googleLoading"
      :disabled="!ready"
      @click="onGoogle"
    >
      <svg v-if="!googleLoading" aria-hidden="true" viewBox="0 0 24 24" class="size-5">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        />
      </svg>
      Google ile devam et
    </UButton>

    <USeparator label="veya" />

    <UForm :state="state" :validate="validate" class="space-y-4" @submit="onSubmit">
      <UFormField label="E-posta" name="email">
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          placeholder="ornek@sirket.com"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Şifre"
        name="password"
        :help="mode === 'register' ? `En az ${MIN_PASSWORD_LENGTH} karakter` : undefined"
      >
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          size="lg"
          class="w-full"
          :ui="{ trailing: 'pe-1' }"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UButton type="submit" block size="lg" class="bg-brand-gradient" :disabled="!ready">
        {{ copy.submit }}
      </UButton>
    </UForm>

    <p class="text-center text-sm text-slate-500">
      {{ copy.switchText }}
      <NuxtLink :to="copy.switchTo" class="font-semibold text-navy-600 hover:underline">
        {{ copy.switchLabel }}
      </NuxtLink>
    </p>
  </div>
</template>
