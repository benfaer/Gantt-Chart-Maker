export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '13.0.5' }
  public: {
    Tables: {
      categories: {
        Row: { color: string; created_at: string; id: string; name: string; project_id: string }
        Insert: { color: string; created_at?: string; id?: string; name: string; project_id: string }
        Update: { color?: string; created_at?: string; id?: string; name?: string; project_id?: string }
        Relationships: [
          {
            foreignKeyName: 'categories_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      kv_store_102fbbe8: {
        Row: { key: string; value: Json }
        Insert: { key: string; value: Json }
        Update: { key?: string; value?: Json }
        Relationships: []
      }
      milestones: {
        Row: { created_at: string; date: string; id: string; project_id: string; task_id: string | null; title: string; updated_at: string }
        Insert: { created_at?: string; date: string; id?: string; project_id: string; task_id?: string | null; title: string; updated_at?: string }
        Update: { created_at?: string; date?: string; id?: string; project_id?: string; task_id?: string | null; title?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: 'milestones_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id'] },
          { foreignKeyName: 'milestones_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
        ]
      }
      projects: {
        Row: { created_at: string; description: string; end_date: string; id: string; start_date: string; title: string; updated_at: string }
        Insert: { created_at?: string; description: string; end_date: string; id?: string; start_date: string; title: string; updated_at?: string }
        Update: { created_at?: string; description?: string; end_date?: string; id?: string; start_date?: string; title?: string; updated_at?: string }
        Relationships: []
      }
      task_intervals: {
        Row: { category_id: string | null; created_at: string; end_date: string; id: string; start_date: string; task_id: string }
        Insert: { category_id?: string | null; created_at?: string; end_date: string; id?: string; start_date: string; task_id: string }
        Update: { category_id?: string | null; created_at?: string; end_date?: string; id?: string; start_date?: string; task_id?: string }
        Relationships: [
          { foreignKeyName: 'task_intervals_category_id_fkey'; columns: ['category_id']; isOneToOne: false; referencedRelation: 'categories'; referencedColumns: ['id'] },
          { foreignKeyName: 'task_intervals_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
        ]
      }
      tasks: {
        Row: { created_at: string; display_order: number; id: string; name: string; project_id: string; updated_at: string; parent_task_id: string | null; color: string | null }
        Insert: { created_at?: string; display_order?: number; id?: string; name: string; project_id: string; updated_at?: string; parent_task_id?: string | null; color?: string | null }
        Update: { created_at?: string; display_order?: number; id?: string; name?: string; project_id?: string; updated_at?: string; parent_task_id?: string | null; color?: string | null }
        Relationships: [
          { foreignKeyName: 'tasks_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id'] },
          { foreignKeyName: 'tasks_parent_task_id_fkey'; columns: ['parent_task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export const Constants = { public: { Enums: {} } } as const


