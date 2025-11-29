import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (error) throw error;

    console.log("[OK] Supabase connection successful!");
    console.log("Settings:", data);
    return { success: true, data };
  } catch (error) {
    console.error("[ERROR] Supabase connection failed:", error.message);
    return { success: false, error: error.message };
  }
}
