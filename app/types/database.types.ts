
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "boards": {
                  Row: {
                    "color": string | null,"columns": NonNullable<Json>,"course_name": string | null,"created_at": string,"id": string,"is_default": boolean,"jira_project_key": string | null,"mode": string,"name": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"columns"?: NonNullable<Json>,"course_name"?: string | null,"created_at"?: string,"id"?: string,"is_default"?: boolean,"jira_project_key"?: string | null,"mode"?: string,"name": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "color"?: string | null,"columns"?: NonNullable<Json>,"course_name"?: string | null,"created_at"?: string,"id"?: string,"is_default"?: boolean,"jira_project_key"?: string | null,"mode"?: string,"name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chat_messages": {
                  Row: {
                    "cited_chunk_ids": (string)[],"content": string,"created_at": string,"id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cited_chunk_ids"?: (string)[],"content": string,"created_at"?: string,"id"?: string,"role": string,"user_id"?: string
                  }
                  Update: {
                    "cited_chunk_ids"?: (string)[],"content"?: string,"created_at"?: string,"id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chunks": {
                  Row: {
                    "chunk_index": number,"content": string,"created_at": string,"embedding": string | null,"id": string,"source_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chunk_index": number,"content": string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"source_id": string,"user_id"?: string
                  }
                  Update: {
                    "chunk_index"?: number,"content"?: string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"source_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chunks_source_id_user_id_fkey"
      columns: ["source_id","user_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"default_mode": string,"display_name": string | null,"id": string,"plan": string,"plan_renews_at": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_mode"?: string,"display_name"?: string | null,"id"?: string,"plan"?: string,"plan_renews_at"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"default_mode"?: string,"display_name"?: string | null,"id"?: string,"plan"?: string,"plan_renews_at"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sources": {
                  Row: {
                    "created_at": string,"id": string,"mode": string,"raw_text": string | null,"status": string,"storage_path": string | null,"title": string | null,"type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"mode"?: string,"raw_text"?: string | null,"status"?: string,"storage_path"?: string | null,"title"?: string | null,"type": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mode"?: string,"raw_text"?: string | null,"status"?: string,"storage_path"?: string | null,"title"?: string | null,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"summaries": {
                  Row: {
                    "concepts": NonNullable<Json>,"created_at": string,"decisions": NonNullable<Json>,"id": string,"proposed_tasks": NonNullable<Json>,"questions": NonNullable<Json>,"source_id": string,"summary": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "concepts"?: NonNullable<Json>,"created_at"?: string,"decisions"?: NonNullable<Json>,"id"?: string,"proposed_tasks"?: NonNullable<Json>,"questions"?: NonNullable<Json>,"source_id": string,"summary"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "concepts"?: NonNullable<Json>,"created_at"?: string,"decisions"?: NonNullable<Json>,"id"?: string,"proposed_tasks"?: NonNullable<Json>,"questions"?: NonNullable<Json>,"source_id"?: string,"summary"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "summaries_source_id_user_id_fkey"
      columns: ["source_id","user_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee": string | null,"board_id": string,"calendar_event_id": string | null,"created_at": string,"due_date": string | null,"external_id": string | null,"external_provider": string | null,"external_url": string | null,"id": string,"position": number,"source_id": string | null,"status": string,"title": string,"type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee"?: string | null,"board_id": string,"calendar_event_id"?: string | null,"created_at"?: string,"due_date"?: string | null,"external_id"?: string | null,"external_provider"?: string | null,"external_url"?: string | null,"id"?: string,"position"?: number,"source_id"?: string | null,"status"?: string,"title": string,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "assignee"?: string | null,"board_id"?: string,"calendar_event_id"?: string | null,"created_at"?: string,"due_date"?: string | null,"external_id"?: string | null,"external_provider"?: string | null,"external_url"?: string | null,"id"?: string,"position"?: number,"source_id"?: string | null,"status"?: string,"title"?: string,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_board_id_user_id_fkey"
      columns: ["board_id","user_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "tasks_source_id_user_id_fkey"
      columns: ["source_id","user_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"transcripts": {
                  Row: {
                    "created_at": string,"duration_sec": number | null,"id": string,"language": string | null,"segments": NonNullable<Json>,"source_id": string,"text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_sec"?: number | null,"id"?: string,"language"?: string | null,"segments"?: NonNullable<Json>,"source_id": string,"text": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"duration_sec"?: number | null,"id"?: string,"language"?: string | null,"segments"?: NonNullable<Json>,"source_id"?: string,"text"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transcripts_source_id_user_id_fkey"
      columns: ["source_id","user_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"usage": {
                  Row: {
                    "ai_requests": number,"cost_usd": number,"created_at": string,"id": string,"period": string,"stt_minutes": number,"tokens_in": number,"tokens_out": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_requests"?: number,"cost_usd"?: number,"created_at"?: string,"id"?: string,"period": string,"stt_minutes"?: number,"tokens_in"?: number,"tokens_out"?: number,"user_id"?: string
                  }
                  Update: {
                    "ai_requests"?: number,"cost_usd"?: number,"created_at"?: string,"id"?: string,"period"?: string,"stt_minutes"?: number,"tokens_in"?: number,"tokens_out"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "record_ai_usage":
{ Args: { "p_cost_usd": number,"p_tokens_in": number,"p_tokens_out": number,"p_user_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
