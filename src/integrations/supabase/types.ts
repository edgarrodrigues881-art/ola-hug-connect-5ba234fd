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
      admin_costs: {
        Row: {
          admin_id: string
          amount: number
          category: string
          cost_date: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          admin_id: string
          amount?: number
          category?: string
          cost_date?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          admin_id?: string
          amount?: number
          category?: string
          cost_date?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: string | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: string | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: string | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string | null
          message_rendered: string
          payload_json: Json | null
          phone_number: string | null
          resolved: boolean
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
          user_id: string
          whatsapp_error: string | null
          whatsapp_group_id: string | null
          whatsapp_sent: boolean
          whatsapp_sent_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_rendered: string
          payload_json?: Json | null
          phone_number?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
          user_id: string
          whatsapp_error?: string | null
          whatsapp_group_id?: string | null
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_rendered?: string
          payload_json?: Json | null
          phone_number?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          type?: Database["public"]["Enums"]["alert_type"]
          user_id?: string
          whatsapp_error?: string | null
          whatsapp_group_id?: string | null
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string
          error_message: string | null
          id: string
          name: string | null
          phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          name?: string | null
          phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          name?: string | null
          phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          buttons: Json | null
          completed_at: string | null
          created_at: string
          delivered_count: number | null
          device_id: string | null
          device_ids: Json | null
          failed_count: number | null
          id: string
          max_delay_seconds: number
          media_url: string | null
          message_content: string | null
          message_type: string
          messages_per_instance: number | null
          min_delay_seconds: number
          name: string
          pause_duration_max: number
          pause_duration_min: number
          pause_every_max: number
          pause_every_min: number
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          template_id: string | null
          total_contacts: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          buttons?: Json | null
          completed_at?: string | null
          created_at?: string
          delivered_count?: number | null
          device_id?: string | null
          device_ids?: Json | null
          failed_count?: number | null
          id?: string
          max_delay_seconds?: number
          media_url?: string | null
          message_content?: string | null
          message_type?: string
          messages_per_instance?: number | null
          min_delay_seconds?: number
          name: string
          pause_duration_max?: number
          pause_duration_min?: number
          pause_every_max?: number
          pause_every_min?: number
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_contacts?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          buttons?: Json | null
          completed_at?: string | null
          created_at?: string
          delivered_count?: number | null
          device_id?: string | null
          device_ids?: Json | null
          failed_count?: number | null
          id?: string
          max_delay_seconds?: number
          media_url?: string | null
          message_content?: string | null
          message_type?: string
          messages_per_instance?: number | null
          min_delay_seconds?: number
          name?: string
          pause_duration_max?: number
          pause_duration_min?: number
          pause_every_max?: number
          pause_every_min?: number
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_contacts?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_messages: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          message_content: string
          observation: string | null
          sent_at: string
          template_type: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          message_content: string
          observation?: string | null
          sent_at?: string
          template_type: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          message_content?: string
          observation?: string | null
          sent_at?: string
          template_type?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delay_profiles: {
        Row: {
          created_at: string
          id: string
          max_delay_seconds: number
          min_delay_seconds: number
          name: string
          pause_duration_max: number
          pause_duration_min: number
          pause_every_max: number
          pause_every_min: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_delay_seconds?: number
          min_delay_seconds?: number
          name: string
          pause_duration_max?: number
          pause_duration_min?: number
          pause_every_max?: number
          pause_every_min?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_delay_seconds?: number
          min_delay_seconds?: number
          name?: string
          pause_duration_max?: number
          pause_duration_min?: number
          pause_every_max?: number
          pause_every_min?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          id: string
          login_type: string
          name: string
          number: string | null
          profile_name: string | null
          profile_picture: string | null
          proxy_id: string | null
          status: string
          uazapi_base_url: string | null
          uazapi_token: string | null
          updated_at: string
          user_id: string
          whapi_token: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          login_type?: string
          name: string
          number?: string | null
          profile_name?: string | null
          profile_picture?: string | null
          proxy_id?: string | null
          status?: string
          uazapi_base_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
          user_id: string
          whapi_token?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          login_type?: string
          name?: string
          number?: string | null
          profile_name?: string | null
          profile_picture?: string | null
          proxy_id?: string | null
          status?: string
          uazapi_base_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
          user_id?: string
          whapi_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_proxy_id_fkey"
            columns: ["proxy_id"]
            isOneToOne: false
            referencedRelation: "proxies"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_logs: {
        Row: {
          attempt: number
          created_at: string
          device_id: string
          device_name: string
          duration_ms: number | null
          endpoint_called: string | null
          error_message: string | null
          group_link: string
          group_name: string
          id: string
          invite_code: string
          request_summary: string | null
          response_body: string | null
          response_status: number | null
          result: string
          user_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          device_id: string
          device_name?: string
          duration_ms?: number | null
          endpoint_called?: string | null
          error_message?: string | null
          group_link?: string
          group_name?: string
          id?: string
          invite_code?: string
          request_summary?: string | null
          response_body?: string | null
          response_status?: number | null
          result?: string
          user_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          device_id?: string
          device_name?: string
          duration_ms?: number | null
          endpoint_called?: string | null
          error_message?: string | null
          group_link?: string
          group_name?: string
          id?: string
          invite_code?: string
          request_summary?: string | null
          response_body?: string | null
          response_status?: number | null
          result?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          discount: number
          fee: number
          id: string
          method: string
          notes: string | null
          paid_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          amount?: number
          created_at?: string
          discount?: number
          fee?: number
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          discount?: number
          fee?: number
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          client_type: string
          company: string | null
          created_at: string
          document: string | null
          full_name: string | null
          id: string
          instance_override: number
          phone: string | null
          risk_flag: boolean
          status: string
          updated_at: string
          whatsapp_monitor_token: string | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          client_type?: string
          company?: string | null
          created_at?: string
          document?: string | null
          full_name?: string | null
          id: string
          instance_override?: number
          phone?: string | null
          risk_flag?: boolean
          status?: string
          updated_at?: string
          whatsapp_monitor_token?: string | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          client_type?: string
          company?: string | null
          created_at?: string
          document?: string | null
          full_name?: string | null
          id?: string
          instance_override?: number
          phone?: string | null
          risk_flag?: boolean
          status?: string
          updated_at?: string
          whatsapp_monitor_token?: string | null
        }
        Relationships: []
      }
      proxies: {
        Row: {
          active: boolean
          created_at: string
          display_id: number
          host: string
          id: string
          password: string
          port: string
          status: string
          type: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_id?: number
          host: string
          id?: string
          password: string
          port: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_id?: number
          host?: string
          id?: string
          password?: string
          port?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      report_wa_configs: {
        Row: {
          alert_campaign_end: boolean
          alert_disconnect: boolean
          alert_high_failures: boolean
          campaigns_group_id: string | null
          campaigns_group_name: string | null
          connected_phone: string | null
          connection_group_id: string | null
          connection_group_name: string | null
          connection_status: string
          created_at: string
          device_id: string | null
          frequency: string
          group_id: string | null
          group_name: string | null
          id: string
          toggle_campaigns: boolean
          toggle_instances: boolean
          toggle_warmup: boolean
          updated_at: string
          user_id: string
          warmup_group_id: string | null
          warmup_group_name: string | null
        }
        Insert: {
          alert_campaign_end?: boolean
          alert_disconnect?: boolean
          alert_high_failures?: boolean
          campaigns_group_id?: string | null
          campaigns_group_name?: string | null
          connected_phone?: string | null
          connection_group_id?: string | null
          connection_group_name?: string | null
          connection_status?: string
          created_at?: string
          device_id?: string | null
          frequency?: string
          group_id?: string | null
          group_name?: string | null
          id?: string
          toggle_campaigns?: boolean
          toggle_instances?: boolean
          toggle_warmup?: boolean
          updated_at?: string
          user_id: string
          warmup_group_id?: string | null
          warmup_group_name?: string | null
        }
        Update: {
          alert_campaign_end?: boolean
          alert_disconnect?: boolean
          alert_high_failures?: boolean
          campaigns_group_id?: string | null
          campaigns_group_name?: string | null
          connected_phone?: string | null
          connection_group_id?: string | null
          connection_group_name?: string | null
          connection_status?: string
          created_at?: string
          device_id?: string | null
          frequency?: string
          group_id?: string | null
          group_name?: string | null
          id?: string
          toggle_campaigns?: boolean
          toggle_instances?: boolean
          toggle_warmup?: boolean
          updated_at?: string
          user_id?: string
          warmup_group_id?: string | null
          warmup_group_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_wa_configs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      report_wa_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_cycles: {
        Row: {
          created_at: string
          cycle_amount: number
          cycle_end: string
          cycle_start: string
          id: string
          notes: string | null
          plan_name: string
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_amount?: number
          cycle_end?: string
          cycle_start?: string
          id?: string
          notes?: string | null
          plan_name: string
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_amount?: number
          cycle_end?: string
          cycle_start?: string
          id?: string
          notes?: string | null
          plan_name?: string
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          max_instances: number
          plan_name: string
          plan_price: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          max_instances?: number
          plan_name?: string
          plan_price?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          max_instances?: number
          plan_name?: string
          plan_price?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          buttons: Json | null
          content: string
          created_at: string
          id: string
          media_url: string | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buttons?: Json | null
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buttons?: Json | null
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_tokens: {
        Row: {
          admin_id: string
          assigned_at: string | null
          created_at: string
          device_id: string | null
          id: string
          label: string | null
          status: string
          token: string
          user_id: string
        }
        Insert: {
          admin_id: string
          assigned_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          label?: string | null
          status?: string
          token: string
          user_id: string
        }
        Update: {
          admin_id?: string
          assigned_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          label?: string | null
          status?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_tokens_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
      warmup_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          link: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          link: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          link?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warmup_logs: {
        Row: {
          created_at: string
          device_id: string
          error_message: string | null
          group_jid: string | null
          group_name: string | null
          id: string
          message_content: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          error_message?: string | null
          group_jid?: string | null
          group_name?: string | null
          id?: string
          message_content: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          error_message?: string | null
          group_jid?: string | null
          group_name?: string | null
          id?: string
          message_content?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "warmup_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      warmup_messages: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      warmup_sessions: {
        Row: {
          created_at: string
          current_day: number
          daily_increment: number
          device_id: string
          end_time: string
          id: string
          last_executed_at: string | null
          max_delay_seconds: number
          max_messages_per_day: number
          messages_per_day: number
          messages_sent_today: number
          messages_sent_total: number
          min_delay_seconds: number
          quality_profile: string
          safety_state: string
          start_time: string
          status: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_day?: number
          daily_increment?: number
          device_id: string
          end_time?: string
          id?: string
          last_executed_at?: string | null
          max_delay_seconds?: number
          max_messages_per_day?: number
          messages_per_day?: number
          messages_sent_today?: number
          messages_sent_total?: number
          min_delay_seconds?: number
          quality_profile?: string
          safety_state?: string
          start_time?: string
          status?: string
          total_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_day?: number
          daily_increment?: number
          device_id?: string
          end_time?: string
          id?: string
          last_executed_at?: string | null
          max_delay_seconds?: number
          max_messages_per_day?: number
          messages_per_day?: number
          messages_sent_today?: number
          messages_sent_total?: number
          min_delay_seconds?: number
          quality_profile?: string
          safety_state?: string
          start_time?: string
          status?: string
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "INFO" | "WARNING" | "CRITICAL"
      alert_type:
        | "INSTANCE_CONNECTED"
        | "INSTANCE_DISCONNECTED"
        | "QRCODE_GENERATED"
        | "CAMPAIGN_STARTED"
        | "CAMPAIGN_PAUSED"
        | "CAMPAIGN_FINISHED"
        | "CAMPAIGN_ERROR"
        | "HIGH_FAILURE_RATE"
        | "WARMUP_REPORT_24H"
        | "TEST_ALERT"
      app_role: "admin" | "moderator" | "user"
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
      alert_severity: ["INFO", "WARNING", "CRITICAL"],
      alert_type: [
        "INSTANCE_CONNECTED",
        "INSTANCE_DISCONNECTED",
        "QRCODE_GENERATED",
        "CAMPAIGN_STARTED",
        "CAMPAIGN_PAUSED",
        "CAMPAIGN_FINISHED",
        "CAMPAIGN_ERROR",
        "HIGH_FAILURE_RATE",
        "WARMUP_REPORT_24H",
        "TEST_ALERT",
      ],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
