export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: { id: number; name: string; slug: string; address: string | null; phone: string | null; timezone: string; academic_year: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; name: string; slug: string; address?: string | null; phone?: string | null; timezone?: string; academic_year?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; name?: string; slug?: string; address?: string | null; phone?: string | null; timezone?: string; academic_year?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: number; user_id: string; school_id: number; role: string; full_name: string; email: string; phone: string | null; avatar_url: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; user_id: string; school_id: number; role: string; full_name: string; email: string; phone?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; user_id?: string; school_id?: number; role?: string; full_name?: string; email?: string; phone?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      classes: {
        Row: { id: number; school_id: number; name: string; grade: string | null; section: string | null; teacher_id: number | null; academic_year: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; school_id: number; name: string; grade?: string | null; section?: string | null; teacher_id?: number | null; academic_year?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; school_id?: number; name?: string; grade?: string | null; section?: string | null; teacher_id?: number | null; academic_year?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      enrollments: {
        Row: { id: number; class_id: number; student_id: number; parent_id: number | null; created_at: string }
        Insert: { id?: number; class_id: number; student_id: number; parent_id?: number | null; created_at?: string }
        Update: { id?: number; class_id?: number; student_id?: number; parent_id?: number | null; created_at?: string }
        Relationships: []
      }
      attendance_records: {
        Row: { id: number; class_id: number; student_id: number; date: string; status: string; marked_by: number; notes: string | null; parent_notified: boolean; notified_at: string | null; created_at: string }
        Insert: { id?: number; class_id: number; student_id: number; date: string; status: string; marked_by: number; notes?: string | null; parent_notified?: boolean; notified_at?: string | null; created_at?: string }
        Update: { id?: number; class_id?: number; student_id?: number; date?: string; status?: string; marked_by?: number; notes?: string | null; parent_notified?: boolean; notified_at?: string | null; created_at?: string }
        Relationships: []
      }
      conversations: {
        Row: { id: number; school_id: number; subject: string | null; created_at: string }
        Insert: { id?: number; school_id: number; subject?: string | null; created_at?: string }
        Update: { id?: number; school_id?: number; subject?: string | null; created_at?: string }
        Relationships: [
          {
            foreignKeyName: "conversations_school_id_fkey",
            columns: ["school_id"],
            referencedRelation: "schools",
            referencedColumns: ["id"],
          }
        ]
      }
      conversation_participants: {
        Row: { id: number; conversation_id: number; profile_id: number; last_read_at: string | null; created_at: string }
        Insert: { id?: number; conversation_id: number; profile_id: number; last_read_at?: string | null; created_at?: string }
        Update: { id?: number; conversation_id?: number; profile_id?: number; last_read_at?: string | null; created_at?: string }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey",
            columns: ["conversation_id"],
            referencedRelation: "conversations",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey",
            columns: ["profile_id"],
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          }
        ]
      }
      messages: {
        Row: { id: number; conversation_id: number; sender_id: number; body: string; attachment_url: string | null; attachment_type: string | null; created_at: string }
        Insert: { id?: number; conversation_id: number; sender_id: number; body: string; attachment_url?: string | null; attachment_type?: string | null; created_at?: string }
        Update: { id?: number; conversation_id?: number; sender_id?: number; body?: string; attachment_url?: string | null; attachment_type?: string | null; created_at?: string }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey",
            columns: ["conversation_id"],
            referencedRelation: "conversations",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "messages_sender_id_fkey",
            columns: ["sender_id"],
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          }
        ]
      }
      announcements: {
        Row: { id: number; school_id: number; author_id: number; title: string; body: string; priority: string; target_roles: string[]; created_at: string; updated_at: string }
        Insert: { id?: number; school_id: number; author_id: number; title: string; body: string; priority?: string; target_roles?: string[]; created_at?: string; updated_at?: string }
        Update: { id?: number; school_id?: number; author_id?: number; title?: string; body?: string; priority?: string; target_roles?: string[]; created_at?: string; updated_at?: string }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey",
            columns: ["author_id"],
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          }
        ]
      }
      attendance_alerts: {
        Row: { id: number; attendance_id: number; student_id: number; parent_id: number; sent_at: string; method: string; read_at: string | null }
        Insert: { id?: number; attendance_id: number; student_id: number; parent_id: number; sent_at?: string; method?: string; read_at?: string | null }
        Update: { id?: number; attendance_id?: number; student_id?: number; parent_id?: number; sent_at?: string; method?: string; read_at?: string | null }
        Relationships: []
      }
      folders: {
        Row: { id: number; school_id: number; class_id: number; name: string; created_by: number; created_at: string; updated_at: string }
        Insert: { id?: number; school_id: number; class_id: number; name: string; created_by: number; created_at?: string; updated_at?: string }
        Update: { id?: number; school_id?: number; class_id?: number; name?: string; created_by?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      resources: {
        Row: { id: number; folder_id: number; name: string; storage_path: string; size_bytes: number; content_type: string; created_by: number; created_at: string; updated_at: string }
        Insert: { id?: number; folder_id: number; name: string; storage_path: string; size_bytes: number; content_type: string; created_by: number; created_at?: string; updated_at?: string }
        Update: { id?: number; folder_id?: number; name?: string; storage_path?: string; size_bytes?: number; content_type?: string; created_by?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      assignments: {
        Row: { id: number; class_id: number; title: string; description: string | null; due_date: string | null; total_points: number; created_by: number; created_at: string; updated_at: string }
        Insert: { id?: number; class_id: number; title: string; description?: string | null; due_date?: string | null; total_points?: number; created_by: number; created_at?: string; updated_at?: string }
        Update: { id?: number; class_id?: number; title?: string; description?: string | null; due_date?: string | null; total_points?: number; created_by?: number; created_at?: string; updated_at?: string }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey",
            columns: ["class_id"],
            referencedRelation: "classes",
            referencedColumns: ["id"],
          }
        ]
      }
      submissions: {
        Row: { id: number; assignment_id: number; student_id: number; file_url: string | null; grade: number | null; feedback: string | null; submitted_at: string }
        Insert: { id?: number; assignment_id: number; student_id: number; file_url?: string | null; grade?: number | null; feedback?: string | null; submitted_at?: string }
        Update: { id?: number; assignment_id?: number; student_id?: number; file_url?: string | null; grade?: number | null; feedback?: string | null; submitted_at?: string }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey",
            columns: ["assignment_id"],
            referencedRelation: "assignments",
            referencedColumns: ["id"],
          }
        ]
      }
    }
    Views: {}
    Functions: {
      get_school_id: { Args: Record<string, never>; Returns: number }
      get_profile_id: { Args: Record<string, never>; Returns: number }
      get_my_role: { Args: Record<string, never>; Returns: string }
      is_same_school: { Args: { target_profile_id: number }; Returns: boolean }
      is_conversation_participant: { Args: { conv_id: number; prof_id: number }; Returns: boolean }
      is_class_teacher_or_principal: { Args: { c_id: string }; Returns: boolean }
      is_enrolled_in_class: { Args: { c_id: string }; Returns: boolean }
      is_student_in_assignment_class: { Args: { assignment_id: number }; Returns: boolean }
      is_parent_of_assignment_student: { Args: { assignment_id: number; student_id: number }; Returns: boolean }
      is_assignment_class_teacher: { Args: { assignment_id: number }; Returns: boolean }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
