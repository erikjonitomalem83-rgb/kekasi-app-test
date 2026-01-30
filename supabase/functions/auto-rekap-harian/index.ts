// @ts-nocheck
// Auto Rekap Harian - Supabase Edge Function
// Runs daily at 23:59 WIB via pg_cron
// Generates Excel recap and uploads to Supabase Storage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX_MODULE from "https://esm.sh/xlsx-js-style@1.2.0";

// Robust import handling for esm.sh
const XLSX = XLSX_MODULE.default || XLSX_MODULE;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("XLSX Library loaded:", !!XLSX, typeof XLSX.utils?.book_new);

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getCatatanArsip(nomor: any): string {
  if (!nomor.reserved_at || !nomor.tanggal) return "-";

  const reservedDate = new Date(nomor.reserved_at);
  // Convert UTC to WIB for comparison if needed, but here we just check if it was taken on a different day
  const reservedDateWIB = new Date(reservedDate.getTime() + 7 * 60 * 60 * 1000);
  const reservedLocalDate = reservedDateWIB.toISOString().split("T")[0];

  if (reservedLocalDate !== nomor.tanggal) {
    return `Diambil tgl ${formatDate(reservedLocalDate)} (hari libur/weekend)`;
  }
  return "-";
}

const BORDER_STYLE = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};

