/**
 * Scoring for the speech-to-text comparison (T2.1): word error rate, key terms, and speaker
 * labels. Providers write numbers as digits or words ("12" or "on iki"), so both sides are
 * normalized to words before comparing.
 */

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz']
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan']

function belowThousand(n: number): string[] {
  const words: string[] = []
  const hundreds = Math.floor(n / 100)
  if (hundreds) words.push(...(hundreds > 1 ? [ONES[hundreds]!] : []), 'yüz')
  const tens = Math.floor((n % 100) / 10)
  if (tens) words.push(TENS[tens]!)
  if (n % 10) words.push(ONES[n % 10]!)
  return words
}

/** Writes a whole number in Turkish words: 42000 → ["kırk", "iki", "bin"]. */
export function numberToWords(n: number): string[] {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Unsupported number: ${n}`)
  if (n === 0) return ['sıfır']
  const words: string[] = []
  const millions = Math.floor(n / 1_000_000)
  if (millions) words.push(...numberToWords(millions), 'milyon')
  const thousands = Math.floor((n % 1_000_000) / 1000)
  if (thousands) words.push(...(thousands > 1 ? belowThousand(thousands) : []), 'bin')
  words.push(...belowThousand(n % 1000))
  return words
}

/** Ordinal suffixes by the last number word: beş → beşinci. */
const ORDINAL_SUFFIX: Record<string, string> = {
  bir: 'inci',
  iki: 'nci',
  üç: 'üncü',
  dört: 'düncü',
  beş: 'inci',
  altı: 'ncı',
  yedi: 'nci',
  sekiz: 'inci',
  dokuz: 'uncu',
  on: 'uncu',
  yirmi: 'nci',
  otuz: 'uncu',
  kırk: 'ıncı',
  elli: 'nci',
  altmış: 'ıncı',
  yetmiş: 'inci',
  seksen: 'inci',
  doksan: 'ıncı',
  yüz: 'üncü',
  bin: 'inci',
  milyon: 'uncu',
}

function ordinal(words: string[]): string[] {
  const last = words.at(-1)!
  const stem = last === 'dört' ? 'dör' : last
  return [...words.slice(0, -1), stem + ORDINAL_SUFFIX[last]]
}

/** "35.000" and "35000" are the same number; a dot before three digits groups thousands. */
function parseInteger(digits: string): number {
  return Number(digits.replace(/\.(?=\d{3}(?!\d))/g, ''))
}

/**
 * Replaces percentages, decimals, ordinals, and numbers with Turkish words. A dot before one or
 * two digits is a decimal point ("4.1"); before three digits it groups thousands ("35.000").
 */
function spellNumbers(text: string): string {
  return text
    .replace(/%\s?(\d+)/g, (_, n: string) => `yüzde ${numberToWords(Number(n)).join(' ')}`)
    .replace(
      /(\d+)(?:,(\d+)|\.(\d{1,2}))(?!\d)/g,
      (_, whole: string, comma: string | undefined, dot: string | undefined) =>
        `${numberToWords(Number(whole)).join(' ')} virgül ${numberToWords(Number(comma ?? dot)).join(' ')}`,
    )
    .replace(/(\d+)\.(?=\s+\p{Ll})/gu, (_, n: string) =>
      ordinal(numberToWords(Number(n))).join(' '),
    )
    .replace(/\d+(?:\.\d{3})*/g, (digits) => ` ${numberToWords(parseInteger(digits)).join(' ')}`)
}

/**
 * Turns text into comparable words: numbers spelled out, Turkish lowercase, circumflexes and
 * apostrophes removed ("Aralık'ta" → "aralıkta"), other punctuation and hyphens as spaces.
 * A capital I counts as i, so English words such as "Influencer" are not marked wrong; a
 * lowercase ı and i still differ.
 */
export function normalizeWords(text: string): string[] {
  return spellNumbers(text)
    .replace(/I/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .replace(/[’'`]/g, '')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
}

export interface Alignment {
  /** Edits needed to turn the reference into the hypothesis. */
  substitutions: number
  deletions: number
  insertions: number
  /** Pairs of reference and hypothesis word indexes that were matched or substituted. */
  pairs: [number, number][]
}

