// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function generateRandomDates() {
  const dates = [];
  const segment1 = {
    min: 3,
    max: 10,
  };
  const segment2 = {
    min: 11,
    max: 20,
  };
  const segment3 = {
    min: 21,
    max: 28,
  };
  dates.push(Math.floor(Math.random() * (segment1.max - segment1.min + 1)) + segment1.min);
  dates.push(Math.floor(Math.random() * (segment2.max - segment2.min + 1)) + segment2.min);
  dates.push(Math.floor(Math.random() * (segment3.max - segment3.min + 1)) + segment3.min);
  return dates.sort((a, b) => a - b);
}
interface NomorSurat {
  id?: number;
  kode_kanwil: string;
  kode_upt: string;
  kode_masalah: string;
  kode_submasalah1: string;
  kode_submasalah2: string;
  nomor_urut: number;
}

interface Combination extends NomorSurat {
  highest: number;
}

serve(async (req: Request) => {
  try {
    const { force } = await req.json().catch(() => ({ force: false }));
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();
    const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const yearMonth = wibTime.toISOString().substring(0, 7);
    const today = wibTime.getDate();
    const todayStr = wibTime.toISOString().split("T")[0];
    const logPrefix = `[${todayStr} ${wibTime.toTimeString().substring(0, 8)} WIB]${force ? " [FORCE]" : ""}`;
    console.log(`${logPrefix} Running auto-reserve check`);

    // Check schedule
    let { data: schedule, error: scheduleError } = await supabase
      .from("admin_pool_schedule")
      .select("*")
      .eq("year_month", yearMonth)
      .single();

    if (scheduleError && scheduleError.code === "PGRST116") {
      const randomDates = generateRandomDates();
      console.log(`[${yearMonth}] Creating schedule:`, randomDates);
      const { data: newSchedule, error: insertError } = await supabase
        .from("admin_pool_schedule")
        .insert({
          year_month: yearMonth,
          scheduled_dates: randomDates,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      schedule = newSchedule;
    } else if (scheduleError) {
      throw scheduleError;
    }

    const scheduledDates = schedule.scheduled_dates;
    if (!force && !scheduledDates.includes(today)) {
      return new Response(
        JSON.stringify({
          message: "Not scheduled today",
          today,
          scheduled: scheduledDates,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check existing pool count
    const { data: existingPool } = await supabase
      .from("nomor_surat")
      .select("*")
      .like("tanggal", `${yearMonth}%`)
      .eq("keterangan", "ADMIN_EMERGENCY_POOL");

    const poolCount = existingPool?.length || 0;
    console.log(`[POOL STATUS] Current pool count: ${poolCount}/3 for ${yearMonth}`);

    if (poolCount >= 3) {
      console.log("[POOL STATUS] Pool already complete, skipping...");
      return new Response(
        JSON.stringify({
          message: "Pool complete",
          count: poolCount,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 1. Ambil highest yang CONFIRMED saja
    const { data: activeCombos } = await supabase
      .from("nomor_surat")
      .select("kode_kanwil, kode_upt, kode_masalah, kode_submasalah1, kode_submasalah2, nomor_urut")
      .like("tanggal", `${yearMonth}%`)
      .eq("status", "confirmed")
      .neq("keterangan", "ADMIN_EMERGENCY_POOL")
      .order("nomor_urut", {
        ascending: false,
      });

    console.log(`[DATA SOURCE] Found ${activeCombos?.length || 0} confirmed numbers`);

    // 2. Jika tidak ada confirmed, ambil dari SEMUA status sebagai fallback
    let fallbackCombos: NomorSurat[] | null = null;
    if (!activeCombos || activeCombos.length === 0) {
      console.log("[FALLBACK] No confirmed numbers, checking all statuses...");
      const { data: allCombos } = await supabase
        .from("nomor_surat")
        .select("kode_kanwil, kode_upt, kode_masalah, kode_submasalah1, kode_submasalah2, nomor_urut")
        .like("tanggal", `${yearMonth}%`)
        .neq("keterangan", "ADMIN_EMERGENCY_POOL")
        .order("nomor_urut", {
          ascending: false,
        });
      fallbackCombos = allCombos as NomorSurat[] | null;
      console.log(`[FALLBACK] Found ${fallbackCombos?.length || 0} numbers from all statuses`);
    }

    // 3. Group by combination
    const dataToProcess = (activeCombos && activeCombos.length > 0 ? activeCombos : fallbackCombos) as NomorSurat[];
    const combinations: Record<string, Combination> = {};

    dataToProcess?.forEach((n: NomorSurat) => {
      const key = `${n.kode_kanwil}-${n.kode_upt}-${n.kode_masalah}-${n.kode_submasalah1}-${n.kode_submasalah2}`;
      if (!combinations[key] || n.nomor_urut > combinations[key].highest) {
        combinations[key] = {
          ...n,
          highest: n.nomor_urut,
        } as Combination;
      }
    });

    const comboCount = Object.keys(combinations).length;
    console.log(`[COMBINATIONS] Found ${comboCount} unique combination(s)`);
    console.log(`[DATA SOURCE] Using: ${activeCombos?.length > 0 ? "CONFIRMED numbers" : "FALLBACK (all statuses)"}`);
    if (comboCount === 0) {
      console.log("[WARNING] No combinations to process. Database might be empty for this month.");
      return new Response(
        JSON.stringify({
          success: true,
          reserved: 0,
          pool_count: poolCount,
          message: "No active combinations found",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    // DECLARE results array
    const results = [];
    // DECLARE expiredAt
    const expiredAt = new Date();
    expiredAt.setFullYear(expiredAt.getFullYear() + 10);
    const needToReserve = 3 - poolCount;
    console.log(
      `[PROCESSING] Need to reserve ${needToReserve} more number(s) to complete pool (current: ${poolCount}/3)`
    );
    // ======================================
    // PARANOID MODE: Check if system is locked
    // ======================================
    console.log(`[LOCK CHECK] Checking if reserve system is locked...`);
    const { data: lockData, error: lockError } = await supabase.from("reserve_lock").select("*").eq("id", 1).single();
    if (lockError) {
      console.error("[LOCK CHECK] Error checking lock:", lockError.message);
      // Continue anyway (fail-safe)
    } else if (lockData && lockData.is_locked) {
      console.log(`[LOCK CHECK] System is LOCKED by user: ${lockData.locked_by_user_name}`);
      console.log(`[LOCK CHECK] Locked at: ${lockData.locked_at}`);
      // Check timeout (5 menit)
      const lockTime = new Date(lockData.locked_at).getTime();
      const nowTime = Date.now();
      const diffMinutes = (nowTime - lockTime) / 1000 / 60;
      if (diffMinutes > 5) {
        console.log(`[LOCK CHECK] Lock timeout (${diffMinutes.toFixed(1)} minutes), force releasing...`);
        // Force release lock
        await supabase
          .from("reserve_lock")
          .update({
            is_locked: false,
            locked_by_user_id: null,
            locked_by_user_name: null,
            locked_at: null,
          })
          .eq("id", 1);
        console.log(`[LOCK CHECK] Lock force released, continuing...`);
      } else {
        console.log(`[LOCK CHECK] Lock is active (${diffMinutes.toFixed(1)} minutes), waiting 30 seconds...`);
        // Wait 30 detik
        await new Promise((resolve) => setTimeout(resolve, 30000));
        // Re-check lock setelah wait
        const { data: recheckLock } = await supabase.from("reserve_lock").select("*").eq("id", 1).single();
        if (recheckLock && recheckLock.is_locked) {
          console.log(`[LOCK CHECK] Still locked after 30s, ABORTING edge function`);
          return new Response(
            JSON.stringify({
              success: false,
              message: "System locked by user, aborted to prevent collision",
              locked_by: recheckLock.locked_by_user_name,
              locked_at: recheckLock.locked_at,
              will_retry: "Edge function will retry on next scheduled run",
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        } else {
          console.log(`[LOCK CHECK] Lock released after wait, continuing...`);
        }
      }
    } else {
      console.log(`[LOCK CHECK] System is FREE, safe to proceed`);
    }
    // ======================================
    // END PARANOID MODE
    // ======================================
    console.log(`[PROCESSING] Starting to process ${comboCount} combination(s)...`);
    // 4. Untuk setiap combo, cari cancelled DIBAWAH highest
    let processedCount = 0;
    for (const combo of Object.values(combinations)) {
      processedCount++;
      const comboKey = `${combo.kode_kanwil}-${combo.kode_upt}-${combo.kode_masalah}.${combo.kode_submasalah1}.${combo.kode_submasalah2}`;
      console.log(`[${processedCount}/${comboCount}] Processing combo: ${comboKey}, highest: ${combo.highest}`);
      const { data: cancelledBelow } = await supabase
        .from("nomor_surat")
        .select("nomor_urut, id")
        .eq("kode_kanwil", combo.kode_kanwil)
        .eq("kode_upt", combo.kode_upt)
        .eq("kode_masalah", combo.kode_masalah)
        .eq("kode_submasalah1", combo.kode_submasalah1)
        .eq("kode_submasalah2", combo.kode_submasalah2)
        .eq("status", "cancelled")
        .neq("keterangan", "ADMIN_EMERGENCY_POOL")
        .lt("nomor_urut", combo.highest)
        .order("nomor_urut", {
          ascending: false,
        })
        .limit(1);
      let reservedNomor;
      let reserveMethod = "";
      if (cancelledBelow && cancelledBelow.length > 0) {
        // Reuse cancelled dibawah
        reservedNomor = cancelledBelow[0].nomor_urut;
        reserveMethod = "REUSE";
        console.log(`  → [REUSE] Found cancelled nomor ${reservedNomor} below ${combo.highest}`);
        // DELETE cancelled lama
        await supabase.from("nomor_surat").delete().eq("id", cancelledBelow[0].id);
      } else {
        // Ambil nomor baru
        reservedNomor = combo.highest + 1;
        reserveMethod = "NEW";
        console.log(`  → [NEW] No cancelled below, creating new nomor ${reservedNomor} (max+1)`);
      }
      // INSERT admin pool
      const cleanSubMasalah2 = (combo.kode_submasalah2 || "").toString().trim();
      const nomorLengkap =
        cleanSubMasalah2 !== ""
          ? `${combo.kode_kanwil}.${combo.kode_upt}-${combo.kode_masalah}.${combo.kode_submasalah1}.${cleanSubMasalah2}-${reservedNomor}`
          : `${combo.kode_kanwil}.${combo.kode_upt}-${combo.kode_masalah}.${combo.kode_submasalah1}-${reservedNomor}`;
      const { data, error: insertError } = await supabase
        .from("nomor_surat")
        .insert({
          kode_kanwil: combo.kode_kanwil,
          kode_upt: combo.kode_upt,
          kode_masalah: combo.kode_masalah,
          kode_submasalah1: combo.kode_submasalah1,
          kode_submasalah2: combo.kode_submasalah2 || "",
          nomor_urut: reservedNomor,
          nomor_lengkap: nomorLengkap,
          tanggal: todayStr,
          status: "reserved",
          user_id: null,
          reserved_at: new Date().toISOString(),
          expired_at: expiredAt.toISOString(),
          keterangan: "ADMIN_EMERGENCY_POOL",
        })
        .select();
      if (insertError) {
        console.error(`  → [ERROR] Failed to insert nomor ${reservedNomor}:`, insertError.message);
      } else if (data) {
        results.push(data[0]);
        console.log(`  → [SUCCESS] Reserved nomor ${reservedNomor} for admin pool (method: ${reserveMethod})`);
      }
    }
    console.log(`[COMPLETE] Reserved ${results.length} number(s) for admin pool`);
    console.log(`[POOL STATUS] New pool count: ${poolCount + results.length}/3 for ${yearMonth}`);
    return new Response(
      JSON.stringify({
        success: true,
        reserved: results.length,
        pool_count: poolCount + results.length,
        data: results.map((r) => ({
          nomor_urut: r.nomor_urut,
          combo: `${r.kode_kanwil}-${r.kode_upt}-${r.kode_masalah}.${r.kode_submasalah1}.${r.kode_submasalah2}`,
        })),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("[FATAL ERROR]", error.message);
    console.error("[STACK TRACE]", error.stack);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
