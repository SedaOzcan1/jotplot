# Embedding Comparison (T3.2)

Date: 2026-11-24. Tool: `npm run eval:embeddings` (`evals/embeddings/`). The archive is synthetic: 24 Turkish passages (meeting notes, spoken transcripts, lecture notes, company documents) and 22 questions, each worded differently from the passage that answers it (synonyms, Turkish suffixes, English terms, spoken language). Results stay in a git-ignored folder.

## Results

"Top 1" and "top 3" are the share of questions whose answer ranked first or in the first three. MRR (mean reciprocal rank) is 1.00 when every answer ranks first.

| Model | Top 1 | Top 3 | MRR | Dimensions | Price per 1M tokens |
|---|---|---|---|---|---|
| OpenAI `text-embedding-3-small` | 91% | 95% | 0.94 | 1536 | $0.02 |
| OpenAI `text-embedding-3-large` | 95% | 100% | 0.98 | 1024 (shortened) | $0.13 |
| Voyage `voyage-4-lite` | 95% | 100% | 0.98 | 1024 | $0.02 |
| **Voyage `voyage-4`** | **100%** | **100%** | **1.00** | 1024 | $0.06 |
| Voyage `voyage-4-large` | 100% | 100% | 1.00 | 1024 | $0.12 |

- The hardest question was a Turkish question about an English term ("Kod incelemelerini kim bitirecek?" against "PR review"): only Voyage 4 and 4 large ranked it first.
- Cost does not decide: a one-hour transcript is about 10,000 tokens, under $0.001 with any model.
- The archive is small, so the best models reach the ceiling; the comparison can be extended with more similar passages.

## Decision

Voyage 4, 1024 dimensions, `input_type` set to `document` for stored text and `query` for questions. Voyage 4 models share one embedding space, so a later move to `voyage-4-lite` or `voyage-4-large` needs no re-embedding.

## Before real user data

Voyage may store API inputs and use them for training unless the organization opts out. Opting out needs a payment method on file and an organization admin, gives zero-day retention, and cannot be undone. Turn it off in the Voyage dashboard before any personal note is sent (Faz 4 deploy at the latest; local development uses synthetic data only).
