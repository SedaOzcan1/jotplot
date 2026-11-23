/**
 * Speech-to-text comparison (T2.1). Sends each recording to every provider and scores the
 * transcripts against the scripts in cases.ts. Calls the real APIs, so it costs money (well under
 * $0.10 for three short recordings) and never runs in CI.
 *
 *   npm run eval:stt                      every recording, every provider
 *   npm run eval:stt -- deepgram-nova-3   only the named providers or cases
 *   npm run eval:stt -- --dir some/folder recordings from another folder
 *
 * Reads OPENAI_API_KEY and DEEPGRAM_API_KEY from supabase/functions/.env (git-ignored).
 * Recordings and results stay in git-ignored folders because they hold voices and transcripts.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { STT_CASES, type SttCase } from './cases.ts'
import { createProviders, type Provider, type Transcript } from './providers.ts'
import { missingTerms, scoreSpeakers, type SpeakerScore, wordErrorRate } from './score.ts'

const RESULTS_DIR = 'evals/stt/results'

const AUDIO_TYPES: Record<string, string> = {
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
}

interface Result {
  caseId: string
  providerId: string
  seconds: number
  error?: string
  wer?: number
  missingTerms?: string[]
  speakers?: SpeakerScore
  wordTimestamps?: boolean
  segments?: number
  costUsd?: number
  transcript?: Transcript
}

function parseArgs(argv: string[]) {
  let dir = 'evals/stt/recordings'
  const names: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') dir = argv[++i]!
    else names.push(argv[i]!)
  }
  return { dir, names }
}

function findRecording(dir: string, testCase: SttCase) {
  let files: string[]
  try {
    files = readdirSync(dir)
  } catch {
    return undefined
  }
  const file = files
    .filter((name) => name.startsWith(testCase.filePrefix))
    .find((name) => extname(name).toLowerCase() in AUDIO_TYPES)
  return file ? join(dir, file) : undefined
}

async function runOne(provider: Provider, testCase: SttCase, path: string): Promise<Result> {
  const audio = new Blob([readFileSync(path)], {
    type: AUDIO_TYPES[extname(path).toLowerCase()],
  })
  const started = performance.now()
  const base = { caseId: testCase.id, providerId: provider.id }
  try {
    const transcript = await provider.transcribe(audio, path.split('/').at(-1)!)
    const reference = testCase.turns.map((turn) => turn.text).join(' ')
    const labelled = transcript.words.filter((word) => word.speaker !== undefined)
    return {
      ...base,
      seconds: (performance.now() - started) / 1000,
      wer: wordErrorRate(reference, transcript.text),
      missingTerms: missingTerms(testCase.keyTerms, transcript.text),
      speakers: labelled.length
        ? scoreSpeakers(
            testCase.turns,
            labelled.map((word) => ({ word: word.word, speaker: word.speaker! })),
          )
        : undefined,
      wordTimestamps: transcript.wordTimestamps,
      segments: transcript.segments,
      costUsd: (transcript.durationSeconds / 60) * provider.usdPerMinute,
      transcript,
    }
  } catch (error) {
    return {
      ...base,
      seconds: (performance.now() - started) / 1000,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const percent = (value: number) => `%${(value * 100).toFixed(1)}`

function describe(result: Result, testCase: SttCase): string {
  if (result.error) return `HATA ${result.error}`
  const parts = [
    `hata oranı ${percent(result.wer!)}`,
    result.missingTerms!.length
      ? `eksik terim: ${result.missingTerms!.join(', ')}`
      : `terimler ${testCase.keyTerms.length}/${testCase.keyTerms.length}`,
  ]
  if (result.speakers) {
    const s = result.speakers
    parts.push(
      `${s.speakers} konuşmacı · sırada ${s.turnsCorrect}/${s.turns} doğru · kelimede ${percent(s.wordAccuracy)}`,
    )
  } else if (testCase.turns.length > 1) {
    parts.push('konuşmacı ayrımı yok')
  }
  parts.push(
    `zaman: ${[result.wordTimestamps && 'kelime', result.segments && `${result.segments} bölüm`].filter(Boolean).join(' + ') || 'yok'}`,
    `${result.seconds.toFixed(1)} sn`,
    `$${result.costUsd!.toFixed(4)}`,
  )
  return parts.join(' · ')
}

async function main() {
  const { dir, names } = parseArgs(process.argv.slice(2))
  try {
    process.loadEnvFile('supabase/functions/.env')
  } catch {
    // The keys may also come from the environment.
  }
  const available = createProviders({
    openai: process.env.OPENAI_API_KEY,
    deepgram: process.env.DEEPGRAM_API_KEY,
  })
  if (!available.length) {
    throw new Error(
      'No provider to run; add OPENAI_API_KEY or DEEPGRAM_API_KEY to supabase/functions/.env',
    )
  }
  const providerNames = names.filter((name) => available.some((p) => p.id === name))
  const caseNames = names.filter((name) => STT_CASES.some((c) => c.id === name))
  const unknown = names.filter((name) => !providerNames.includes(name) && !caseNames.includes(name))
  if (unknown.length) throw new Error(`Unknown provider or case: ${unknown.join(', ')}`)
  const providers = providerNames.length
    ? available.filter((p) => providerNames.includes(p.id))
    : available
  const cases = caseNames.length ? STT_CASES.filter((c) => caseNames.includes(c.id)) : STT_CASES

  console.log(`Servisler: ${providers.map((p) => p.label).join(', ')} · kayıtlar: ${dir}\n`)
  const results: Result[] = []
  for (const testCase of cases) {
    const path = findRecording(dir, testCase)
    console.log(`${testCase.filePrefix} ${testCase.purpose}`)
    if (!path) {
      console.log(`    kayıt yok: ${dir}/${testCase.filePrefix}*\n`)
      continue
    }
    const caseResults = await Promise.all(providers.map((p) => runOne(p, testCase, path)))
    for (const [index, result] of caseResults.entries()) {
      console.log(`    ${providers[index]!.label.padEnd(22)} ${describe(result, testCase)}`)
    }
    console.log()
    results.push(...caseResults)
  }

  if (!results.length) {
    process.exitCode = 1
    return
  }
  console.log('Toplam')
  for (const provider of providers) {
    const mine = results.filter((r) => r.providerId === provider.id && !r.error)
    const wer = mine.reduce((sum, r) => sum + r.wer!, 0) / (mine.length || 1)
    const cost = mine.reduce((sum, r) => sum + r.costUsd!, 0)
    const errors = results.filter((r) => r.providerId === provider.id && r.error).length
    console.log(
      `    ${provider.label.padEnd(22)} ortalama hata oranı ${percent(wer)} · $${cost.toFixed(4)} · ${provider.usdPerMinute} $/dk${errors ? ` · ${errors} hata` : ''}${provider.shutdown ? ` · kapanış ${provider.shutdown}` : ''}`,
    )
  }

  mkdirSync(RESULTS_DIR, { recursive: true })
  const file = `${RESULTS_DIR}/${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(file, JSON.stringify({ dir, results }, null, 2))
  console.log(`\nAyrıntılar ve transkriptler: ${file}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
