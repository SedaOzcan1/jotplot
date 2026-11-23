import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  billableMinutes,
  parseDeepgramResponse,
  type Transcript,
  TranscriptionError,
  transcribeWithDeepgram,
  transcriptionCostUsd,
} from '../../supabase/functions/_shared/transcription'
import {
  type AudioNote,
  createHandler,
  type TranscribeAudioDeps,
} from '../../supabase/functions/transcribe-audio/handler'

const SOURCE_ID = 'bbbbbbbb-0000-4000-8000-000000000001'

/** A synthetic Deepgram answer for a two-person exchange. */
function deepgramAnswer(utterances = true) {
  return {
    metadata: { duration: 75.5 },
    results: {
      channels: [{ alternatives: [{ transcript: 'Günaydın Kaan. Günaydın, rapor hazır.' }] }],
      ...(utterances
        ? {
            utterances: [
              { start: 0, end: 1.2, speaker: 0, transcript: 'Günaydın Kaan.' },
              { start: 1.5, end: 3, speaker: 1, transcript: ' Günaydın, rapor hazır. ' },
            ],
          }
        : {}),
    },
  }
}

describe('parseDeepgramResponse', () => {
  it('keeps each stretch of speech with its speaker and times', () => {
    expect(parseDeepgramResponse(deepgramAnswer())).toEqual({
      text: 'Günaydın Kaan.\nGünaydın, rapor hazır.',
      language: 'tr',
      durationSec: 75.5,
      segments: [
        { start: 0, end: 1.2, speaker: 0, text: 'Günaydın Kaan.' },
        { start: 1.5, end: 3, speaker: 1, text: 'Günaydın, rapor hazır.' },
      ],
    })
  })

  it('joins pieces from the same speaker into one line', () => {
    const answer = deepgramAnswer()
    answer.results.utterances!.splice(1, 0, {
      start: 1.2,
      end: 1.4,
      speaker: 0,
      transcript: 'Rapor hazır mı?',
    })
    expect(parseDeepgramResponse(answer).text).toBe(
      'Günaydın Kaan. Rapor hazır mı?\nGünaydın, rapor hazır.',
    )
  })

  it('falls back to the plain transcript when there are no utterances', () => {
    const transcript = parseDeepgramResponse(deepgramAnswer(false))
    expect(transcript.text).toBe('Günaydın Kaan. Günaydın, rapor hazır.')
    expect(transcript.segments).toEqual([])
  })

  it('reports a recording without speech', () => {
    const silent = {
      metadata: { duration: 4 },
      results: { channels: [{ alternatives: [{ transcript: '' }] }], utterances: [] },
    }
    expect(() => parseDeepgramResponse(silent)).toThrow(
      expect.objectContaining({ code: 'no_speech' }),
    )
  })

  it('rejects an answer with an unexpected shape', () => {
    expect(() => parseDeepgramResponse({ results: {} })).toThrow(
      expect.objectContaining({ code: 'stt_invalid_output' }),
    )
  })
})

describe('minutes and cost', () => {
  it('rounds minutes up to two decimals and prices them at the Nova-3 rate', () => {
    expect(billableMinutes(60)).toBe(1)
    expect(billableMinutes(75.5)).toBe(1.26)
    expect(transcriptionCostUsd(600)).toBe(0.043)
  })
})

describe('transcribeWithDeepgram', () => {
  const audio = new Blob([new Uint8Array(10)], { type: 'audio/webm' })

  it('sends the recording as Turkish with speakers and utterances', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(deepgramAnswer()))
    await transcribeWithDeepgram({ apiKey: 'test-key', audio, fetch })

    const [url, init] = fetch.mock.calls[0]!
    const params = new URL(url).searchParams
    expect(Object.fromEntries(params)).toMatchObject({
      model: 'nova-3',
      language: 'tr',
      diarize: 'true',
      utterances: 'true',
    })
    expect(init.headers).toEqual({ Authorization: 'Token test-key', 'Content-Type': 'audio/webm' })
    expect(init.body).toBe(audio)
  })

  it.each([
    [429, 'stt_unavailable'],
    [503, 'stt_unavailable'],
    [400, 'stt_rejected'],
  ])('turns HTTP %i into %s', async (status, code) => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"err_msg":"x"}', { status }))
    await expect(transcribeWithDeepgram({ apiKey: 'k', audio, fetch })).rejects.toMatchObject({
      code,
    })
  })

  it('treats a network failure as temporary', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await expect(transcribeWithDeepgram({ apiKey: 'k', audio, fetch })).rejects.toMatchObject({
      code: 'stt_unavailable',
    })
  })
})

