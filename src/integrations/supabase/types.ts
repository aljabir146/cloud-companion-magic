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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          label: string
          last_used_at: string | null
          owner_id: string
          prefix: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          label: string
          last_used_at?: string | null
          owner_id: string
          prefix: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          label?: string
          last_used_at?: string | null
          owner_id?: string
          prefix?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      backup_schedules: {
        Row: {
          cadence: string
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          next_run_at: string
          owner_id: string
          vps_id: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string
          owner_id: string
          vps_id: string
        }
        Update: {
          cadence?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string
          owner_id?: string
          vps_id?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          created_at: string
          id: string
          label: string
          owner_id: string
          size_mb: number
          source: string
          status: string
          vps_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          owner_id: string
          size_mb?: number
          source?: string
          status?: string
          vps_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
          size_mb?: number
          source?: string
          status?: string
          vps_id?: string
        }
        Relationships: []
      }
      nodes: {
        Row: {
          agent_secret: string
          api_url: string | null
          cpu_cores: number
          created_at: string
          hostname: string
          id: string
          kind: string
          last_heartbeat: string | null
          location: string
          name: string
          ram_gb: number
          status: string
          storage_gb: number
          tags: string[]
          used_cpu: number
          used_ram: number
          used_storage: number
          verify_ssl: boolean
          vps_capacity: number
        }
        Insert: {
          agent_secret?: string
          api_url?: string | null
          cpu_cores?: number
          created_at?: string
          hostname: string
          id?: string
          kind?: string
          last_heartbeat?: string | null
          location?: string
          name: string
          ram_gb?: number
          status?: string
          storage_gb?: number
          tags?: string[]
          used_cpu?: number
          used_ram?: number
          used_storage?: number
          verify_ssl?: boolean
          vps_capacity?: number
        }
        Update: {
          agent_secret?: string
          api_url?: string | null
          cpu_cores?: number
          created_at?: string
          hostname?: string
          id?: string
          kind?: string
          last_heartbeat?: string | null
          location?: string
          name?: string
          ram_gb?: number
          status?: string
          storage_gb?: number
          tags?: string[]
          used_cpu?: number
          used_ram?: number
          used_storage?: number
          verify_ssl?: boolean
          vps_capacity?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      port_forwards: {
        Row: {
          created_at: string
          external_port: number
          id: string
          internal_port: number
          owner_id: string
          protocol: string
          vps_id: string
        }
        Insert: {
          created_at?: string
          external_port: number
          id?: string
          internal_port: number
          owner_id: string
          protocol?: string
          vps_id: string
        }
        Update: {
          created_at?: string
          external_port?: number
          id?: string
          internal_port?: number
          owner_id?: string
          protocol?: string
          vps_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "port_forwards_vps_id_fkey"
            columns: ["vps_id"]
            isOneToOne: false
            referencedRelation: "vps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
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
      vps: {
        Row: {
          cpu: number
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string | null
          name: string
          node_id: string | null
          os: string
          owner_id: string
          ram_mb: number
          status: string
          storage_gb: number
          type: string
        }
        Insert: {
          cpu?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          name: string
          node_id?: string | null
          os?: string
          owner_id: string
          ram_mb?: number
          status?: string
          storage_gb?: number
          type?: string
        }
        Update: {
          cpu?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          node_id?: string | null
          os?: string
          owner_id?: string
          ram_mb?: number
          status?: string
          storage_gb?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vps_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      vps_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          message: string | null
          vps_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          message?: string | null
          vps_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          message?: string | null
          vps_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vps_logs_vps_id_fkey"
            columns: ["vps_id"]
            isOneToOne: false
            referencedRelation: "vps"
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
