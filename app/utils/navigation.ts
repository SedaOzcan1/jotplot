export interface NavItem {
  label: string
  to: string
  icon: string
}

/** Main sections shown in the desktop sidebar and the mobile bottom bar. */
export const mainNavItems: readonly NavItem[] = [
  { label: 'Notlar', to: '/notes', icon: 'i-lucide-notebook-text' },
  { label: 'Pano', to: '/board', icon: 'i-lucide-kanban' },
  { label: 'Sor', to: '/ask', icon: 'i-lucide-message-circle-question' },
  { label: 'Ayarlar', to: '/settings', icon: 'i-lucide-settings' },
]

export const newNoteItem: NavItem = { label: 'Yeni not', to: '/notes/new', icon: 'i-lucide-plus' }

/** True when `path` is the item's route or one of its child routes. */
export function isNavItemActive(item: NavItem, path: string): boolean {
  if (item.to === newNoteItem.to) return path === item.to
  if (path === newNoteItem.to) return false
  return path === item.to || path.startsWith(`${item.to}/`)
}
