import { z } from 'zod'

/**
 * Speech-to-text providers compared in T2.1. Each one sends a recording to the real API and
 * turns the answer into the same shape. Responses are checked with Zod so a changed API fails
 * loudly instead of scoring an empty transcript.
 */

export interface Transcript {
  text: string
  /** Audio length in seconds, as reported by the provider. */
  durationSeconds: number
  /** Words in order, with the speaker label when the provider tells speakers apart. */
  words: { word: string; speaker?: string }[]
  /** True when every word has its own start and end time. */
  wordTimestamps: boolean
  /** Longer pieces with start and end times, when the provider returns them. */
  segments: number
}

export interface Provider {
  id: string
  label: string
  /** List price in US dollars per audio minute, checked on 2026-11-23. */
  usdPerMinute: number
  /** Shutdown date announced by the provider, if any. */
  shutdown?: string
  transcribe: (audio: Blob, fileName: string) => Promise<Transcript>
}

async function readJson(response: Response, provider: string): Promise<unknown> {
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300)
    throw new Error(`${provider} ${response.status}: ${body}`)
  }
  return response.json()
}

const whisperSchema = z.object({
  text: z.string(),
  duration: z.number(),
  words: z.array(z.object({ word: z.string(), start: z.number(), end: z.number() })).default([]),
  segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).default([]),
})

export function parseWhisper(json: unknown): Transcript {
  const data = whisperSchema.parse(json)
  return {
    text: data.text,
    durationSeconds: data.duration,
    words: data.words.map(({ word }) => ({ word })),
    wordTimestamps: data.words.length > 0,
    segments: data.segments.length,
  }
}

const gptTranscribeSchema = z.object({
  text: z.string(),
  usage: z.object({ type: z.literal('duration'), seconds: z.number() }),
})

export function parseGptTranscribe(json: unknown): Transcript {
  const data = gptTranscribeSchema.parse(json)
  return {
    text: data.text,
    durationSeconds: data.usage.seconds,
    words: data.text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ word })),
    wordTimestamps: false,
    segments: 0,
  }
}

const diarizedSchema = z.object({
  text: z.string(),
  duration: z.number(),
  segments: z.array(
    z.object({
      text: z.string(),
      speaker: z.string().optional(),
      start: z.number(),
      end: z.number(),
    }),
  ),
})

/** Speakers are given per segment, so every word in a segment gets that segment's speaker. */
export function parseDiarized(json: unknown): Transcript {
  const data = diarizedSchema.parse(json)
  return {
    text: data.text,
    durationSeconds: data.duration,
    words: data.segments.flatMap((segment) =>
      segment.text
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => (segment.speaker ? { word, speaker: segment.speaker } : { word })),
    ),
    wordTimestamps: false,
    segments: data.segments.length,
  }
}

const deepgramSchema = z.object({
  metadata: z.object({ duration: z.number() }),
  results: z.object({
    channels: z
      .array(
        z.object({
          alternatives: z
            .array(
              z.object({
                transcript: z.string(),
                words: z.array(
                  z.object({
                    word: z.string(),
                    punctuated_word: z.string().optional(),
                    start: z.number(),
                    end: z.number(),
                    speaker: z.number().optional(),
                  }),
                ),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
    utterances: z.array(z.object({ start: z.number(), end: z.number() })).optional(),
  }),
})

export function parseDeepgram(json: unknown): Transcript {
  const data = deepgramSchema.parse(json)
  const best = data.results.channels[0]!.alternatives[0]!
  return {
    text: best.transcript,
    durationSeconds: data.metadata.duration,
    words: best.words.map((word) => {
      const text = word.punctuated_word ?? word.word
      return word.speaker === undefined
        ? { word: text }
        : { word: text, speaker: `${word.speaker}` }
    }),
    wordTimestamps: best.words.length > 0,
    segments: data.results.utterances?.length ?? 0,
  }
}

function openAiProvider(
  key: string,
  provider: Omit<Provider, 'transcribe'>,
  fields: [string, string][],
  parse: (json: unknown) => Transcript,
): Provider {
  return {
    ...provider,
    async transcribe(audio, fileName) {
      const form = new FormData()
      form.append('file', audio, fileName)
      for (const [name, value] of fields) form.append(name, value)
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      })
      return parse(await readJson(response, provider.label))
    },
  }
}

export function createProviders(keys: { openai?: string; deepgram?: string }): Provider[] {
  const providers: Provider[] = []

  if (keys.openai) {
    providers.push(
      openAiProvider(
        keys.openai,
        {
          id: 'openai-whisper-1',
          label: 'OpenAI Whisper',
          usdPerMinute: 0.006,
          shutdown: '2027-02-26',
        },
        [
          ['model', 'whisper-1'],
          ['language', 'tr'],
          ['response_format', 'verbose_json'],
          ['timestamp_granularities[]', 'word'],
          ['timestamp_granularities[]', 'segment'],
        ],
        parseWhisper,
      ),
      openAiProvider(
        keys.openai,
        { id: 'openai-gpt-transcribe', label: 'OpenAI gpt-transcribe', usdPerMinute: 0.0045 },
        [
          ['model', 'gpt-transcribe'],
          ['languages[]', 'tr'],
          ['response_format', 'json'],
        ],
        parseGptTranscribe,
      ),
      openAiProvider(
        keys.openai,
        {
          id: 'openai-diarize',
          label: 'OpenAI diarize',
          usdPerMinute: 0.006,
          shutdown: '2027-02-26',
        },
        [
          ['model', 'gpt-4o-transcribe-diarize'],
          ['language', 'tr'],
          ['response_format', 'diarized_json'],
          ['chunking_strategy', 'auto'],
        ],
        parseDiarized,
      ),
    )
  }

  if (keys.deepgram) {
    const key = keys.deepgram
    providers.push({
      id: 'deepgram-nova-3',
      label: 'Deepgram Nova-3',
      usdPerMinute: 0.0043,
      async transcribe(audio) {
        const params = new URLSearchParams({
          model: 'nova-3',
          language: 'tr',
          smart_format: 'true',
          punctuate: 'true',
          diarize: 'true',
          utterances: 'true',
        })
        const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
          method: 'POST',
          headers: { Authorization: `Token ${key}`, 'Content-Type': audio.type },
          body: audio,
        })
        return parseDeepgram(await readJson(response, 'Deepgram'))
      },
    })
  }

  return providers
}
