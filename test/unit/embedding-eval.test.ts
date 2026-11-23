import { describe, expect, it } from 'vitest'
import { PASSAGES, QUESTIONS } from '../../evals/embeddings/cases'
import { parseEmbeddings } from '../../evals/embeddings/providers'
import {
  cosineSimilarity,
  rankPassages,
  scoreQuestion,
  summarize,
} from '../../evals/embeddings/score'

describe('embedding cases', () => {
  it('have unique ids and point only at passages that exist', () => {
    const ids = PASSAGES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length)
    for (const question of QUESTIONS) {
      for (const id of question.relevant) expect(ids, question.id).toContain(id)
    }
  })
})

describe('cosineSimilarity', () => {
  it('is 1 for the same direction, 0 for unrelated, and -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 3])).toBe(0)
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1)
  })

  it('refuses vectors of different lengths', () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow()
  })
})

describe('ranking and scores', () => {
  const passages = [
    { id: 'a', vector: [1, 0] },
    { id: 'b', vector: [0.7, 0.7] },
    { id: 'c', vector: [0, 1] },
  ]

  it('ranks passages by similarity to the question', () => {
    expect(rankPassages([0.1, 1], passages).map((r) => r.id)).toEqual(['c', 'b', 'a'])
  })

  it('scores the position of the first relevant passage', () => {
    expect(scoreQuestion(['c', 'b', 'a'], ['b'])).toEqual({
      rank: 2,
      top1: false,
      top3: true,
      reciprocalRank: 0.5,
    })
    expect(scoreQuestion(['c', 'b', 'a'], ['x']).reciprocalRank).toBe(0)
  })

  it('summarizes as shares and the mean reciprocal rank', () => {
    expect(summarize([scoreQuestion(['a'], ['a']), scoreQuestion(['b', 'c', 'a'], ['a'])])).toEqual(
      { top1: 0.5, top3: 1, mrr: (1 + 1 / 3) / 2 },
    )
  })
})

describe('parseEmbeddings', () => {
  it('puts vectors back in input order and reads the tokens', () => {
    expect(
      parseEmbeddings(
        {
          data: [
            { index: 1, embedding: [0, 1] },
            { index: 0, embedding: [1, 0] },
          ],
          usage: { total_tokens: 12 },
        },
        2,
      ),
    ).toEqual({
      vectors: [
        [1, 0],
        [0, 1],
      ],
      tokens: 12,
    })
  })

  it('rejects an answer with missing vectors', () => {
    expect(() =>
      parseEmbeddings({ data: [{ index: 0, embedding: [1] }], usage: { total_tokens: 1 } }, 2),
    ).toThrow()
  })
})
