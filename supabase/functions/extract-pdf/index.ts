// Supabase Edge Function entry point (Deno). The logic lives in handler.ts so it can be tested
// without Deno; this file only connects it to Supabase, the PDF reader, and the environment.
import { createClient } from '@supabase/supabase-js'
import { extractText, getDocumentProxy } from 'unpdf'
import { createHandler, type PdfNote, UnreadablePdfError, type UserScope } from './handler.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

const supabaseUrl = requireEnv('SUPABASE_URL')
const anonKey = requireEnv('SUPABASE_ANON_KEY')

async function userScope(authorization: string | null): Promise<UserScope | null> {
  if (!authorization?.startsWith('Bearer ')) return null
  // Everything runs as the user: Row Level Security and Storage policies limit it to their files.
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
        .select('id, type, status, storage_path, raw_text')
        .eq('id', sourceId)
        .maybeSingle()
      if (error) throw error
      return note as PdfNote | null
    },
    async startExtraction(sourceId) {
      const { data: started, error } = await client.rpc('start_pdf_extraction', {
        p_source_id: sourceId,
      })
      if (error) throw error
      return started === true
    },
    async downloadPdf(storagePath) {
      const { data: file, error } = await client.storage.from('documents').download(storagePath)
      if (error) throw error
      return new Uint8Array(await file.arrayBuffer())
    },
    async saveText(sourceId, text) {
      const { error } = await client
        .from('sources')
        .update({ raw_text: text, status: 'ready' })
        .eq('id', sourceId)
      if (error) throw error
    },
    async markFailed(sourceId) {
      const { error } = await client.from('sources').update({ status: 'failed' }).eq('id', sourceId)
      if (error) throw error
    },
  }
}

Deno.serve(
  createHandler({
    userScope,
    async openPdf(bytes) {
      let pdf: Awaited<ReturnType<typeof getDocumentProxy>>
      try {
        pdf = await getDocumentProxy(bytes)
      } catch (error) {
        throw new UnreadablePdfError(String(error))
      }
      return {
        pageCount: pdf.numPages,
        async pages() {
          const { text } = await extractText(pdf, { mergePages: false })
          return Array.isArray(text) ? text : [text]
        },
      }
    },
    log: (message, details) => console.error(message, details ?? {}),
  }),
)
