import { describe, expect, it } from 'vitest'
import {
  activeTurnIndex,
  hasSeveralSpeakers,
  parseSegments,
  speakerLabel,
  speakerTurns,
} from '~/utils/transcript'

const segments = [
  { start: 0, end: 1.2, speaker: 0, text: 'Günaydın Kaan,' },
  { start: 1.3, end: 2.5, speaker: 0, text: 'rapora bakabildin mi?' },
  { start: 3, end: 6, speaker: 1, text: 'Baktım, iade oranı artmış.' },
  { start: 6.5, end: 8, speaker: 0, text: 'Peki.' },
]

describe('parseSegments', () => {
  it('keeps valid segments in time order and drops anything malformed', () => {
    expect(
      parseSegments([
        segments[2],
        { start: 'x', end: 1, speaker: 0, text: 'bozuk' },
        segments[0],
        { start: 9, end: 9.5, speaker: null, text: '   ' },
      ]),
    ).toEqual([segments[0], segments[2]])
  })

  it('returns nothing for a value that is not a list', () => {
    expect(parseSegments(null)).toEqual([])
    expect(parseSegments({ start: 0 })).toEqual([])
  })
})

describe('speakerTurns', () => {
  it('joins consecutive pieces from the same speaker into one turn', () => {
    expect(speakerTurns(segments)).toEqual([
      { start: 0, end: 2.5, speaker: 0, text: 'Günaydın Kaan, rapora bakabildin mi?' },
      { start: 3, end: 6, speaker: 1, text: 'Baktım, iade oranı artmış.' },
      { start: 6.5, end: 8, speaker: 0, text: 'Peki.' },
    ])
  })

  it('does not change the segments it was given', () => {
    const copy = structuredClone(segments)
    speakerTurns(copy)
    expect(copy).toEqual(segments)
  })
})

describe('speakers', () => {
  it('shows names only when more than one speaker was told apart', () => {
    expect(hasSeveralSpeakers(segments)).toBe(true)
    expect(hasSeveralSpeakers([segments[0]!, segments[1]!])).toBe(false)
    expect(hasSeveralSpeakers([{ ...segments[0]!, speaker: null }])).toBe(false)
  })

  it('numbers speakers from 1', () => {
    expect(speakerLabel(0)).toBe('Konuşmacı 1')
    expect(speakerLabel(2)).toBe('Konuşmacı 3')
    expect(speakerLabel(null)).toBeNull()
  })
})

describe('activeTurnIndex', () => {
  const turns = speakerTurns(segments)

  it('finds the turn playing at a moment', () => {
    expect(activeTurnIndex(turns, 0)).toBe(0)
    expect(activeTurnIndex(turns, 2.8)).toBe(0)
    expect(activeTurnIndex(turns, 3)).toBe(1)
    expect(activeTurnIndex(turns, 100)).toBe(2)
  })

  it('is -1 before the first turn starts', () => {
    expect(activeTurnIndex([{ start: 1, end: 2, speaker: 0, text: 'a' }], 0.5)).toBe(-1)
  })
})
