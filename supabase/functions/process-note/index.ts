// Supabase Edge Function entry point (Deno). The logic lives in handler.ts so it can be tested
// without Deno; this file only connects it to Supabase, Claude, and the environment.
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { analyzeNote, resolveAnalysisModel } from '../_shared/note-analysis.ts'
import { createHandler, type Note, type UserScope } from './handler.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

const supabaseUrl = requireEnv('SUPABASE_URL')
const anonKey = requireEnv('SUPABASE_ANON_KEY')
const serviceClient = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})
const anthropic = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') })

async function userScope(authorization: string | null): Promise<UserScope | null> {
  if (!authorization?.startsWith('Bearer ')) return null
  // Queries run as the user, so Row Level Security limits them to the user's own notes.
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data, error } = await client.auth.getUser(authorization.slice('Bearer '.length))
  if (error || !data.user) return null

  return {
    userId: data.user.id,
    async loadNote(sourceId) {
      const { data: note, error } = await client
        .from('sources')
        .select('id, type, mode, raw_text')
        .eq('id', sourceId)
        .maybeSingle()
      if (error) throw error
      return note as Note | null
    },
    async setStatus(sourceId, status) {
      const { error } = await client.from('sources').update({ status }).eq('id', sourceId)
      if (error) throw error
    },
    async saveSummary(sourceId, analysis) {
      const { data: summary, error } = await client
        .from('summaries')
        .upsert(
          {
            source_id: sourceId,
            summary: analysis.summary,
            decisions: analysis.decisions,
            concepts: analysis.concepts,
            questions: analysis.questions,
            proposed_tasks: analysis.tasks,
          },
          { onConflict: 'source_id' },
        )
        .select('id')
        .single()
      if (error) throw error
      return summary.id as string
    },
  }
}

Deno.serve(
  createHandler({
    model: resolveAnalysisModel(Deno.env.get('NOTE_ANALYSIS_MODEL')),
    userScope,
    analyze: (input) => analyzeNote(anthropic, input),
    async recordUsage(userId, usage) {
      const { error } = await serviceClient.rpc('record_ai_usage', {
        p_user_id: userId,
        p_tokens_in: usage.inputTokens,
        p_tokens_out: usage.outputTokens,
        p_cost_usd: usage.costUsd,
      })
      if (error) throw error
    },
    log: (message, details) => console.error(message, details ?? {}),
  }),
)
