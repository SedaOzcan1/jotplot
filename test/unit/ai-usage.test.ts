import { describe, expect, it } from 'vitest'
import {
  aiUsageLevel,
  aiUsageMessage,
  formatResetDate,
  formatResetDateLocative,
  formatMinutes,
  remainingRequests,
  sttUsageLevel,
  sttUsageMessage,
} from '~/utils/aiUsage'

const november = { plan: 'free', period: '2026-11-01', limit: 50, sttMinutes: 0, sttLimit: 30 }

describe('aiUsageLevel', () => {
  it('warns from 80% of the limit and stops at the limit', () => {
    expect(aiUsageLevel({ used: 39, limit: 50 })).toBe('ok')
    expect(aiUsageLevel({ used: 40, limit: 50 })).toBe('near')
    expect(aiUsageLevel({ used: 50, limit: 50 })).toBe('reached')
    expect(aiUsageLevel({ used: 51, limit: 50 })).toBe('reached')
  })

  it('never reports a negative number of remaining requests', () => {
    expect(remainingRequests({ used: 52, limit: 50 })).toBe(0)
    expect(remainingRequests({ used: 12, limit: 50 })).toBe(38)
  })
})

describe('renewal date', () => {
  it('is the first day of the next month', () => {
    expect(formatResetDate('2026-11-01')).toBe('1 Aralık')
    expect(formatResetDate('2026-12-01')).toBe('1 Ocak')
  })

  it('uses the right Turkish suffix for each month', () => {
    expect(formatResetDateLocative('2026-11-01')).toBe('1 Aralık’ta')
    expect(formatResetDateLocative('2026-03-01')).toBe('1 Nisan’da')
    expect(formatResetDateLocative('2026-08-01')).toBe('1 Eylül’de')
    expect(formatResetDateLocative('2026-12-01')).toBe('1 Ocak’ta')
  })
})

describe('aiUsageMessage', () => {
  it('says nothing while there is plenty left', () => {
    expect(aiUsageMessage({ ...november, used: 10 })).toBeNull()
  })

  it('tells how many requests are left when close to the limit', () => {
    expect(aiUsageMessage({ ...november, used: 45 })).toBe(
      'Bu ay 5 AI işleme hakkın kaldı. Hakkın 1 Aralık’ta yenilenir.',
    )
  })

  it('explains that notes can still be saved when the limit is reached', () => {
    expect(aiUsageMessage({ ...november, used: 50 })).toBe(
      'Bu ayki 50 AI işleme hakkını doldurdun. Notlarını kaydetmeye devam edebilirsin; hakkın 1 Aralık’ta yenilenir.',
    )
  })
})

describe('recording minutes', () => {
  it('uses the same warning levels as AI requests', () => {
    expect(sttUsageLevel({ sttMinutes: 23.9, sttLimit: 30 })).toBe('ok')
    expect(sttUsageLevel({ sttMinutes: 24, sttLimit: 30 })).toBe('near')
    expect(sttUsageLevel({ sttMinutes: 32.5, sttLimit: 30 })).toBe('reached')
  })

  it('shows minutes the Turkish way', () => {
    expect(formatMinutes(12)).toBe('12')
    expect(formatMinutes(12.46)).toBe('12,5')
  })

  it('explains what happens near and at the limit', () => {
    expect(sttUsageMessage({ ...november, used: 0, sttMinutes: 3 })).toBeNull()
    expect(sttUsageMessage({ ...november, used: 0, sttMinutes: 25.5 })).toContain(
      'Bu ay 4,5 dakikalık ses hakkın kaldı',
    )
    expect(sttUsageMessage({ ...november, used: 0, sttMinutes: 30 })).toBe(
      'Bu ayki 30 dakikalık ses hakkını doldurdun. Kayıtların saklanır; hakkın 1 Aralık’ta yenilenince yazıya dökebilirsin.',
    )
  })
})
