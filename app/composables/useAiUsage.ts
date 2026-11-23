import type { AiUsage } from '~/utils/aiUsage'

/**
 * Reads the signed-in user's AI requests and recording minutes this month. The limit is enforced by the server; this is
 * only for showing it.
 */
export function useAiUsage() {
  const supabase = useSupabaseClient()

  async function getAiUsage(): Promise<AiUsage | null> {
    const { data, error } = await supabase.rpc('get_my_ai_usage')
    if (error)
      throw new NoteServiceError(error.code === '42501' ? 'not_signed_in' : error.code || 'unknown')
    const row = data?.[0]
    if (!row) return null
    return {
      used: row.used,
      limit: row.request_limit,
      plan: row.plan,
      period: row.period,
      sttMinutes: Number(row.stt_minutes),
      sttLimit: row.stt_minute_limit,
    }
  }

  return { getAiUsage }
}
