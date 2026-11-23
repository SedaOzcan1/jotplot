import { z } from 'zod'

/**
 * Embedding providers compared for T3.2. Each one turns texts into vectors through the real API;
 * answers are checked with Zod. Prices are list prices per million tokens, checked on 2026-11-24.
 */

export interface EmbeddingResult {
  vectors: number[][]
  tokens: number
}

export interface EmbeddingProvider {
  id: string
  label: string
  usdPerMillionTokens: number
  dimensions: number
  embed(texts: string[], purpose: 'document' | 'query'): Promise<EmbeddingResult>
}

const responseSchema = z.object({
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })).min(1),
  usage: z.object({ total_tokens: z.number().int() }),
})

/** OpenAI and Voyage answer in the same shape; vectors are put back in input order. */
export function parseEmbeddings(json: unknown, count: number): EmbeddingResult {
  const data = responseSchema.parse(json)
  if (data.data.length !== count) {
    throw new Error(`Expected ${count} embeddings, got ${data.data.length}`)
  }
  const vectors = [...data.data].sort((a, b) => a.index - b.index).map((item) => item.embedding)
  return { vectors, tokens: data.usage.total_tokens }
}

async function post(url: string, key: string, body: unknown, label: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${label} ${response.status}: ${(await response.text()).slice(0, 300)}`)
  }
  return response.json()
}

function openAi(key: string, model: string, label: string, price: number, dimensions: number) {
  return {
    id: `openai-${model}`,
    label,
    usdPerMillionTokens: price,
    dimensions,
    async embed(texts: string[]) {
      const json = await post(
        'https://api.openai.com/v1/embeddings',
        key,
        { model, input: texts, dimensions },
        label,
      )
      return parseEmbeddings(json, texts.length)
    },
  } satisfies EmbeddingProvider
}

function voyage(key: string, model: string, label: string, price: number) {
  return {
    id: model,
    label,
    usdPerMillionTokens: price,
    dimensions: 1024,
    // Voyage embeds questions and passages slightly differently for better retrieval.
    async embed(texts: string[], purpose: 'document' | 'query') {
      const json = await post(
        'https://api.voyageai.com/v1/embeddings',
        key,
        { model, input: texts, input_type: purpose, output_dimension: 1024 },
        label,
      )
      return parseEmbeddings(json, texts.length)
    },
  } satisfies EmbeddingProvider
}

export function createProviders(keys: { openai?: string; voyage?: string }): EmbeddingProvider[] {
  const providers: EmbeddingProvider[] = []
  if (keys.openai) {
    providers.push(
      openAi(keys.openai, 'text-embedding-3-small', 'OpenAI 3-small', 0.02, 1536),
      // Shortened to 1024 so it fits a pgvector HNSW index (at most 2000 dimensions).
      openAi(keys.openai, 'text-embedding-3-large', 'OpenAI 3-large', 0.13, 1024),
    )
  }
  if (keys.voyage) {
    providers.push(
      voyage(keys.voyage, 'voyage-4-lite', 'Voyage 4 lite', 0.02),
      voyage(keys.voyage, 'voyage-4', 'Voyage 4', 0.06),
      voyage(keys.voyage, 'voyage-4-large', 'Voyage 4 large', 0.12),
    )
  }
  return providers
}
