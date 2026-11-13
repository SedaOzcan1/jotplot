<template>
  <div class="flex min-h-dvh flex-col items-center justify-center bg-navy-50 px-4 py-10">
    <p
      class="bg-linear-to-r from-navy-900 via-navy-500 to-teal-500 bg-clip-text text-3xl font-bold text-transparent"
    >
      Jotplot
    </p>
    <p class="mt-1 text-sm text-slate-500">kaydet → anla → sor</p>
    <main
      class="mt-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <slot />
    </main>
  </div>
</template>
