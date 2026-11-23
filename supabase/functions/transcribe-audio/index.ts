// Supabase Edge Function entry point (Deno). The logic lives in handler.ts so it can be tested
// without Deno; this file only connects it to Supabase, Deepgram, and the environment.
import { createClient } from '@supabase/supabase-js'
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
        .select('id, type, status, storage_path')
        .eq('id', sourceId)
        .maybeSingle()
      if (error) throw error
      return note as AudioNote | null
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
    async recordUsage(userId, minutes, costUsd) {
      const { error } = await serviceClient.rpc('record_stt_usage', {
        p_user_id: userId,
        p_minutes: minutes,
        p_cost_usd: costUsd,
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
