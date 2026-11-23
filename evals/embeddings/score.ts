/** Retrieval scoring for the embedding comparison: how high the right passage ranks. */

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors have different lengths')
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0
}

/** Passage ids from most to least similar to the question. */
export function rankPassages(question: number[], passages: { id: string; vector: number[] }[]) {
  return passages
    .map((passage) => ({ id: passage.id, score: cosineSimilarity(question, passage.vector) }))
    .sort((a, b) => b.score - a.score)
}

export interface QuestionScore {
  /** 1-based position of the first relevant passage. */
  rank: number
  top1: boolean
  top3: boolean
  /** 1 / rank, averaged into the mean reciprocal rank. */
  reciprocalRank: number
}

export function scoreQuestion(ranking: string[], relevant: string[]): QuestionScore {
  const index = ranking.findIndex((id) => relevant.includes(id))
  const rank = index === -1 ? ranking.length + 1 : index + 1
  return { rank, top1: rank === 1, top3: rank <= 3, reciprocalRank: index === -1 ? 0 : 1 / rank }
}

export function summarize(scores: QuestionScore[]) {
  const share = (pick: (s: QuestionScore) => boolean) =>
    scores.filter(pick).length / (scores.length || 1)
  return {
    top1: share((s) => s.top1),
    top3: share((s) => s.top3),
    mrr: scores.reduce((sum, s) => sum + s.reciprocalRank, 0) / (scores.length || 1),
  }
}
