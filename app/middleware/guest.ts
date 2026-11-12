/** Sends signed-in users away from the sign-in and sign-up screens. */
export default defineNuxtRouteMiddleware(() => {
  if (useSupabaseSession().value) return navigateTo('/notes')
})
