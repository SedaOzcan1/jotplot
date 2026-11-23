/**
 * Embedding comparison (T3.2 decision). Embeds the synthetic archive and questions in
 * cases.ts with each provider and checks how high the right passage ranks. Calls the real APIs,
 * so it costs a fraction of a cent, and never runs in CI.
 *
 *   npm run eval:embeddings                  every provider with a key
 *   npm run eval:embeddings -- voyage-4      only the named providers
 *
 * Reads OPENAI_API_KEY and VOYAGE_API_KEY from supabase/functions/.env (git-ignored).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { PASSAGES, QUESTIONS } from './cases.ts'
import { createProviders, type EmbeddingProvider } from './providers.ts'
import { rankPassages, scoreQuestion, summarize } from './score.ts'

const RESULTS_DIR = 'evals/embeddings/results'
const percent = (value: number) => `%${Math.round(value * 100)}`

async function evaluate(provider: EmbeddingProvider) {
  const started = performance.now()
  const passages = await provider.embed(
    PASSAGES.map((passage) => passage.text),
    'document',
  )
  const questions = await provider.embed(
    QUESTIONS.map((question) => question.text),
    'query',
  )
  const seconds = (performance.now() - started) / 1000
  const indexed = PASSAGES.map((passage, i) => ({ id: passage.id, vector: passages.vectors[i]! }))

  const perQuestion = QUESTIONS.map((question, i) => {
    const ranking = rankPassages(questions.vectors[i]!, indexed).map((r) => r.id)
    return { question, ranking: ranking.slice(0, 3), ...scoreQuestion(ranking, question.relevant) }
  })
  const tokens = passages.tokens + questions.tokens
  return {
    provider,
    seconds,
    tokens,
    costUsd: (tokens / 1_000_000) * provider.usdPerMillionTokens,
    summary: summarize(perQuestion),
    perQuestion,
  }
}

async function main() {
  const names = process.argv.slice(2)
  try {
    process.loadEnvFile('supabase/functions/.env')
  } catch {
    // The keys may also come from the environment.
  }
  const available = createProviders({
    openai: process.env.OPENAI_API_KEY,
    voyage: process.env.VOYAGE_API_KEY,
  })
  const unknown = names.filter((name) => !available.some((p) => p.id === name))
  if (unknown.length) throw new Error(`Unknown or keyless provider: ${unknown.join(', ')}`)
  const providers = names.length ? available.filter((p) => names.includes(p.id)) : available
  if (!providers.length)
    throw new Error('Add OPENAI_API_KEY or VOYAGE_API_KEY to supabase/functions/.env')

  console.log(`${PASSAGES.length} parça · ${QUESTIONS.length} soru\n`)
  const results = []
  for (const provider of providers) {
    try {
      const result = await evaluate(provider)
      results.push(result)
      const { top1, top3, mrr } = result.summary
      console.log(
        `${provider.label.padEnd(16)} ilk sırada ${percent(top1)} · ilk 3'te ${percent(top3)} · MRR ${mrr.toFixed(2)} · ${provider.dimensions} boyut · ${result.seconds.toFixed(1)} sn · ${provider.usdPerMillionTokens} $/1M token`,
      )
      for (const miss of result.perQuestion.filter((q) => !q.top1)) {
        console.log(
          `    ${miss.question.id} (${miss.question.tests}) → ${miss.rank}. sırada; ilk 3: ${miss.ranking.join(', ')}`,
        )
      }
    } catch (error) {
      console.log(
        `${provider.label.padEnd(16)} HATA ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  mkdirSync(RESULTS_DIR, { recursive: true })
  const file = `${RESULTS_DIR}/${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(
    file,
    JSON.stringify(
      results.map(({ provider, ...rest }) => ({ provider: provider.id, ...rest })),
      null,
      2,
    ),
  )
  console.log(`\nAyrıntılar: ${file}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