/** Word-level edit distance with the matched pairs, for WER and speaker scoring. */
export function align(reference: string[], hypothesis: string[]): Alignment {
  const rows = reference.length + 1
  const cols = hypothesis.length + 1
  const cost = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const same = reference[i - 1] === hypothesis[j - 1] ? 0 : 1
      cost[i]![j] = Math.min(
        cost[i - 1]![j - 1]! + same,
        cost[i - 1]![j]! + 1,
        cost[i]![j - 1]! + 1,
      )
    }
  }

  const result: Alignment = { substitutions: 0, deletions: 0, insertions: 0, pairs: [] }
  let i = reference.length
  let j = hypothesis.length
  while (i > 0 || j > 0) {
    const here = cost[i]![j]!
    if (i > 0 && j > 0) {
      const same = reference[i - 1] === hypothesis[j - 1] ? 0 : 1
      if (here === cost[i - 1]![j - 1]! + same) {
        if (same) result.substitutions++
        result.pairs.push([i - 1, j - 1])
        i--
        j--
        continue
      }
    }
    if (i > 0 && here === cost[i - 1]![j]! + 1) {
      result.deletions++
      i--
    } else {
      result.insertions++
      j--
    }
  }
  result.pairs.reverse()
  return result
}

/** Word error rate: edits divided by the number of reference words. */
export function wordErrorRate(reference: string, hypothesis: string): number {
  const ref = normalizeWords(reference)
  const { substitutions, deletions, insertions } = align(ref, normalizeWords(hypothesis))
  return ref.length ? (substitutions + deletions + insertions) / ref.length : 0
}

/** Key terms missing from the transcript; Turkish case and punctuation are ignored. */
export function missingTerms(terms: string[], transcript: string): string[] {
  const text = ` ${normalizeWords(transcript).join(' ')} `
  return terms.filter((term) => !text.includes(` ${normalizeWords(term).join(' ')}`))
}

export interface SpeakerWord {
  word: string
  speaker: string
}

export interface SpeakerScore {
  /** Distinct speakers the provider found. */
  speakers: number
  /** Share of matched words given to the right speaker under the best speaker mapping. */
  wordAccuracy: number
  /** Turns whose words mostly went to the right speaker. */
  turnsCorrect: number
  turns: number
}

/**
 * Compares the provider's speaker labels with who really spoke. Provider labels are arbitrary
 * ("0", "1"), so every one-to-one mapping to the real speakers is tried and the best one counts.
 * A provider that finds extra speakers loses the words it gave them.
 */
export function scoreSpeakers(
  turns: { speaker: string; text: string }[],
  words: SpeakerWord[],
): SpeakerScore {
  const reference = turns.flatMap((turn, turnIndex) =>
    normalizeWords(turn.text).map((word) => ({ word, speaker: turn.speaker, turnIndex })),
  )
  const hypothesis = words.flatMap(({ word, speaker }) =>
    normalizeWords(word).map((token) => ({ word: token, speaker })),
  )
  const { pairs } = align(
    reference.map((w) => w.word),
    hypothesis.map((w) => w.word),
  )

  const realSpeakers = [...new Set(turns.map((turn) => turn.speaker))]
  const found = [...new Set(words.map((word) => word.speaker))]
  if (!pairs.length || !found.length) {
    return { speakers: found.length, wordAccuracy: 0, turnsCorrect: 0, turns: turns.length }
  }

  // How many matched words each provider label shares with each real speaker.
  const shared = new Map<string, number>()
  for (const [r, h] of pairs) {
    const key = `${hypothesis[h]!.speaker}|${reference[r]!.speaker}`
    shared.set(key, (shared.get(key) ?? 0) + 1)
  }
  // Each real speaker gets at most one provider label; try every choice and keep the best.
  const choices = (index: number, used: Set<string>): Map<string, string>[] => {
    if (index === realSpeakers.length) return [new Map()]
    const options = [...found.filter((label) => !used.has(label)), null]
    return options.flatMap((label) =>
      choices(index + 1, label ? new Set([...used, label]) : used).map((rest) =>
        label ? new Map([...rest, [label, realSpeakers[index]!]]) : rest,
      ),
    )
  }
  let best = { correct: -1, mapping: new Map<string, string>() }
  for (const mapping of choices(0, new Set())) {
    let correct = 0
    for (const [label, speaker] of mapping) correct += shared.get(`${label}|${speaker}`) ?? 0
    if (correct > best.correct) best = { correct, mapping }
  }

  let turnsCorrect = 0
  turns.forEach((turn, turnIndex) => {
    const inTurn = pairs.filter(([r]) => reference[r]!.turnIndex === turnIndex)
    const right = inTurn.filter(
      ([, h]) => best.mapping.get(hypothesis[h]!.speaker) === turn.speaker,
    ).length
    if (inTurn.length && right * 2 > inTurn.length) turnsCorrect++
  })

  return {
    speakers: found.length,
    wordAccuracy: best.correct / pairs.length,
    turnsCorrect,
    turns: turns.length,
  }
}
