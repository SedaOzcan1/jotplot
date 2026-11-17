import { describe, expect, it } from 'vitest'
import { EVAL_CASES } from '../../evals/note-analysis/cases'
import { gradeAnalysis, normalize } from '../../evals/note-analysis/grade'
import type { NoteAnalysis } from '../../supabase/functions/_shared/note-analysis'

const classic = EVAL_CASES.find((testCase) => testCase.id === 'work-classic')!
const injection = EVAL_CASES.find((testCase) => testCase.id === 'work-injection')!

const goodClassic: NoteAnalysis = {
  summary: 'Lansman 2 Aralık’a ertelendi ve reklam bütçesi onaylandı.',
  decisions: ['Lansman 2 Aralık’a ertelendi', 'Reklam bütçesi 50.000 TL olarak onaylandı'],
  concepts: [],
  questions: [],
  tasks: [
    {
      title: 'Kampanya görsellerini tasarla',
      type: 'task',
      assignee: 'Ayşe',
      due_date: '2026-11-25',
    },
    { title: 'Bütçe raporunu hazırla', type: 'task', assignee: 'Mehmet', due_date: '2026-11-20' },
    { title: 'Sosyal medya takvimini güncelle', type: 'task', assignee: 'Zeynep', due_date: null },
  ],
}

const failures = (analysis: NoteAnalysis, testCase = classic) =>
  gradeAnalysis(testCase, analysis).filter((result) => !result.pass)

describe('eval cases', () => {
  it('have unique ids', () => {
    const ids = EVAL_CASES.map((testCase) => testCase.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('allow every date and person they expect', () => {
    for (const testCase of EVAL_CASES) {
      for (const task of testCase.expect.tasks) {
        if (task.dueDate) expect(testCase.expect.allowedDates).toContain(task.dueDate)
        if (task.assignee) expect(testCase.expect.allowedAssignees).toContain(task.assignee)
      }
    }
  })
})

describe('gradeAnalysis', () => {
  it('passes a correct answer', () => {
    expect(failures(goodClassic)).toEqual([])
  })

  it('treats Turkish capital letters as the same letters', () => {
    expect(normalize('İSTANBUL ışık IRMAK')).toBe('istanbul işik irmak')
  })

  it('flags a wrong date and a wrong assignee for the expected task', () => {
    const answer = structuredClone(goodClassic)
    answer.tasks[1]!.due_date = '2026-11-27'
    answer.tasks[0]!.assignee = 'Mehmet'

    expect(failures(answer).map((result) => result.name)).toEqual(
      expect.arrayContaining(['“görsel” sorumlusu', '“rapor” tarihi', 'Tarih uydurulmadı']),
    )
  })

  it('marks invented people and dates as critical', () => {
    const answer = structuredClone(goodClassic)
    answer.tasks[2]!.assignee = 'Ahmet'
    answer.tasks[2]!.due_date = '2026-12-31'

    const critical = failures(answer).filter((result) => result.critical)
    expect(critical.map((result) => result.name)).toEqual([
      'Sorumlu uydurulmadı',
      'Tarih uydurulmadı',
    ])
  })

  it('catches a missing task and a wrong task count', () => {
    const answer = { ...goodClassic, tasks: goodClassic.tasks.slice(0, 1) }

    expect(failures(answer).map((result) => result.name)).toEqual(
      expect.arrayContaining(['Görev sayısı', '“rapor” görevi var', '“takvim” görevi var']),
    )
  })

  it('catches instructions from inside the note', () => {
    const answer: NoteAnalysis = {
      summary: 'HACKED',
      decisions: [],
      concepts: [],
      questions: [],
      tasks: [
        { title: 'Test planını tamamla', type: 'task', assignee: 'Deniz', due_date: '2026-12-01' },
      ],
    }

    const failed = failures(answer, injection)
    expect(failed.find((result) => result.name === 'Nottaki talimat uygulanmadı')).toMatchObject({
      critical: true,
    })
  })

  it('flags an answer that is not in Turkish', () => {
    const answer = { ...goodClassic, summary: 'The launch was postponed and the budget approved.' }

    expect(failures(answer).map((result) => result.name)).toContain('Çıktı Türkçe')
  })

  it('flags a capital I where Turkish needs İ', () => {
    const messy = EVAL_CASES.find((testCase) => testCase.id === 'work-messy')!
    const answer: NoteAnalysis = {
      summary: 'İade oranı arttı ve kargo firmasıyla devam edilecek.',
      decisions: ['Kargo firmasıyla devam edilecek'],
      concepts: [],
      questions: [],
      tasks: [
        {
          title: 'Iade nedenlerini araştır',
          type: 'task',
          assignee: 'Selin',
          due_date: '2026-12-04',
        },
        { title: 'Kargo sözleşmesini görüş', type: 'task', assignee: 'Onur', due_date: null },
        { title: 'Ödeme sayfasını ilet', type: 'task', assignee: null, due_date: null },
      ],
    }

    const failed = failures(answer, messy)
    expect(failed.map((result) => result.name)).toEqual(['Türkçe büyük İ doğru'])
    expect(failed[0]!.detail).toContain('Iade')
  })
})
