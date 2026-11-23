import { z } from 'zod'

/**
 * Transcript segments (T2.5): who spoke when. Saved by the transcribe-audio function as
 * `transcripts.segments`; read defensively because the column is plain JSON.
 */

const segmentSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  speaker: z.number().int().nonnegative().nullable(),
  text: z.string(),
})

export type TranscriptSegment = z.infer<typeof segmentSchema>

/** The valid segments in time order; anything malformed is left out. */
export function parseSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => segmentSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data)
    .filter((segment) => segment.text.trim())
    .sort((a, b) => a.start - b.start)
}

/**
 * Consecutive segments from the same speaker shown as one paragraph, starting at the first one's
 * time. Deepgram splits speech at short pauses, often mid-sentence.
 */
export function speakerTurns(segments: TranscriptSegment[]): TranscriptSegment[] {
  const turns: TranscriptSegment[] = []
  for (const segment of segments) {
    const last = turns.at(-1)
    if (last && last.speaker === segment.speaker) {
      last.end = segment.end
      last.text = `${last.text} ${segment.text.trim()}`
    } else {
      turns.push({ ...segment, text: segment.text.trim() })
    }
  }
  return turns
}

/** True when more than one speaker was told apart, so speaker names are worth showing. */
export function hasSeveralSpeakers(segments: TranscriptSegment[]) {
  return new Set(segments.map((segment) => segment.speaker).filter((s) => s !== null)).size > 1
}

/** "Konuşmacı 1" for Deepgram's speaker 0; null when the speaker is unknown. */
export function speakerLabel(speaker: number | null) {
  return speaker === null ? null : `Konuşmacı ${speaker + 1}`
}

/** The turn playing at `time` seconds, or -1 before the first one. */
export function activeTurnIndex(turns: TranscriptSegment[], time: number) {
  let active = -1
  for (const [index, turn] of turns.entries()) {
    if (turn.start <= time) active = index
    else break
  }
  return active
}
