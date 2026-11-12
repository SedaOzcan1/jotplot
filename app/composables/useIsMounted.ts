/**
 * True once the component is mounted in the browser. Buttons that need JavaScript stay disabled
 * until then, so a click during page load is never silently lost.
 */
export function useIsMounted() {
  const mounted = ref(false)
  onMounted(() => {
    mounted.value = true
  })
  return readonly(mounted)
}
