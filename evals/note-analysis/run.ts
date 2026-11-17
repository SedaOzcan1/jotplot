/**
 * AI quality check for note analysis (T1.3). Calls the real Claude API, so it costs money
 * (about $0.02 for a full run with Claude Haiku 5.5) and never runs in CI.
 *
 *   npm run eval:ai                 all cases, 3 runs each
 *   npm run eval:ai -- --runs 1     one run each
 *   npm run eval:ai -- work-classic only the named cases
 *
 * Reads ANTHROPIC_API_KEY from supabase/functions/.env (git-ignored) and NOTE_ANALYSIS_MODEL if
 * set. Detailed results are written to evals/note-analysis/results/ (git-ignored).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import {
  analyzeNote,
  type AnalyzeNoteResult,
  resolveAnalysisModel,
} from '../../supabase/functions/_shared/note-analysis.ts'
import { EVAL_CASES, EVAL_TODAY, type EvalCase } from './cases.ts'
import { type CheckResult, gradeAnalysis } from './grade.ts'

const RESULTS_DIR = 'evals/note-analysis/results'
const CONCURRENCY = 3

interface RunResult {
  caseId: string
  run: number
  seconds: number
  costUsd: number
  error?: string
  checks: CheckResult[]
  answer?: AnalyzeNoteResult['analysis']
}

function parseArgs(argv: string[]) {
  let runs = 3
  const ids: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--runs') runs = Number(argv[++i])
    else ids.push(argv[i]!)
  }
  if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive whole number')
  const unknown = ids.filter((id) => !EVAL_CASES.some((testCase) => testCase.id === id))
  if (unknown.length) throw new Error(`Unknown case: ${unknown.join(', ')}`)
  return { runs, cases: ids.length ? EVAL_CASES.filter((c) => ids.includes(c.id)) : EVAL_CASES }
}

async function runOne(
  client: Anthropic,
  testCase: EvalCase,
  run: number,
  model: ReturnType<typeof resolveAnalysisModel>,
): Promise<RunResult> {
  const started = performance.now()
  try {
    const result = await analyzeNote(client, {
      text: testCase.text,
      mode: testCase.mode,
      model,
      today: EVAL_TODAY,
    })
    const seconds = (performance.now() - started) / 1000
    if (!result.analysis) {
      return {
        caseId: testCase.id,
        run,
        seconds,
        costUsd: result.usage.costUsd,
        error: result.error?.code ?? 'no_analysis',
        checks: [],
      }
    }
    return {
      caseId: testCase.id,
      run,
      seconds,
      costUsd: result.usage.costUsd,
      checks: gradeAnalysis(testCase, result.analysis),
      answer: result.analysis,
    }
  } catch (error) {
    return {
      caseId: testCase.id,
      run,
      seconds: (performance.now() - started) / 1000,
      costUsd: 0,
      error: error instanceof Error ? error.message : String(error),
      checks: [],
    }
  }
}

async function runAll<T>(jobs: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  let next = 0
  async function worker() {
    while (next < jobs.length) {
      const index = next++
      results[index] = await jobs[index]!()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker))
  return results
}

const passed = (result: RunResult) => !result.error && result.checks.every((c) => c.pass)

async function main() {
  const { runs, cases } = parseArgs(process.argv.slice(2))
  try {
    process.loadEnvFile('supabase/functions/.env')
  } catch {
    // The key may also come from the environment.
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is missing; add it to supabase/functions/.env')
  }
  const model = resolveAnalysisModel(process.env.NOTE_ANALYSIS_MODEL)
  const client = new Anthropic()

  console.log(`Model: ${model} · ${cases.length} not × ${runs} tekrar · bugün: ${EVAL_TODAY}\n`)
  const jobs = cases.flatMap((testCase) =>
    Array.from({ length: runs }, (_, run) => () => runOne(client, testCase, run + 1, model)),
  )
  const results = await runAll(jobs, CONCURRENCY)

  let failedCases = 0
  for (const testCase of cases) {
    const caseResults = results.filter((r) => r.caseId === testCase.id)
    const ok = caseResults.filter(passed).length
    const mark = ok === caseResults.length ? '✓' : '✗'
    if (ok !== caseResults.length) failedCases++
    const seconds = Math.max(...caseResults.map((r) => r.seconds)).toFixed(1)
    console.log(
      `${mark} ${testCase.id.padEnd(22)} ${ok}/${caseResults.length} geçti · en uzun ${seconds} sn · ${testCase.purpose}`,
    )
    for (const result of caseResults) {
      if (result.error) console.log(`    tekrar ${result.run}: HATA ${result.error}`)
      for (const failed of result.checks.filter((c) => !c.pass)) {
        const tag = failed.critical ? 'KRİTİK ' : ''
        console.log(`    tekrar ${result.run}: ${tag}${failed.name}: ${failed.detail}`)
      }
    }
  }

  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0)
  const critical = results.flatMap((r) => r.checks).filter((c) => c.critical && !c.pass).length
  console.log(
    `\n${cases.length - failedCases}/${cases.length} not her tekrarda geçti · ${critical} kritik hata · toplam maliyet $${totalCost.toFixed(4)}`,
  )

  mkdirSync(RESULTS_DIR, { recursive: true })
  const file = `${RESULTS_DIR}/${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(file, JSON.stringify({ model, today: EVAL_TODAY, runs, results }, null, 2))
  console.log(`Ayrıntılar: ${file}`)

  process.exitCode = failedCases ? 1 : 0
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
