import { describe, expect, it } from 'vitest'
import { STT_CASES } from '../../evals/stt/cases'
import {
  parseDeepgram,
  parseDiarized,
  parseGptTranscribe,
  parseWhisper,
} from '../../evals/stt/providers'
import {
  missingTerms,
  normalizeWords,
  numberToWords,
  scoreSpeakers,
  wordErrorRate,
} from '../../evals/stt/score'

describe('numberToWords', () => {
  it.each([
    [0, 'sıfır'],
    [8, 'sekiz'],
    [12, 'on iki'],
    [100, 'yüz'],
    [1000, 'bin'],
    [1200, 'bin iki yüz'],
    [2026, 'iki bin yirmi altı'],
    [35000, 'otuz beş bin'],
    [42000, 'kırk iki bin'],
    [1_500_000, 'bir milyon beş yüz bin'],
  ])('writes %i as "%s"', (number, words) => {
    expect(numberToWords(number).join(' ')).toBe(words)
  })
})

describe('normalizeWords', () => {
  it('treats digits and spelled-out numbers the same', () => {
    expect(
      normalizeWords('Bütçe 35.000 liradan 42000 liraya çıktı, puan 4,1 ya da 4.1 ve %8 artış.'),
    ).toEqual(
      normalizeWords(
        'Bütçe otuz beş bin liradan kırk iki bin liraya çıktı puan dört virgül bir ya da dört virgül bir ve yüzde sekiz artış',
      ),
    )
  })

  it('spells out ordinals and keeps suffixes on numbers', () => {
    expect(normalizeWords("5. haftada, 17 Aralık’ta ve 23'te")).toEqual([
      'beşinci',
      'haftada',
      'on',
      'yedi',
      'aralıkta',
      've',
      'yirmi',
      'üçte',
    ])
  })

  it('uses Turkish lowercase and ignores circumflexes, apostrophes, and hyphens', () => {
    expect(normalizeWords("İZMİR'deki şikâyet, e-posta ve red-black")).toEqual([
      'izmirdeki',
      'şikayet',
      'e',
      'posta',
      've',
      'red',
      'black',
    ])
  })
})

describe('wordErrorRate', () => {
  it('is zero when only formatting differs', () => {
    expect(wordErrorRate('Vize sınavı yirmi üç Aralık’ta.', 'vize sınavı 23 aralıkta')).toBe(0)
  })

  it('counts substitutions, deletions, and insertions', () => {
    // One wrong word, one missing word, and one extra word over four reference words.
    expect(
      wordErrorRate('Ece görselleri yarın hazırlayacak', 'Ecem görselleri hazırlayacak tamam'),
    ).toBe(3 / 4)
  })

  it('accepts a capital I for İ so English words are not marked wrong', () => {
    expect(wordErrorRate('İnfluencer ve İzmir', 'Influencer ve Izmir')).toBe(0)
  })

  it('still counts a lowercase ı where the word needs i', () => {
    expect(wordErrorRate('iş birliği', 'ış birliği')).toBe(1 / 2)
  })
})

describe('missingTerms', () => {
  it('finds terms regardless of case and punctuation', () => {
    expect(
      missingTerms(
        ['İzmir', 'red black', 'Barış'],
        'izmir ekibi Red-Black tree anlattı. Baris geldi',
      ),
    ).toEqual(['Barış'])
  })

  it('does not count a term that only appears inside another word', () => {
    expect(missingTerms(['Ece'], 'Hepimiz gidecek')).toEqual(['Ece'])
  })
})

describe('scoreSpeakers', () => {
  const turns = [
    { speaker: 'A', text: 'Günaydın Kaan nasılsın' },
    { speaker: 'B', text: 'İyiyim teşekkürler' },
    { speaker: 'A', text: 'Rapor hazır mı' },
  ]
  const words = (labels: string[]) =>
    ['Günaydın', 'Kaan,', 'nasılsın?', 'İyiyim,', 'teşekkürler.', 'Rapor', 'hazır', 'mı?'].map(
      (word, index) => ({ word, speaker: labels[index]! }),
    )

  it('accepts any provider labels when the speakers are split correctly', () => {
    expect(scoreSpeakers(turns, words(['1', '1', '1', '0', '0', '1', '1', '1']))).toEqual({
      speakers: 2,
      wordAccuracy: 1,
      turnsCorrect: 3,
      turns: 3,
    })
  })

  it('loses the turns that went to the wrong speaker', () => {
    expect(scoreSpeakers(turns, words(['0', '0', '0', '1', '1', '1', '1', '1']))).toMatchObject({
      turnsCorrect: 2,
      wordAccuracy: 5 / 8,
    })
  })

  it('does not reward finding one speaker for everyone', () => {
    const score = scoreSpeakers(turns, words(Array(8).fill('0')))
    expect(score.speakers).toBe(1)
    expect(score.turnsCorrect).toBe(2)
    expect(score.wordAccuracy).toBe(6 / 8)
  })
})

