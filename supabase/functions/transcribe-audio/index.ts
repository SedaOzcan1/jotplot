// Supabase Edge Function entry point (Deno). The logic lives in handler.ts so it can be tested
// without Deno; this file only connects it to Supabase, Deepgram, Claude, and the environment.
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { analyzeNote, resolveAnalysisModel } from '../_shared/note-analysis.ts'
import { transcribeWithDeepgram } from '../_shared/transcription.ts'
import { type AudioNote, createHandler, type UserScope } from './handler.ts'

/** Supabase's runtime keeps a promise running after the response is sent. */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

const supabaseUrl = requireEnv('SUPABASE_URL')
const anonKey = requireEnv('SUPABASE_ANON_KEY')
const deepgramKey = requireEnv('DEEPGRAM_API_KEY')
const anthropic = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') })
const serviceClient = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})

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
        .select('id, type, mode, status, storage_path, transcripts(id)')
        .eq('id', sourceId)
        .maybeSingle()
      if (error) throw error
      if (!note) return null
      const { transcripts, ...rest } = note as typeof note & { transcripts: unknown }
      const transcribed = Array.isArray(transcripts) ? transcripts.length > 0 : !!transcripts
      return { ...rest, transcribed } as AudioNote
    },
    async startTranscription(sourceId) {
      const { data: started, error } = await client.rpc('start_transcription', {
        p_source_id: sourceId,
      })
      if (error) throw error
      return started === true
    },
  }
}

Deno.serve(
  createHandler({
    userScope,
    async minutesRemaining(userId) {
      const { data, error } = await serviceClient.rpc('stt_minutes_remaining', {
        p_user_id: userId,
      })
      if (error) throw error
      return Number(data)
    },
    async downloadAudio(storagePath) {
      const { data, error } = await serviceClient.storage.from('recordings').download(storagePath)
      if (error) throw error
      return data
    },
    transcribe: (audio) => transcribeWithDeepgram({ apiKey: deepgramKey, audio }),
    async saveTranscript(userId, sourceId, transcript) {
      const { error } = await serviceClient.from('transcripts').upsert(
        {
          user_id: userId,
          source_id: sourceId,
          text: transcript.text,
          language: transcript.language,
          duration_sec: transcript.durationSec,
          segments: transcript.segments,
        },
        { onConflict: 'source_id' },
      )
      if (error) throw error
    },
    async recordMinutes(userId, minutes, costUsd) {
      const { error } = await serviceClient.rpc('record_stt_usage', {
        p_user_id: userId,
        p_minutes: minutes,
        p_cost_usd: costUsd,
      })
      if (error) throw error
    },
    async saveSummary(userId, sourceId, analysis) {
      const { data: summary, error } = await serviceClient
        .from('summaries')
        .upsert(
          {
            user_id: userId,
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
    // Task extraction from the transcript (T2.4) uses the same AI, limits, and usage as process-note.
    model: resolveAnalysisModel(Deno.env.get('NOTE_ANALYSIS_MODEL')),
    analyze: (input) => analyzeNote(anthropic, input),
    async reserveRequest(userId) {
      const { data, error } = await serviceClient.rpc('reserve_ai_request', { p_user_id: userId })
      if (error) throw error
      return data === true
    },
    async releaseRequest(userId) {
      const { error } = await serviceClient.rpc('release_ai_request', { p_user_id: userId })
      if (error) throw error
    },
    async recordUsage(userId, usage) {
      const { error } = await serviceClient.rpc('record_ai_usage', {
        p_user_id: userId,
        p_tokens_in: usage.inputTokens,
        p_tokens_out: usage.outputTokens,
        p_cost_usd: usage.costUsd,
      })
      if (error) throw error
    },
    async setStatus(sourceId, status) {
      const { error } = await serviceClient.from('sources').update({ status }).eq('id', sourceId)
      if (error) throw error
    },
    runInBackground: (work) => EdgeRuntime.waitUntil(work),
    log: (message, details) => console.error(message, details ?? {}),
  }),
)
