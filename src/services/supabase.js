import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// ✅ CRITICAL: Enforce strict singleton pattern
// Check if instance already exists in global scope
if (!window.__SUPABASE_CLIENT__) {
  console.log("[Supabase] Creating new Supabase client instance");
  window.__SUPABASE_CLIENT__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: "kekasi-auth", // Consistent storage key
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
} else {
  console.log("[Supabase] Reusing existing Supabase client instance");
}

export const supabase = window.__SUPABASE_CLIENT__;

// Test connection function
export async function testConnection() {
  try {
    const { data, error } = await supabase.from("settings").select("*");

    if (error) throw error;

    console.log("[OK] Supabase connection successful!");
    console.log("Settings:", data);
    return { success: true, data };
  } catch (error) {
    console.error("[ERROR] Supabase connection failed:", error.message);
    return { success: false, error: error.message };
  }
}