describe('provider responses', () => {
  it('reads a Whisper transcription with word and segment times', () => {
    expect(
      parseWhisper({
        text: 'Vize sınavı yirmi üç Aralık’ta.',
        duration: 2.4,
        words: [{ word: 'Vize', start: 0, end: 0.4 }],
        segments: [{ id: 0, start: 0, end: 2.4, text: 'Vize sınavı yirmi üç Aralık’ta.' }],
      }),
    ).toEqual({
      text: 'Vize sınavı yirmi üç Aralık’ta.',
      durationSeconds: 2.4,
      words: [{ word: 'Vize' }],
      wordTimestamps: true,
      segments: 1,
    })
  })

  it('reads a gpt-transcribe answer, which has no times', () => {
    expect(
      parseGptTranscribe({
        text: 'Vize sınavı 23 Aralık’ta.',
        languages: [{ code: 'tr' }],
        usage: { type: 'duration', seconds: 3 },
      }),
    ).toEqual({
      text: 'Vize sınavı 23 Aralık’ta.',
      durationSeconds: 3,
      words: [{ word: 'Vize' }, { word: 'sınavı' }, { word: '23' }, { word: 'Aralık’ta.' }],
      wordTimestamps: false,
      segments: 0,
    })
  })

  it('gives every word of a diarized segment its speaker', () => {
    const transcript = parseDiarized({
      text: 'Günaydın Kaan. İyiyim.',
      task: 'transcribe',
      duration: 2,
      segments: [
        {
          type: 'transcript.text.segment',
          id: 'seg_0',
          text: ' Günaydın Kaan.',
          speaker: 'A',
          start: 0,
          end: 1,
        },
        {
          type: 'transcript.text.segment',
          id: 'seg_1',
          text: ' İyiyim.',
          speaker: 'B',
          start: 1,
          end: 2,
        },
      ],
    })
    expect(transcript.words).toEqual([
      { word: 'Günaydın', speaker: 'A' },
      { word: 'Kaan.', speaker: 'A' },
      { word: 'İyiyim.', speaker: 'B' },
    ])
    expect(transcript).toMatchObject({ durationSeconds: 2, wordTimestamps: false, segments: 2 })
  })

  it('reads a Deepgram transcription with speakers', () => {
    const transcript = parseDeepgram({
      metadata: { duration: 1.5 },
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: 'Günaydın Kaan.',
                words: [
                  { word: 'günaydın', punctuated_word: 'Günaydın', start: 0, end: 0.5, speaker: 0 },
                  { word: 'kaan', punctuated_word: 'Kaan.', start: 0.6, end: 1, speaker: 1 },
                ],
              },
            ],
          },
        ],
        utterances: [{ start: 0, end: 1 }],
      },
    })
    expect(transcript.words.map((w) => [w.word, w.speaker])).toEqual([
      ['Günaydın', '0'],
      ['Kaan.', '1'],
    ])
    expect(transcript).toMatchObject({ durationSeconds: 1.5, wordTimestamps: true, segments: 1 })
  })

  it('rejects an answer without a transcript', () => {
    expect(() => parseDeepgram({ metadata: { duration: 1 }, results: { channels: [] } })).toThrow()
  })
})

describe('stt cases', () => {
  it('have unique ids and file prefixes', () => {
    expect(new Set(STT_CASES.map((c) => c.id)).size).toBe(STT_CASES.length)
    expect(new Set(STT_CASES.map((c) => c.filePrefix)).size).toBe(STT_CASES.length)
  })

  it('contain every key term in their own script', () => {
    for (const testCase of STT_CASES) {
      const script = testCase.turns.map((turn) => turn.text).join(' ')
      expect(missingTerms(testCase.keyTerms, script), testCase.id).toEqual([])
    }
  })
})
