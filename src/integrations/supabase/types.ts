export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      application_timeline: {
        Row: {
          application_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_timeline_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string
          created_at: string
          current_stage: string | null
          id: string
          job_id: string
          last_interaction: string | null
          match_score: number | null
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          current_stage?: string | null
          id?: string
          job_id: string
          last_interaction?: string | null
          match_score?: number | null
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          current_stage?: string | null
          id?: string
          job_id?: string
          last_interaction?: string | null
          match_score?: number | null
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          sender: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          sender: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          size: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_summary: Json | null
          created_at: string
          doc_type: string | null
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          is_signed: boolean | null
          owner_id: string
          related_application_id: string | null
          related_job_id: string | null
          signature_data: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: Json | null
          created_at?: string
          doc_type?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          is_signed?: boolean | null
          owner_id: string
          related_application_id?: string | null
          related_job_id?: string | null
          signature_data?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: Json | null
          created_at?: string
          doc_type?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          is_signed?: boolean | null
          owner_id?: string
          related_application_id?: string | null
          related_job_id?: string | null
          signature_data?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_levels: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name_en: string
          name_he: string
          slug: string
          years_max: number | null
          years_min: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name_en: string
          name_he: string
          slug: string
          years_max?: number | null
          years_min?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name_en?: string
          name_he?: string
          slug?: string
          years_max?: number | null
          years_min?: number
        }
        Relationships: []
      }
      home_assignments: {
        Row: {
          application_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          notes: string | null
          uploaded_at: string
        }
        Insert: {
          application_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_reminders: {
        Row: {
          application_id: string
          created_at: string
          id: string
          interview_date: string
          interview_type: string | null
          location: string | null
          notes: string | null
          reminder_sent: boolean | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          interview_date: string
          interview_type?: string | null
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          interview_date?: string
          interview_type?: string | null
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_reminders_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          created_at: string | null
          experience_level_ids: string[] | null
          field_ids: string[] | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          location: string | null
          role_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          experience_level_ids?: string[] | null
          field_ids?: string[] | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          location?: string | null
          role_ids?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          experience_level_ids?: string[] | null
          field_ids?: string[] | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          location?: string | null
          role_ids?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_fields: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name_en: string
          name_he: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name_en: string
          name_he: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name_en?: string
          name_he?: string
          slug?: string
        }
        Relationships: []
      }
      job_roles: {
        Row: {
          created_at: string
          display_order: number
          field_id: string
          id: string
          name_en: string
          name_he: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_id: string
          id?: string
          name_en: string
          name_he: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_id?: string
          id?: string
          name_en?: string
          name_he?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_roles_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "job_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_summary: Json | null
          category: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          experience_level_id: string | null
          field_id: string | null
          id: string
          is_community_shared: boolean | null
          job_type: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          requirements: string | null
          role_id: string | null
          salary_range: string | null
          shared_by_user_id: string | null
          source_url: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: Json | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_level_id?: string | null
          field_id?: string | null
          id?: string
          is_community_shared?: boolean | null
          job_type?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          requirements?: string | null
          role_id?: string | null
          salary_range?: string | null
          shared_by_user_id?: string | null
          source_url?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: Json | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_level_id?: string | null
          field_id?: string | null
          id?: string
          is_community_shared?: boolean | null
          job_type?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          requirements?: string | null
          role_id?: string | null
          salary_range?: string | null
          shared_by_user_id?: string | null
          source_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_experience_level_id_fkey"
            columns: ["experience_level_id"]
            isOneToOne: false
            referencedRelation: "experience_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "job_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "jobs_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          related_application_id: string | null
          related_job_id: string | null
          to_user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          related_application_id?: string | null
          related_job_id?: string | null
          to_user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          related_application_id?: string | null
          related_job_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_recruiter_contact: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          email_notifications: boolean | null
          experience_years: number | null
          full_name: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_experience_level_id: string | null
          preferred_fields: string[] | null
          preferred_language: string | null
          preferred_roles: string[] | null
          profile_visibility: string | null
          theme: string | null
          updated_at: string
          user_id: string
          visible_to_hr: boolean | null
        }
        Insert: {
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
          visible_to_hr?: boolean | null
        }
        Update: {
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          visible_to_hr?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_experience_level_id_fkey"
            columns: ["preferred_experience_level_id"]
            isOneToOne: false
            referencedRelation: "experience_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruiter_candidate_notes: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          note: string
          recruiter_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          note: string
          recruiter_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          note?: string
          recruiter_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouches: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          is_public: boolean | null
          message: string
          relationship: string | null
          skills: string[] | null
          to_user_id: string
          updated_at: string | null
          vouch_type: Database["public"]["Enums"]["vouch_type"]
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          is_public?: boolean | null
          message: string
          relationship?: string | null
          skills?: string[] | null
          to_user_id: string
          updated_at?: string | null
          vouch_type: Database["public"]["Enums"]["vouch_type"]
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_public?: boolean | null
          message?: string
          relationship?: string | null
          skills?: string[] | null
          to_user_id?: string
          updated_at?: string | null
          vouch_type?: Database["public"]["Enums"]["vouch_type"]
        }
        Relationships: []
      }
    }
    Views: {
      profiles_secure: {
        Row: {
          allow_recruiter_contact: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          email_notifications: boolean | null
          experience_years: number | null
          full_name: string | null
          github_url: string | null
          id: string | null
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_experience_level_id: string | null
          preferred_fields: string[] | null
          preferred_language: string | null
          preferred_roles: string[] | null
          profile_visibility: string | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
          visible_to_hr: boolean | null
        }
        Insert: {
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: never
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          id?: string | null
          linkedin_url?: string | null
          phone?: never
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible_to_hr?: boolean | null
        }
        Update: {
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: never
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          id?: string | null
          linkedin_url?: string | null
          phone?: never
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible_to_hr?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_experience_level_id_fkey"
            columns: ["preferred_experience_level_id"]
            isOneToOne: false
            referencedRelation: "experience_levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_contact_details: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      create_audit_log_entry: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "job_seeker"
        | "freelance_hr"
        | "inhouse_hr"
        | "company_employee"
      vouch_type: "colleague" | "manager" | "recruiter" | "friend" | "mentor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "job_seeker",
        "freelance_hr",
        "inhouse_hr",
        "company_employee",
      ],
      vouch_type: ["colleague", "manager", "recruiter", "friend", "mentor"],
    },
  },
} as const
