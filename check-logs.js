import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gjrwfybywntnhapjsyol.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcndmeWJ5d250bmhhcGpzeW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTAxMzcsImV4cCI6MjA3ODM2NjEzN30.tU0vqHFV7LJpIkna70c1f-ffkVQ3b7_h39MwhxvnjK8";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAll() {
  console.log("--- CHECKING DATABASE STATE ---");

  // 1. Check if tables exist by doing simple selects
  const tables = ["edge_function_logs", "admin_pool_schedule", "nomor_surat"];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`[!] Table ${table} ERROR:`, error.message);
    } else {
      console.log(`[OK] Table ${table} exists, count: ${count}`);
    }
  }

  // 2. Sample Logs
  console.log("\n--- LATEST EDGE FUNCTION LOGS ---");
  const { data: logs } = await supabase
    .from("edge_function_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log(logs && logs.length > 0 ? logs : "No logs found.");

  // 3. Current Schedule
  console.log("\n--- CURRENT POOL SCHEDULE ---");
  const { data: schedule } = await supabase
    .from("admin_pool_schedule")
    .select("*")
    .order("year_month", { ascending: false })
    .limit(1);
  console.log(schedule && schedule.length > 0 ? schedule[0] : "No schedule found.");

  // 4. Emergency Pool Items
  console.log("\n--- ANY EMERGENCY POOL ITEMS (ANY DATE) ---");
  const { data: poolItems } = await supabase
    .from("nomor_surat")
    .select("nomor_urut, status, user_id, tanggal, keterangan")
    .eq("keterangan", "ADMIN_EMERGENCY_POOL")
    .order("tanggal", { ascending: false })
    .limit(10);

  if (poolItems && poolItems.length > 0) {
    console.table(poolItems);
  } else {
    console.log("No emergency pool items found in nomor_surat table.");
  }

  // 5. Confirmed numbers for January 2026 (to check if there are any active combos)
  console.log("\n--- CONFIRMED NUMBERS FOR JAN 2026 ---");
  const { data: confirmed } = await supabase
    .from("nomor_surat")
    .select("kode_kanwil, kode_upt, kode_masalah, status")
    .eq("status", "confirmed")
    .gte("tanggal", "2026-01-01")
    .limit(5);
  console.log(`Found ${confirmed?.length || 0} confirmed numbers for Jan 2026.`);
}

checkAll();