describe('transcribe-audio', () => {
  const transcript: Transcript = parseDeepgramResponse(deepgramAnswer())
  let note: AudioNote | null
  let background: Promise<void>[]
  let deps: TranscribeAudioDeps & {
    startTranscription: ReturnType<typeof vi.fn>
    minutesRemaining: ReturnType<typeof vi.fn>
    downloadAudio: ReturnType<typeof vi.fn>
    transcribe: ReturnType<typeof vi.fn>
    saveTranscript: ReturnType<typeof vi.fn>
    recordUsage: ReturnType<typeof vi.fn>
    setStatus: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    note = {
      id: SOURCE_ID,
      type: 'audio',
      status: 'pending',
      storage_path: `user-1/${SOURCE_ID}.webm`,
    }
    background = []
    const startTranscription = vi.fn().mockResolvedValue(true)
    deps = {
      userScope: async (authorization) =>
        authorization === 'Bearer valid'
          ? { userId: 'user-1', loadNote: async () => note, startTranscription }
          : null,
      startTranscription,
      minutesRemaining: vi.fn().mockResolvedValue(30),
      downloadAudio: vi.fn().mockResolvedValue(new Blob(['ses'], { type: 'audio/webm' })),
      transcribe: vi.fn().mockResolvedValue(transcript),
      saveTranscript: vi.fn().mockResolvedValue(undefined),
      recordUsage: vi.fn().mockResolvedValue(undefined),
      setStatus: vi.fn().mockResolvedValue(undefined),
      runInBackground: (work) => background.push(work),
    }
  })

  async function post(body: unknown, authorization = 'Bearer valid') {
    const response = await createHandler(deps)(
      new Request('http://localhost/functions/v1/transcribe-audio', {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
    await Promise.all(background)
    return response
  }

  async function errorCode(response: Response) {
    return ((await response.json()) as { error: { code: string } }).error.code
  }

  it('answers the browser’s CORS preflight', async () => {
    const response = await createHandler(deps)(
      new Request('http://localhost', { method: 'OPTIONS' }),
    )
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('needs a signed-in user and a valid note id', async () => {
    expect(await errorCode(await post({ sourceId: SOURCE_ID }, 'Bearer nope'))).toBe(
      'not_signed_in',
    )
    expect(await errorCode(await post({ sourceId: 'not-a-uuid' }))).toBe('invalid_request')
  })

  it('answers at once and transcribes in the background', async () => {
    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ sourceId: SOURCE_ID, status: 'processing' })
    expect(deps.downloadAudio).toHaveBeenCalledWith(`user-1/${SOURCE_ID}.webm`)
    expect(deps.saveTranscript).toHaveBeenCalledWith('user-1', SOURCE_ID, transcript)
    expect(deps.recordUsage).toHaveBeenCalledWith('user-1', 1.26, transcriptionCostUsd(75.5))
    expect(deps.setStatus).toHaveBeenCalledWith(SOURCE_ID, 'ready')
  })

  it('refuses notes that are missing or not recordings', async () => {
    note = null
    expect(await errorCode(await post({ sourceId: SOURCE_ID }))).toBe('note_not_found')
    note = { id: SOURCE_ID, type: 'text', status: 'pending', storage_path: null }
    expect(await errorCode(await post({ sourceId: SOURCE_ID }))).toBe('unsupported_note')
    expect(deps.transcribe).not.toHaveBeenCalled()
  })

  it('stops at the monthly minute limit and keeps the note pending', async () => {
    deps.minutesRemaining.mockResolvedValue(0)
    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(429)
    expect(await errorCode(response)).toBe('limit_reached')
    expect(deps.startTranscription).not.toHaveBeenCalled()
    expect(deps.setStatus).not.toHaveBeenCalled()
  })

  it('does not transcribe a note twice', async () => {
    deps.startTranscription.mockResolvedValue(false)
    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(202)
    expect(deps.transcribe).not.toHaveBeenCalled()
  })

  it('reports a note that is already transcribed', async () => {
    note!.status = 'ready'
    const response = await post({ sourceId: SOURCE_ID })

    expect(await response.json()).toEqual({ sourceId: SOURCE_ID, status: 'ready' })
    expect(deps.transcribe).not.toHaveBeenCalled()
  })

  it('marks the note as failed and counts no minutes when transcription fails', async () => {
    deps.transcribe.mockRejectedValue(new TranscriptionError('no_speech'))
    await post({ sourceId: SOURCE_ID })

    expect(deps.setStatus).toHaveBeenCalledWith(SOURCE_ID, 'failed')
    expect(deps.saveTranscript).not.toHaveBeenCalled()
    expect(deps.recordUsage).not.toHaveBeenCalled()
  })

  it('still delivers the transcript when recording the usage fails', async () => {
    deps.recordUsage.mockRejectedValue(new Error('database down'))
    await post({ sourceId: SOURCE_ID })

    expect(deps.setStatus).toHaveBeenCalledWith(SOURCE_ID, 'ready')
  })
})
