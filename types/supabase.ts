export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: { id: number; name: string; slug: string; address: string | null; phone: string | null; timezone: string; academic_year: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; name: string; slug: string; address?: string | null; phone?: string | null; timezone?: string; academic_year?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; name?: string; slug?: string; address?: string | null; phone?: string | null; timezone?: string; academic_year?: string | null; created_at?: string; updated_at?: string }
      }
      profiles: {
        Row: { id: number; user_id: string; school_id: number; role: string; full_name: string; email: string; phone: string | null; avatar_url: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; user_id: string; school_id: number; role: string; full_name: string; email: string; phone?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; user_id?: string; school_id?: number; role?: string; full_name?: string; email?: string; phone?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string }
      }
      classes: {
        Row: { id: number; school_id: number; name: string; grade: string | null; section: string | null; teacher_id: number | null; academic_year: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; school_id: number; name: string; grade?: string | null; section?: string | null; teacher_id?: number | null; academic_year?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; school_id?: number; name?: string; grade?: string | null; section?: string | null; teacher_id?: number | null; academic_year?: string | null; created_at?: string; updated_at?: string }
      }
      enrollments: {
        Row: { id: number; class_id: number; student_id: number; parent_id: number | null; created_at: string }
        Insert: { id?: number; class_id: number; student_id: number; parent_id?: number | null; created_at?: string }
        Update: { id?: number; class_id?: number; student_id?: number; parent_id?: number | null; created_at?: string }
      }
      attendance_records: {
        Row: { id: number; class_id: number; student_id: number; date: string; status: string; marked_by: number; notes: string | null; parent_notified: boolean; notified_at: string | null; created_at: string }
        Insert: { id?: number; class_id: number; student_id: number; date: string; status: string; marked_by: number; notes?: string | null; parent_notified?: boolean; notified_at?: string | null; created_at?: string }
        Update: { id?: number; class_id?: number; student_id?: number; date?: string; status?: string; marked_by?: number; notes?: string | null; parent_notified?: boolean; notified_at?: string | null; created_at?: string }
      }
      conversations: {
        Row: { id: number; school_id: number; subject: string | null; created_at: string }
        Insert: { id?: number; school_id: number; subject?: string | null; created_at?: string }
        Update: { id?: number; school_id?: number; subject?: string | null; created_at?: string }
      }
      conversation_participants: {
        Row: { id: number; conversation_id: number; profile_id: number; last_read_at: string | null; created_at: string }
        Insert: { id?: number; conversation_id: number; profile_id: number; last_read_at?: string | null; created_at?: string }
        Update: { id?: number; conversation_id?: number; profile_id?: number; last_read_at?: string | null; created_at?: string }
      }
      messages: {
        Row: { id: number; conversation_id: number; sender_id: number; body: string; created_at: string }
        Insert: { id?: number; conversation_id: number; sender_id: number; body: string; created_at?: string }
        Update: { id?: number; conversation_id?: number; sender_id?: number; body?: string; created_at?: string }
      }
      announcements: {
        Row: { id: number; school_id: number; author_id: number; title: string; body: string; priority: string; target_roles: string[]; created_at: string; updated_at: string }
        Insert: { id?: number; school_id: number; author_id: number; title: string; body: string; priority?: string; target_roles?: string[]; created_at?: string; updated_at?: string }
        Update: { id?: number; school_id?: number; author_id?: number; title?: string; body?: string; priority?: string; target_roles?: string[]; created_at?: string; updated_at?: string }
      }
      attendance_alerts: {
        Row: { id: number; attendance_id: number; student_id: number; parent_id: number; sent_at: string; method: string; read_at: string | null }
        Insert: { id?: number; attendance_id: number; student_id: number; parent_id: number; sent_at?: string; method?: string; read_at?: string | null }
        Update: { id?: number; attendance_id?: number; student_id?: number; parent_id?: number; sent_at?: string; method?: string; read_at?: string | null }
      }
    }
    Views: {}
    Functions: {
      get_school_id: { Args: Record<string, never>; Returns: number }
      get_profile_id: { Args: Record<string, never>; Returns: number }
      get_my_role: { Args: Record<string, never>; Returns: string }
      is_same_school: { Args: { target_profile_id: number }; Returns: boolean }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
