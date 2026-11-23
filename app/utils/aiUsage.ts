/** The signed-in user's AI requests this month (US-1.6). */
export interface AiUsage {
  used: number
  limit: number
  plan: string
  /** First day of the month the usage counts, YYYY-MM-DD in Turkish time. */
  period: string
  /** Speech-to-text minutes used this month and the plan's monthly minutes (T2.3). */
  sttMinutes: number
  sttLimit: number
}

/** Share of the limit at which the user is warned that it is close. */
export const AI_USAGE_WARNING_RATIO = 0.8

export type AiUsageLevel = 'ok' | 'near' | 'reached'

export function aiUsageLevel(usage: Pick<AiUsage, 'used' | 'limit'>): AiUsageLevel {
  if (usage.used >= usage.limit) return 'reached'
  return usage.used >= usage.limit * AI_USAGE_WARNING_RATIO ? 'near' : 'ok'
}

export function remainingRequests(usage: Pick<AiUsage, 'used' | 'limit'>) {
  return Math.max(usage.limit - usage.used, 0)
}

const resetDate = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** Locative suffix for each month name (Ocak → Ocak’ta, Nisan → Nisan’da, Eylül → Eylül’de). */
const MONTH_LOCATIVE = ['ta', 'ta', 'ta', 'da', 'ta', 'da', 'da', 'ta', 'de', 'de', 'da', 'ta']

/** The day the limit renews: the first day of the month after `period`, for example "1 Aralık". */
export function formatResetDate(period: string) {
  const [year, month] = period.split('-').map(Number) as [number, number]
  return resetDate.format(new Date(Date.UTC(year, month, 1)))
}

/** "1 Aralık’ta": the renewal day with the correct Turkish suffix. */
export function formatResetDateLocative(period: string) {
  const [, month] = period.split('-').map(Number) as [number, number]
  return `${formatResetDate(period)}’${MONTH_LOCATIVE[month % 12]}`
}

/** Turkish message for the new note screen and settings; null when there is nothing to say. */
export function aiUsageMessage(usage: AiUsage): string | null {
  const level = aiUsageLevel(usage)
  if (level === 'reached') {
    return `Bu ayki ${usage.limit} AI işleme hakkını doldurdun. Notlarını kaydetmeye devam edebilirsin; hakkın ${formatResetDateLocative(usage.period)} yenilenir.`
  }
  if (level === 'near') {
    return `Bu ay ${remainingRequests(usage)} AI işleme hakkın kaldı. Hakkın ${formatResetDateLocative(usage.period)} yenilenir.`
  }
  return null
}

/** Same levels for speech-to-text minutes. */
export function sttUsageLevel(usage: Pick<AiUsage, 'sttMinutes' | 'sttLimit'>): AiUsageLevel {
  return aiUsageLevel({ used: usage.sttMinutes, limit: usage.sttLimit })
}

/** Whole minutes as is, others with one decimal: "12", "12,5". */
export function formatMinutes(minutes: number) {
  return minutes.toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}

/** Turkish message about recording minutes; null when there is nothing to say. */
export function sttUsageMessage(usage: AiUsage): string | null {
  const level = sttUsageLevel(usage)
  if (level === 'reached') {
    return `Bu ayki ${usage.sttLimit} dakikalık ses hakkını doldurdun. Kayıtların saklanır; hakkın ${formatResetDateLocative(usage.period)} yenilenince yazıya dökebilirsin.`
  }
  if (level === 'near') {
    const left = formatMinutes(Math.max(usage.sttLimit - usage.sttMinutes, 0))
    return `Bu ay ${left} dakikalık ses hakkın kaldı. Daha uzun bir kayıt da yazıya dökülür, ama sonrasında hakkın ${formatResetDateLocative(usage.period)} yenilenene kadar yeni kayıt dökülmez.`
  }
  return null
}
