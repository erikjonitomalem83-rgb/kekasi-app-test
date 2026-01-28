/* eslint-env node */
/* global process */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx-js-style";
import fs from "fs";
import path from "path";

// Manual .env loader workaround since npm install is restricted
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts
          .slice(1)
          .join("=")
          .trim()
          .replace(/^"(.*)"$/, "$1");
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_TARGET_DIR = "D:\\KEPEGAWAIAN\\000_KEKASI RECORD";

const BORDER_STYLE = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};

async function generateAutoRekap() {
  console.log(`[${new Date().toISOString()}] Starting automated recap...`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const currentYear = new Date().getFullYear();

  try {
    // 0. Fetch Dynamic Path
    let targetDir = DEFAULT_TARGET_DIR;
    try {
      const { data: pathSetting, error: pathError } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "rekap_path")
        .single();

      if (!pathError && pathSetting?.value) {
        targetDir = pathSetting.value;
        console.log(`[INFO] Using dynamic path from DB: ${targetDir}`);
      } else {
        console.log(`[INFO] Using default fallback path: ${targetDir}`);
      }
    } catch {
      console.warn("[WARN] Failed to fetch dynamic path, using fallback:", targetDir);
    }

    if (!fs.existsSync(targetDir)) {
      console.log(`[INFO] Creating directory: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Fetch data for current year
    const { data, error } = await supabase
      .from("nomor_surat")
      .select(
        `
        *,
        users!nomor_surat_user_id_fkey (
          nama_lengkap,
          seksi
        )
      `
      )
      .eq("tahun", currentYear)
      .order("tanggal", { ascending: true })
      .order("nomor_urut", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log("No data found for this year. Skipping.");
      return;
    }

    // 2. Determine sequence number
    const files = fs.readdirSync(targetDir);
    let maxSeq = 0;
    files.forEach((f) => {
      const match = f.match(/^(\d{3})_/);
      if (match) {
        const seq = parseInt(match[1]);
        if (seq > maxSeq) maxSeq = seq;
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(3, "0");

    // 3. Generate Workbook
    const workbook = XLSX.utils.book_new();

    // --- SUMMARY SHEET ---
    const groupedByMonth = {};
    data.forEach((item) => {
      const month = item.tanggal.substring(0, 7);
      if (!groupedByMonth[month]) groupedByMonth[month] = [];
      groupedByMonth[month].push(item);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_aoa(
      summarySheet,
      [
        ["AGENDA SURAT - REKAP TAHUNAN"],
        ["KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR"],
        [`Tahun: ${currentYear}`],
        [],
        ["BULAN", "TOTAL NOMOR", "CONFIRMED", "RESERVED", "CANCELLED"],
      ],
      { origin: "A1" }
    );

    const summaryRows = Object.keys(groupedByMonth)
      .sort()
      .map((month) => {
        const monthData = groupedByMonth[month];
        const stats = calculateStats(monthData);
        return [
          `${getBulanNama(month.split("-")[1])} ${currentYear}`,
          stats.total,
          stats.confirmed,
          stats.reserved,
          stats.cancelled,
        ];
      });
    XLSX.utils.sheet_add_aoa(summarySheet, summaryRows, { origin: "A6" });

    const summaryLastRow = 6 + summaryRows.length - 1;
    applySheetStyles(summarySheet, 5, summaryLastRow, ["A", "B", "C", "D", "E"]);
    summarySheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // --- DETAIL SHEETS ---
    Object.keys(groupedByMonth)
      .sort()
      .forEach((month) => {
        const monthData = groupedByMonth[month];
        const bulanNama = getBulanNama(month.split("-")[1]);
        const detailSheet = XLSX.utils.aoa_to_sheet([]);

        XLSX.utils.sheet_add_aoa(
          detailSheet,
          [
            ["DETAIL AGENDA SURAT"],
            [`Bulan: ${bulanNama} ${currentYear}`],
            [],
            [
              "NO",
              "NO SURAT",
              "KODE SURAT",
              "TANGGAL",
              "HAL/PERIHAL",
              "PENGAMBIL NOMOR",
              "SEKSI",
              "STATUS",
              "CATATAN ARSIP",
            ],
          ],
          { origin: "A1" }
        );

        const dataRows = monthData.map((n, i) => [
          i + 1,
          n.nomor_urut,
          n.nomor_lengkap,
          formatDate(n.tanggal),
          n.keterangan || "-",
          n.users?.nama_lengkap || "-",
          n.users?.seksi || "-",
          n.status.toUpperCase(),
          getCatatanArsip(n),
        ]);

        XLSX.utils.sheet_add_aoa(detailSheet, dataRows, { origin: "A5" });

        const detailLastRow = 5 + dataRows.length - 1;
        const detailCols = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
        applySheetStyles(detailSheet, 4, detailLastRow, detailCols);

        const allRowsForWidth = [
          [
            "NO",
            "NO SURAT",
            "KODE SURAT",
            "TANGGAL",
            "HAL/PERIHAL",
            "PENGAMBIL NOMOR",
            "SEKSI",
            "STATUS",
            "CATATAN ARSIP",
          ],
          ...dataRows,
        ];
        detailSheet["!cols"] = calculateColumnWidths(allRowsForWidth, [5, 12, 30, 18, 50, 25, 22, 12, 40]);

        XLSX.utils.book_append_sheet(workbook, detailSheet, bulanNama.substring(0, 31));
      });

    // 4. Save file
    const filename = `${nextSeq}_Rekap_Tahunan_${currentYear}_${new Date().toISOString().split("T")[0]}.xlsx`;
    const filePath = path.join(targetDir, filename);

    XLSX.writeFile(workbook, filePath);
    console.log(`[SUCCESS] File saved to: ${filePath}`);
  } catch (err) {
    console.error("[ERROR]", err);
  }
}

function applySheetStyles(sheet, headerRowNum, lastDataRow, cols) {
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
      if (!sheet[cellRef]) sheet[cellRef] = { v: "", t: "s" };
      sheet[cellRef].s = {
        alignment: { vertical: "center", horizontal: col === "A" || col === "B" ? "center" : "left" },
        border: BORDER_STYLE,
      };
    });
  }
}

function calculateColumnWidths(data, minWidths) {
  const colWidths = data[0].map((_, i) => ({ wch: minWidths[i] || 10 }));
  data.forEach((row) => {
    row.forEach((cell, i) => {
      const val = String(cell || "");
      const width = val.length + 3;
      if (width > colWidths[i].wch) colWidths[i].wch = Math.min(width, 60);
    });
  });
  return colWidths;
}

function calculateStats(data) {
  return {
    total: data.length,
    confirmed: data.filter((n) => n.status === "confirmed").length,
    reserved: data.filter((n) => n.status === "reserved").length,
    cancelled: data.filter((n) => n.status === "cancelled").length,
  };
}

function getCatatanArsip(nomor) {
  if (!nomor.reserved_at || !nomor.tanggal) return "-";
  const reservedDate = new Date(nomor.reserved_at);
  const reservedLocalDate = `${reservedDate.getFullYear()}-${String(reservedDate.getMonth() + 1).padStart(2, "0")}-${String(reservedDate.getDate()).padStart(2, "0")}`;
  if (reservedLocalDate !== nomor.tanggal) {
    return `Diambil tgl ${formatDate(reservedLocalDate)} (hari libur/weekend)`;
  }
  return "-";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function getBulanNama(m) {
  const map = {
    "01": "Januari",
    "02": "Februari",
    "03": "Maret",
    "04": "April",
    "05": "Mei",
    "06": "Juni",
    "07": "Juli",
    "08": "Agustus",
    "09": "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
  };
  return map[m] || m;
}

generateAutoRekap();
