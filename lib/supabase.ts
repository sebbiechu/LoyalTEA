import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (for API routes only)
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          pin_hash: string;
          role: "colleague" | "manager";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["users"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      stamps: {
        Row: {
          id: string;
          user_id: string;
          drink_type: string;
          reusable_cup: boolean;
          is_redemption: boolean;
          stamped_by: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["stamps"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["stamps"]["Insert"]>;
      };
      drink_types: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          is_active: boolean;
          display_order: number;
        };
        Insert: Omit<
          Database["public"]["Tables"]["drink_types"]["Row"],
          "id"
        >;
        Update: Partial<Database["public"]["Tables"]["drink_types"]["Insert"]>;
      };
    };
  };
};
