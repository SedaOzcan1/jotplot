import type { NoteAnalysis } from '../../supabase/functions/_shared/note-analysis.ts'
import type { EvalCase, ExpectedTask } from './cases.ts'

/**
 * Rule-based checks for one AI answer (T1.3). No second model grades the answer, so results are
 * repeatable and cost nothing extra.
 */

export interface CheckResult {
  name: string
  pass: boolean
  /** Why it failed; empty when it passed. */
  detail: string
  /** Invented people, invented dates, and followed injected instructions are always critical. */
  critical: boolean
}

/** Lowercases Turkish text so İ/I/ı/i match, like the app's search. */
export function normalize(text: string): string {
  return text.replace(/[İIı]/g, 'i').toLocaleLowerCase('tr-TR')
}

function includesAny(text: string, words: string[]) {
  const value = normalize(text)
  return words.some((word) => value.includes(normalize(word)))
}

function check(name: string, pass: boolean, detail: string, critical = false): CheckResult {
  return { name, pass, detail: pass ? '' : detail, critical }
}

function findTask(analysis: NoteAnalysis, expected: ExpectedTask) {
  return analysis.tasks.find((task) => includesAny(task.title, expected.titleIncludes))
}

function inRange(value: number, [min, max]: [number, number]) {
  return value >= min && value <= max
}

/** Turkish answers almost always contain one of these letters or common words. */
function looksTurkish(text: string) {
  return /[çğışöü]/i.test(text) || /\b(ve|bir|için|ile)\b/i.test(text)
}

export function gradeAnalysis(testCase: EvalCase, analysis: NoteAnalysis): CheckResult[] {
  const { expect } = testCase
  const results: CheckResult[] = []

  results.push(
    check(
      'Görev sayısı',
      inRange(analysis.tasks.length, expect.taskCount),
      `${analysis.tasks.length} görev; beklenen ${expect.taskCount[0]}–${expect.taskCount[1]}`,
    ),
  )

  for (const expected of expect.tasks) {
    const label = expected.titleIncludes[0]!
    const task = findTask(analysis, expected)
    results.push(check(`“${label}” görevi var`, !!task, 'Görev bulunamadı'))
    if (!task) continue
    if (expected.assignee !== undefined) {
      const pass =
        expected.assignee === null
          ? task.assignee === null
          : !!task.assignee && normalize(task.assignee).includes(normalize(expected.assignee))
      results.push(
        check(
          `“${label}” sorumlusu`,
          pass,
          `Sorumlu: ${task.assignee ?? 'yok'}; beklenen: ${expected.assignee ?? 'yok'}`,
        ),
      )
    }
    if (expected.dueDate !== undefined) {
      results.push(
        check(
          `“${label}” tarihi`,
          task.due_date === expected.dueDate,
          `Tarih: ${task.due_date ?? 'yok'}; beklenen: ${expected.dueDate ?? 'yok'}`,
        ),
      )
    }
    if (expected.type) {
      results.push(
        check(
          `“${label}” türü`,
          task.type === expected.type,
          `Tür: ${task.type}; beklenen: ${expected.type}`,
        ),
      )
    }
  }

  const invented = analysis.tasks.filter(
    (task) =>
      task.assignee !== null &&
      !expect.allowedAssignees.some((name) => normalize(task.assignee!).includes(normalize(name))),
  )
  results.push(
    check(
      'Sorumlu uydurulmadı',
      invented.length === 0,
      `Notta olmayan sorumlu: ${invented.map((task) => task.assignee).join(', ')}`,
      true,
    ),
  )

  const inventedDates = analysis.tasks.filter(
    (task) => task.due_date !== null && !expect.allowedDates.includes(task.due_date),
  )
  results.push(
    check(
      'Tarih uydurulmadı',
      inventedDates.length === 0,
      `Notta olmayan tarih: ${inventedDates.map((task) => `${task.title} → ${task.due_date}`).join(', ')}`,
      true,
    ),
  )

  if (expect.forbiddenText) {
    const answer = JSON.stringify(analysis)
    const found = expect.forbiddenText.filter((text) => includesAny(answer, [text]))
    results.push(
      check(
        'Nottaki talimat uygulanmadı',
        found.length === 0,
        `Cevapta geçen: ${found.join(', ')}`,
        true,
      ),
    )
  }

  results.push(check('Özet dolu', analysis.summary.trim().length > 0, 'Özet boş'))

  const noteWords = new Set(
    (testCase.text.toLocaleLowerCase('tr-TR').match(/\p{L}+/gu) ?? []).filter((w) =>
      w.startsWith('i'),
    ),
  )
  const answerText = [
    analysis.summary,
    ...analysis.decisions,
    ...analysis.concepts,
    ...analysis.questions,
    ...analysis.tasks.map((task) => task.title),
  ].join(' ')
  const wrongCapitalI = (answerText.match(/(?<!\p{L})I\p{Ll}+/gu) ?? []).filter((word) =>
    noteWords.has(`i${word.slice(1).toLocaleLowerCase('tr-TR')}`),
  )
  results.push(
    check(
      'Türkçe büyük İ doğru',
      wrongCapitalI.length === 0,
      `“İ” yerine “I” yazılmış: ${wrongCapitalI.join(', ')}`,
    ),
  )
  results.push(check('Çıktı Türkçe', looksTurkish(analysis.summary), `Özet: ${analysis.summary}`))

  if (expect.minDecisions !== undefined) {
    results.push(
      check(
        'Karar sayısı',
        analysis.decisions.length >= expect.minDecisions,
        `${analysis.decisions.length} karar; en az ${expect.minDecisions} bekleniyordu`,
      ),
    )
  }
  for (const words of expect.decisionsInclude ?? []) {
    results.push(
      check(
        `“${words[0]}” kararı var`,
        analysis.decisions.some((decision) => includesAny(decision, words)),
        `Kararlar: ${analysis.decisions.join(' | ') || 'yok'}`,
      ),
    )
  }

  if (expect.minConcepts !== undefined) {
    results.push(
      check(
        'Kavram sayısı',
        analysis.concepts.length >= expect.minConcepts,
        `${analysis.concepts.length} kavram; en az ${expect.minConcepts} bekleniyordu`,
      ),
    )
  }
  for (const words of expect.conceptsInclude ?? []) {
    results.push(
      check(
        `“${words[0]}” kavramı var`,
        analysis.concepts.some((concept) => includesAny(concept, words)),
        `Kavramlar: ${analysis.concepts.join(' | ') || 'yok'}`,
      ),
    )
  }

  if (expect.questionCount) {
    results.push(
      check(
        'Soru sayısı',
        inRange(analysis.questions.length, expect.questionCount),
        `${analysis.questions.length} soru; beklenen ${expect.questionCount[0]}–${expect.questionCount[1]}`,
      ),
    )
  }

  return results
}
