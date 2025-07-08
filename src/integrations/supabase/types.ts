export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          attendance_status: string
          attendance_type: string
          created_at: string
          duration_minutes: number | null
          id: string
          is_verified: boolean | null
          join_time: string | null
          leave_time: string | null
          meeting_id: string
          notes: string | null
          updated_at: string
          user_id: string
          verified_by: string | null
        }
        Insert: {
          attendance_status: string
          attendance_type: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_verified?: boolean | null
          join_time?: string | null
          leave_time?: string | null
          meeting_id: string
          notes?: string | null
          updated_at?: string
          user_id: string
          verified_by?: string | null
        }
        Update: {
          attendance_status?: string
          attendance_type?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_verified?: boolean | null
          join_time?: string | null
          leave_time?: string | null
          meeting_id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      document_analytics: {
        Row: {
          action_type: string
          created_at: string
          device_type: string | null
          document_id: string
          document_type: string
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          device_type?: string | null
          document_id: string
          document_type: string
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          device_type?: string | null
          document_id?: string
          document_type?: string
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_analytics_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_views: {
        Row: {
          completion_percentage: number | null
          document_id: string
          id: string
          last_page_viewed: number | null
          time_spent_seconds: number | null
          user_id: string
          view_ended_at: string | null
          view_started_at: string | null
        }
        Insert: {
          completion_percentage?: number | null
          document_id: string
          id?: string
          last_page_viewed?: number | null
          time_spent_seconds?: number | null
          user_id: string
          view_ended_at?: string | null
          view_started_at?: string | null
        }
        Update: {
          completion_percentage?: number | null
          document_id?: string
          id?: string
          last_page_viewed?: number | null
          time_spent_seconds?: number | null
          user_id?: string
          view_ended_at?: string | null
          view_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_views_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_document_views_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_path: string
          file_size: number | null
          folder: string | null
          folder_id: string | null
          id: string
          is_hidden: boolean | null
          is_important: boolean | null
          is_shared: boolean | null
          is_sharepoint_file: boolean | null
          mime_type: string | null
          name: string
          sharepoint_drive_id: string | null
          sharepoint_file_id: string | null
          sharepoint_id: string | null
          sharepoint_url: string | null
          updated_at: string | null
          uploaded_by: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          file_path: string
          file_size?: number | null
          folder?: string | null
          folder_id?: string | null
          id?: string
          is_hidden?: boolean | null
          is_important?: boolean | null
          is_shared?: boolean | null
          is_sharepoint_file?: boolean | null
          mime_type?: string | null
          name: string
          sharepoint_drive_id?: string | null
          sharepoint_file_id?: string | null
          sharepoint_id?: string | null
          sharepoint_url?: string | null
          updated_at?: string | null
          uploaded_by: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          folder?: string | null
          folder_id?: string | null
          id?: string
          is_hidden?: boolean | null
          is_important?: boolean | null
          is_shared?: boolean | null
          is_sharepoint_file?: boolean | null
          mime_type?: string | null
          name?: string
          sharepoint_drive_id?: string | null
          sharepoint_file_id?: string | null
          sharepoint_id?: string | null
          sharepoint_url?: string | null
          updated_at?: string | null
          uploaded_by?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          outlook_message_id: string | null
          recipients: string[]
          sender_id: string
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          outlook_message_id?: string | null
          recipients: string[]
          sender_id: string
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          outlook_message_id?: string | null
          recipients?: string[]
          sender_id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_hidden: boolean | null
          is_locked: boolean | null
          name: string
          parent_folder_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_hidden?: boolean | null
          is_locked?: boolean | null
          name: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_hidden?: boolean | null
          is_locked?: boolean | null
          name?: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attachments: {
        Row: {
          created_at: string
          download_count: number | null
          file_path: string
          file_size: number | null
          id: string
          meeting_id: string
          mime_type: string | null
          name: string
          uploaded_by: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          download_count?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          meeting_id: string
          mime_type?: string | null
          name: string
          uploaded_by: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          download_count?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          meeting_id?: string
          mime_type?: string | null
          name?: string
          uploaded_by?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attachments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          id: string
          meeting_id: string
          rsvp_response: string | null
          rsvp_submitted_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          meeting_id: string
          rsvp_response?: string | null
          rsvp_submitted_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          meeting_id?: string
          rsvp_response?: string | null
          rsvp_submitted_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          action_items: Json | null
          created_at: string
          id: string
          meeting_id: string
          participants: Json | null
          summary: string | null
          teams_transcript_id: string | null
          transcript_content: string | null
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          created_at?: string
          id?: string
          meeting_id: string
          participants?: Json | null
          summary?: string | null
          teams_transcript_id?: string | null
          transcript_content?: string | null
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          created_at?: string
          id?: string
          meeting_id?: string
          participants?: Json | null
          summary?: string | null
          teams_transcript_id?: string | null
          transcript_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string
          id: string
          location: string | null
          meeting_type: string | null
          outlook_event_id: string | null
          rsvp_enabled: boolean | null
          start_time: string
          status: string | null
          teams_join_url: string | null
          teams_meeting_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          location?: string | null
          meeting_type?: string | null
          outlook_event_id?: string | null
          rsvp_enabled?: boolean | null
          start_time: string
          status?: string | null
          teams_join_url?: string | null
          teams_meeting_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          location?: string | null
          meeting_type?: string | null
          outlook_event_id?: string | null
          rsvp_enabled?: boolean | null
          start_time?: string
          status?: string | null
          teams_join_url?: string | null
          teams_meeting_id?: string | null
          title?: string
        }
        Relationships: []
      }
      member_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          first_name: string
          id: string
          invited_by: string
          last_name: string
          phone: string | null
          role: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          first_name: string
          id?: string
          invited_by: string
          last_name: string
          phone?: string | null
          role: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          first_name?: string
          id?: string
          invited_by?: string
          last_name?: string
          phone?: string | null
          role?: string
          status?: string | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          identifier: string
          otp_code: string
          type: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          identifier: string
          otp_code: string
          type: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          identifier?: string
          otp_code?: string
          type?: string
        }
        Relationships: []
      }
      poll_attachments: {
        Row: {
          created_at: string
          download_count: number | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          poll_id: string
          uploaded_by: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          download_count?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          poll_id: string
          uploaded_by: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          download_count?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          poll_id?: string
          uploaded_by?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_attachments_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_notifications: {
        Row: {
          id: string
          notification_type: string
          poll_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_type: string
          poll_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string
          poll_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_notifications_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          comment: string | null
          id: string
          poll_id: string
          sub_poll_id: string
          user_id: string
          vote: string
          voted_at: string
        }
        Insert: {
          comment?: string | null
          id?: string
          poll_id: string
          sub_poll_id: string
          user_id: string
          vote: string
          voted_at?: string
        }
        Update: {
          comment?: string | null
          id?: string
          poll_id?: string
          sub_poll_id?: string
          user_id?: string
          vote?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_sub_poll_id_fkey"
            columns: ["sub_poll_id"]
            isOneToOne: false
            referencedRelation: "sub_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          deadline: string
          description: string | null
          id: string
          is_secret: boolean
          notify_members: boolean
          reopen_deadline: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline: string
          description?: string | null
          id?: string
          is_secret?: boolean
          notify_members?: boolean
          reopen_deadline?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          notify_members?: boolean
          reopen_deadline?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_suspended: boolean | null
          last_name: string | null
          microsoft_access_token: string | null
          microsoft_refresh_token: string | null
          microsoft_user_id: string | null
          phone: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_suspended?: boolean | null
          last_name?: string | null
          microsoft_access_token?: string | null
          microsoft_refresh_token?: string | null
          microsoft_user_id?: string | null
          phone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_suspended?: boolean | null
          last_name?: string | null
          microsoft_access_token?: string | null
          microsoft_refresh_token?: string | null
          microsoft_user_id?: string | null
          phone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recycle_bin: {
        Row: {
          deleted_at: string
          deleted_by: string
          file_path: string
          file_size: number | null
          folder: string | null
          id: string
          is_hidden: boolean | null
          is_important: boolean | null
          mime_type: string | null
          name: string
          original_created_at: string
          original_document_id: string
          original_updated_at: string
          permanent_delete_at: string
          uploaded_by: string
        }
        Insert: {
          deleted_at?: string
          deleted_by: string
          file_path: string
          file_size?: number | null
          folder?: string | null
          id?: string
          is_hidden?: boolean | null
          is_important?: boolean | null
          mime_type?: string | null
          name: string
          original_created_at: string
          original_document_id: string
          original_updated_at: string
          permanent_delete_at?: string
          uploaded_by: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string
          file_path?: string
          file_size?: number | null
          folder?: string | null
          id?: string
          is_hidden?: boolean | null
          is_important?: boolean | null
          mime_type?: string | null
          name?: string
          original_created_at?: string
          original_document_id?: string
          original_updated_at?: string
          permanent_delete_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      sharepoint_files: {
        Row: {
          created_at: string
          document_id: string | null
          download_url: string | null
          drive_id: string
          etag: string | null
          id: string
          item_id: string
          sharepoint_id: string
          sharepoint_url: string
          updated_at: string
          web_url: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          download_url?: string | null
          drive_id: string
          etag?: string | null
          id?: string
          item_id: string
          sharepoint_id: string
          sharepoint_url: string
          updated_at?: string
          web_url?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          download_url?: string | null
          drive_id?: string
          etag?: string | null
          id?: string
          item_id?: string
          sharepoint_id?: string
          sharepoint_url?: string
          updated_at?: string
          web_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sharepoint_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_polls: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_index: number
          poll_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          poll_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          poll_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_polls_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown | null
          last_active: string
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_active?: string
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_active?: string
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_close_reopened_polls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_recycle_bin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enforce_session_limit: {
        Args: {
          _user_id: string
          _session_id: string
          _device_info?: Json
          _ip_address?: unknown
          _user_agent?: string
        }
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_folder_path: {
        Args: { folder_id: string }
        Returns: string
      }
      get_poll_stats: {
        Args: { poll_id_param: string }
        Returns: {
          total_voters: number
          voted_count: number
          pending_count: number
          sub_poll_count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      increment_download_count: {
        Args: { table_name: string; attachment_id: string }
        Returns: undefined
      }
      increment_view_count: {
        Args: { table_name: string; attachment_id: string }
        Returns: undefined
      }
      is_admin_or_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_super_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      move_to_recycle_bin: {
        Args: { _document_id: string; _deleted_by: string }
        Returns: undefined
      }
      reopen_poll: {
        Args: { poll_id_param: string }
        Returns: undefined
      }
      reopen_poll_with_deadline: {
        Args: { poll_id_param: string; minutes_param: number }
        Returns: undefined
      }
      reset_all_poll_votes: {
        Args: { poll_id_param: string }
        Returns: undefined
      }
      reset_user_poll_votes: {
        Args: { poll_id_param: string; user_id_param: string }
        Returns: undefined
      }
      restore_from_recycle_bin: {
        Args: { _recycle_bin_id: string }
        Returns: undefined
      }
      update_expired_polls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member" | "secretary" | "treasurer" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "secretary", "treasurer", "super_admin"],
    },
  },
} as const
