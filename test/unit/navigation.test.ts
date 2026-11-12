import { describe, expect, it } from 'vitest'
import { isNavItemActive, mainNavItems, newNoteItem } from '~/utils/navigation'

const [notes, board] = mainNavItems

describe('isNavItemActive', () => {
  it('matches the exact route and its child routes', () => {
    expect(isNavItemActive(board!, '/board')).toBe(true)
    expect(isNavItemActive(notes!, '/notes')).toBe(true)
    expect(isNavItemActive(notes!, '/notes/123')).toBe(true)
  })

  it('does not match routes that only share a prefix', () => {
    expect(isNavItemActive(notes!, '/notes-archive')).toBe(false)
    expect(isNavItemActive(board!, '/notes')).toBe(false)
  })

  it('marks only the new-note item active on the new-note page', () => {
    expect(isNavItemActive(newNoteItem, '/notes/new')).toBe(true)
    expect(isNavItemActive(notes!, '/notes/new')).toBe(false)
    expect(isNavItemActive(newNoteItem, '/notes')).toBe(false)
  })
})

describe('mainNavItems', () => {
  it('lists the four main sections in Turkish', () => {
    expect(mainNavItems.map((item) => item.label)).toEqual(['Notlar', 'Pano', 'Sor', 'Ayarlar'])
  })
})
