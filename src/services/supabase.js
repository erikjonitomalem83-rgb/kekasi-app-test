import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