function applySheetStyles(sheet: any, headerRowNum: number, lastDataRow: number, cols: string[]) {
  // Style Titles
  ["A1", "A2", "A3"].forEach((cell) => {
    if (sheet[cell]) {
      sheet[cell].s = {
        font: { bold: true, sz: cell === "A1" ? 14 : 11 },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  });

  // Merge Title Cells
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: cols.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: cols.length - 1 } },
  ];

  // Style Header
  cols.forEach((col) => {
    const cellRef = `${col}${headerRowNum}`;
    if (!sheet[cellRef]) sheet[cellRef] = { v: "", t: "s" };
    sheet[cellRef].s = {
      fill: { fgColor: { rgb: "9DC3E6" } },
      font: { bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_STYLE,
    };
  });

  // Style Data
  for (let r = headerRowNum + 1; r <= lastDataRow; r++) {
    cols.forEach((col) => {
      const cellRef = `${col}${r}`;
      if (!sheet[cellRef]) {
        sheet[cellRef] = { v: "-", t: "s" };
      }
      sheet[cellRef].s = {
        alignment: {
          vertical: "center",
          horizontal: ["A", "B", "D", "H"].includes(col) ? "center" : "left",
          wrapText: true,
        },
        border: BORDER_STYLE,
      };
    });
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get current date in WIB
  const now = new Date();
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayStr = wibTime.toISOString().split("T")[0];
  const currentYear = wibTime.getFullYear();
  const currentMonth = String(wibTime.getMonth() + 1).padStart(2, "0");
  const firstDayOfYear = `${currentYear}-01-01`;

  const logPrefix = `[${todayStr} ${wibTime.toTimeString().substring(0, 8)} WIB]`;

  try {
    console.log(`${logPrefix} Starting auto rekap harian & yearly backup...`);

    // --- PART 1: DAILY REKAP (Confirmed Only) ---
    const { data: todayData, error: fetchError } = await supabase
      .from("nomor_surat")
      .select(
        `
        *,
        users:nomor_surat_user_id_fkey (
          nama_lengkap,
          seksi
        )
      `
      )
      .eq("tanggal", todayStr)
      .eq("status", "confirmed")
      .order("nomor_urut", { ascending: true });

    if (fetchError) throw fetchError;

    let dailyResult = { status: "skipped", count: 0 };
    if (todayData && todayData.length > 0) {
      const transformedToday = todayData.map((n: any) => ({
        ...n,
        user_nama: n.users?.nama_lengkap || "-",
        user_seksi: n.users?.seksi || "-",
      }));

      const wbHarian = generateWorkbook(
        transformedToday,
        "AGENDA SURAT - REKAP HARIAN OTOMATIS",
        `Tanggal: ${formatDate(todayStr)}`,
        wibTime
      );
      const bufHarian = XLSX.write(wbHarian, { type: "array", bookType: "xlsx" });

      const filenameHarian = `Rekap_Harian_${todayStr}.xlsx`;
      const pathHarian = `harian/${currentYear}/${currentMonth}/${filenameHarian}`;

      const { error: upErr } = await supabase.storage
        .from("rekap-files")
        .upload(pathHarian, new Uint8Array(bufHarian), {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });

      if (upErr) {
        await logToDb(supabase, todayStr, "harian", null, null, 0, "error", upErr.message);
        dailyResult = { status: "error", count: 0 };
      } else {
        await logToDb(supabase, todayStr, "harian", filenameHarian, pathHarian, transformedToday.length, "success");
        dailyResult = { status: "success", count: transformedToday.length };
      }
    } else {
      await logToDb(supabase, todayStr, "harian", null, null, 0, "skipped", "No confirmed data for today");
    }

    // --- PART 2: YEARLY BACKUP (All Statuses) ---
    const { data: yearlyData, error: fetchYearlyError } = await supabase
      .from("nomor_surat")
      .select(
        `
        *,
        users:nomor_surat_user_id_fkey (
          nama_lengkap,
          seksi
        )
      `
      )
      .gte("tanggal", firstDayOfYear)
      .lte("tanggal", todayStr)
      .order("tanggal", { ascending: true })
      .order("nomor_urut", { ascending: true });

    if (fetchYearlyError) throw fetchYearlyError;

    let yearlyResult = { status: "skipped", count: 0 };
    if (yearlyData && yearlyData.length > 0) {
      const transformedYearly = yearlyData.map((n: any) => ({
        ...n,
        user_nama: n.users?.nama_lengkap || "-",
        user_seksi: n.users?.seksi || "-",
      }));

      const wbYearly = generateWorkbook(
        transformedYearly,
        "AGENDA SURAT - BACKUP TAHUNAN (ROLLING)",
        `Periode: 1 Jan ${currentYear} s/d ${formatDate(todayStr)}`,
        wibTime
      );
      const bufYearly = XLSX.write(wbYearly, { type: "array", bookType: "xlsx" });

      const filenameYearly = `Backup_Tahunan_${currentYear}_upto_${todayStr}.xlsx`;
      const pathYearly = `tahunan/${currentYear}/${filenameYearly}`;

      const { error: upYearlyErr } = await supabase.storage
        .from("rekap-files")
        .upload(pathYearly, new Uint8Array(bufYearly), {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });

      if (upYearlyErr) {
        await logToDb(supabase, todayStr, "tahunan", null, null, 0, "error", upYearlyErr.message);
        yearlyResult = { status: "error", count: 0 };
      } else {
        await logToDb(supabase, todayStr, "tahunan", filenameYearly, pathYearly, transformedYearly.length, "success");
        yearlyResult = { status: "success", count: transformedYearly.length };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        daily: dailyResult,
        yearly: yearlyResult,
        date: todayStr,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error(`${logPrefix} [FATAL ERROR]`, error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Helper to generate workbook with standard styling
 */
function generateWorkbook(data: any[], title: string, subtitle: string, wibTime: Date) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  // Add Header
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [title],
      ["KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR"],
      [subtitle],
      [],
      [
        "NO",
        "NO SURAT",
        "KODE SURAT",
        "TANGGAL SURAT",
        "HAL/PERIHAL",
        "PENGAMBIL NOMOR",
        "SEKSI",
        "STATUS",
        "CATATAN ARSIP",
      ],
    ],
    { origin: "A1" }
  );

  // Add Data
  const dataRows = data.map((n: any, i: number) => [
    i + 1,
    n.nomor_urut,
    n.nomor_lengkap,
    formatDate(n.tanggal),
    n.keterangan || "-",
    n.user_nama,
    n.user_seksi,
    n.status.toUpperCase(),
    getCatatanArsip(n),
  ]);

  XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A6" });

  const lastRow = 6 + dataRows.length - 1;
  const summaryStartRow = lastRow + 2;

  // Summary logic
  const stats = {
    total: data.length,
    confirmed: data.filter((n) => n.status === "confirmed").length,
    reserved: data.filter((n) => n.status === "reserved").length,
    cancelled: data.filter((n) => n.status === "cancelled").length,
  };

  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [],
      ["RINGKASAN:"],
      [`Total Nomor: ${stats.total}`],
      [`- Confirmed: ${stats.confirmed}`],
      [`- Reserved: ${stats.reserved}`],
      [`- Cancelled: ${stats.cancelled}`],
      [],
      [`Generated at: ${wibTime.toISOString().replace("T", " ").substring(0, 19)} WIB`],
    ],
    { origin: `A${summaryStartRow}` }
  );

  // Columns Widths
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 35 },
    { wch: 20 },
    { wch: 50 },
    { wch: 25 },
    { wch: 22 },
    { wch: 12 },
    { wch: 40 },
  ];

  const headerCols = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  applySheetStyles(worksheet, 5, lastRow, headerCols);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Rekap");
  return workbook;
}

/**
 * Helper to log results to DB
 */
async function logToDb(
  supabase: any,
  date: string,
  type: string,
  filename: string | null,
  filePath: string | null,
  count: number,
  status: string,
  error?: string
) {
  try {
    await supabase.from("auto_rekap_logs").insert({
      tanggal: date,
      jenis: type,
      filename: filename,
      file_path: filePath,
      total_records: count,
      status: status,
      error_message: error || null,
    });
  } catch (err) {
    console.error(`Logging to DB failed: ${err.message}`);
  }
}
