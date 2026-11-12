export type AppMode = 'work' | 'student'

/** Modes that can be selected in the current release. Student mode follows after the MVP. */
export const availableModes: readonly AppMode[] = ['work']

export function useAppMode() {
  const mode = useState<AppMode>('app-mode', () => 'work')

  function setMode(next: AppMode) {
    if (availableModes.includes(next)) mode.value = next
  }

  return { mode: readonly(mode), setMode }
}
