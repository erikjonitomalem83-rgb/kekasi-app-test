import * as XLSX from "xlsx-js-style";

/**
 * Generate Excel untuk Rekap Harian
 */
export function generateRekapHarian(data, filters) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  // STEP 1: Add Header (Row 1-4)
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      ["AGENDA SURAT"],
      ["KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR"],
      [`Tanggal: ${formatDate(filters.tanggal)}`],
      [],
    ],
    { origin: "A1" }
  );

  // STEP 2: Add Column Headers (Row 5)
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [["NO", "NO SURAT", "KODE SURAT", "TANGGAL SURAT", "HAL/PERIHAL", "PENGAMBIL NOMOR", "SEKSI", "STATUS"]],
    { origin: "A5" }
  );

  // STEP 3: Add Data (Row 6 onwards)
  const dataRows = data.map((nomor, index) => [
    index + 1,
    nomor.nomor_urut,
    nomor.nomor_lengkap,
    formatDate(nomor.tanggal),
    nomor.keterangan || "-",
    nomor.user_nama || "-",
    nomor.user_seksi || "-",
    nomor.status.toUpperCase(),
  ]);

  XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A6" });

  const lastDataRow = 6 + dataRows.length - 1;
  const summaryStartRow = lastDataRow + 2;

  // STEP 4: Add Summary
  const summary = calculateSummary(data);
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [],
      ["RINGKASAN:"],
      [`Total Nomor: ${summary.total}`],
      [`- Confirmed: ${summary.confirmed}`],
      [`- Reserved: ${summary.reserved}`],
      [`- Cancelled: ${summary.cancelled}`],
    ],
    { origin: `A${summaryStartRow}` }
  );

  // STEP 5: Set Column Widths
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 30 },
    { wch: 18 },
    { wch: 50 },
    { wch: 22 },
    { wch: 20 },
    { wch: 12 },
  ];

  // STEP 6: Merge Header Cells
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
  ];

  // STEP 7: Apply Styles MANUALLY
  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  // Style Header Row 1-3
  ["A1", "A2", "A3"].forEach((cell) => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { bold: true, sz: cell === "A1" ? 14 : cell === "A2" ? 12 : 10 },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  });

  // Style Column Headers Row 5
  const headerCols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  headerCols.forEach((col) => {
    const cellRef = `${col}5`;
    if (!worksheet[cellRef]) worksheet[cellRef] = { v: "", t: "s" };
    worksheet[cellRef].s = {
      fill: { fgColor: { rgb: "9DC3E6" } },
      font: { bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle,
    };
  });

  // Style Data Rows 6 to lastDataRow
  for (let row = 6; row <= lastDataRow; row++) {
    headerCols.forEach((col) => {
      const cellRef = `${col}${row}`;
      if (!worksheet[cellRef]) worksheet[cellRef] = { v: "", t: "s" };
      worksheet[cellRef].s = {
        alignment: { vertical: "center" },
        border: borderStyle,
      };
    });
  }

  // Style Summary (NO BORDER)
  for (let row = summaryStartRow; row <= summaryStartRow + 5; row++) {
    ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
      const cellRef = `${col}${row}`;
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          alignment: { vertical: "center" },
        };
      }
    });
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Harian");
  const filename = `Rekap_Harian_${formatDate(filters.tanggal).replace(/\s/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { success: true, filename };
}

/**
 * Generate Excel untuk Rekap Bulanan
 */
export function generateRekapBulanan(data, filters) {
  const workbook = XLSX.utils.book_new();

  const groupedByDate = {};
  data.forEach((nomor) => {
    const date = nomor.tanggal;
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(nomor);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet([]);
  const bulanNama = getBulanNama(filters.bulan);

  XLSX.utils.sheet_add_aoa(
    summarySheet,
    [
      ["AGENDA SURAT - REKAP BULANAN"],
      ["KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR"],
      [`Periode: ${bulanNama} ${filters.tahun}`],
      [],
    ],
    { origin: "A1" }
  );

  XLSX.utils.sheet_add_aoa(summarySheet, [["TANGGAL", "TOTAL NOMOR", "CONFIRMED", "RESERVED", "CANCELLED"]], {
    origin: "A5",
  });

  const summaryData = Object.keys(groupedByDate)
    .sort()
    .map((date) => {
      const dateData = groupedByDate[date];
      const summary = calculateSummary(dateData);
      return [formatDate(date), summary.total, summary.confirmed, summary.reserved, summary.cancelled];
    });

  XLSX.utils.sheet_add_aoa(summarySheet, summaryData, { origin: "A6" });

  const summaryLastDataRow = 6 + summaryData.length - 1;
  const totalSummaryRow = summaryLastDataRow + 2;
  const totalSummary = calculateSummary(data);

  XLSX.utils.sheet_add_aoa(
    summarySheet,
    [
      [],
      ["RINGKASAN BULAN:"],
      [`Total Nomor: ${totalSummary.total}`],
      [`- Confirmed: ${totalSummary.confirmed}`],
      [`- Reserved: ${totalSummary.reserved}`],
      [`- Cancelled: ${totalSummary.cancelled}`],
    ],
    { origin: `A${totalSummaryRow}` }
  );

  summarySheet["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  summarySheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
  ];

  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  ["A1", "A2", "A3"].forEach((cell) => {
    if (summarySheet[cell]) {
      summarySheet[cell].s = {
        font: { bold: true, sz: cell === "A1" ? 14 : cell === "A2" ? 12 : 10 },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  });

  const headerCols = ["A", "B", "C", "D", "E"];
  headerCols.forEach((col) => {
    const cellRef = `${col}5`;
    if (!summarySheet[cellRef]) summarySheet[cellRef] = { v: "", t: "s" };
    summarySheet[cellRef].s = {
      fill: { fgColor: { rgb: "9DC3E6" } },
      font: { bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle,
    };
  });

  for (let row = 6; row <= summaryLastDataRow; row++) {
    headerCols.forEach((col) => {
      const cellRef = `${col}${row}`;
      if (!summarySheet[cellRef]) summarySheet[cellRef] = { v: "", t: "s" };
      summarySheet[cellRef].s = {
        alignment: { vertical: "center" },
        border: borderStyle,
      };
    });
  }

  for (let row = totalSummaryRow; row <= totalSummaryRow + 5; row++) {
    ["A", "B", "C", "D", "E"].forEach((col) => {
      const cellRef = `${col}${row}`;
      if (summarySheet[cellRef]) {
        summarySheet[cellRef].s = { alignment: { vertical: "center" } };
      }
    });
  }

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const dates = Object.keys(groupedByDate).sort();
  dates.slice(0, 10).forEach((date) => {
    const detailSheet = XLSX.utils.aoa_to_sheet([]);

    XLSX.utils.sheet_add_aoa(detailSheet, [["DETAIL AGENDA SURAT"], [`Tanggal: ${formatDate(date)}`], []], {
      origin: "A1",
    });

    XLSX.utils.sheet_add_aoa(
      detailSheet,
      [["NO", "NO SURAT", "KODE SURAT", "HAL/PERIHAL", "PENGAMBIL NOMOR", "SEKSI", "STATUS"]],
      { origin: "A4" }
    );

    const dateData = groupedByDate[date].map((nomor, index) => [
      index + 1,
      nomor.nomor_urut,
      nomor.nomor_lengkap,
      nomor.keterangan || "-",
      nomor.user_nama || "-",
      nomor.user_seksi || "-",
      nomor.status.toUpperCase(),
    ]);

    XLSX.utils.sheet_add_aoa(detailSheet, dateData, { origin: "A5" });

    const detailLastRow = 5 + dateData.length - 1;

    detailSheet["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 50 }, { wch: 22 }, { wch: 20 }, { wch: 12 }];
    detailSheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];

    ["A1", "A2"].forEach((cell) => {
      if (detailSheet[cell]) {
        detailSheet[cell].s = {
          font: { bold: true, sz: cell === "A1" ? 12 : 10 },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    });

    const detailCols = ["A", "B", "C", "D", "E", "F", "G"];
    detailCols.forEach((col) => {
      const cellRef = `${col}4`;
      if (!detailSheet[cellRef]) detailSheet[cellRef] = { v: "", t: "s" };
      detailSheet[cellRef].s = {
        fill: { fgColor: { rgb: "9DC3E6" } },
        font: { bold: true, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle,
      };
    });

    for (let row = 5; row <= detailLastRow; row++) {
      detailCols.forEach((col) => {
        const cellRef = `${col}${row}`;
        if (!detailSheet[cellRef]) detailSheet[cellRef] = { v: "", t: "s" };
        detailSheet[cellRef].s = {
          alignment: { vertical: "center" },
          border: borderStyle,
        };
      });
    }

    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = getBulanNama(date.substring(5, 7));
    const year = date.substring(0, 4);
    const sheetName = `${day} ${month} ${year}`;
    XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName);
  });

  const filename = `Rekap_Bulanan_${bulanNama}_${filters.tahun}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { success: true, filename };
}

/**
 * Generate Excel untuk Rekap Tahunan
 */
export function generateRekapTahunan(data, filters) {
  const workbook = XLSX.utils.book_new();

  const groupedByMonth = {};
  data.forEach((nomor) => {
    const month = nomor.tanggal.substring(0, 7);
    if (!groupedByMonth[month]) groupedByMonth[month] = [];
    groupedByMonth[month].push(nomor);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(
    summarySheet,
    [
      ["AGENDA SURAT - REKAP TAHUNAN"],
      ["KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR"],
      [`Tahun: ${filters.tahun}`],
      [],
    ],
    { origin: "A1" }
  );

  XLSX.utils.sheet_add_aoa(summarySheet, [["BULAN", "TOTAL NOMOR", "CONFIRMED", "RESERVED", "CANCELLED"]], {
    origin: "A5",
  });

  const summaryData = Object.keys(groupedByMonth)
    .sort()
    .map((month) => {
      const monthData = groupedByMonth[month];
      const summary = calculateSummary(monthData);
      const bulanNama = getBulanNama(month.split("-")[1]);
      return [`${bulanNama} ${filters.tahun}`, summary.total, summary.confirmed, summary.reserved, summary.cancelled];
    });

  XLSX.utils.sheet_add_aoa(summarySheet, summaryData, { origin: "A6" });

  const summaryLastDataRow = 6 + summaryData.length - 1;
  const totalSummaryRow = summaryLastDataRow + 2;
  const totalSummary = calculateSummary(data);

  XLSX.utils.sheet_add_aoa(
    summarySheet,
    [
      [],
      ["RINGKASAN TAHUN:"],
      [`Total Nomor: ${totalSummary.total.toLocaleString("id-ID")}`],
      [`- Confirmed: ${totalSummary.confirmed.toLocaleString("id-ID")}`],
      [`- Reserved: ${totalSummary.reserved.toLocaleString("id-ID")}`],
      [`- Cancelled: ${totalSummary.cancelled.toLocaleString("id-ID")}`],
    ],
    { origin: `A${totalSummaryRow}` }
  );

  summarySheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  summarySheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
  ];

  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  ["A1", "A2", "A3"].forEach((cell) => {
    if (summarySheet[cell]) {
      summarySheet[cell].s = {
        font: { bold: true, sz: cell === "A1" ? 14 : cell === "A2" ? 12 : 10 },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  });

  const headerCols = ["A", "B", "C", "D", "E"];
  headerCols.forEach((col) => {
    const cellRef = `${col}5`;
    if (!summarySheet[cellRef]) summarySheet[cellRef] = { v: "", t: "s" };
    summarySheet[cellRef].s = {
      fill: { fgColor: { rgb: "9DC3E6" } },
      font: { bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle,
    };
  });

  for (let row = 6; row <= summaryLastDataRow; row++) {
    headerCols.forEach((col) => {
      const cellRef = `${col}${row}`;
      if (!summarySheet[cellRef]) summarySheet[cellRef] = { v: "", t: "s" };
      summarySheet[cellRef].s = {
        alignment: { vertical: "center" },
        border: borderStyle,
      };
    });
  }

  for (let row = totalSummaryRow; row <= totalSummaryRow + 5; row++) {
    ["A", "B", "C", "D", "E"].forEach((col) => {
      const cellRef = `${col}${row}`;
      if (summarySheet[cellRef]) {
        summarySheet[cellRef].s = { alignment: { vertical: "center" } };
      }
    });
  }

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const months = Object.keys(groupedByMonth).sort();
  months.forEach((month) => {
    const detailSheet = XLSX.utils.aoa_to_sheet([]);
    const bulanNama = getBulanNama(month.split("-")[1]);

    XLSX.utils.sheet_add_aoa(detailSheet, [["DETAIL AGENDA SURAT"], [`Bulan: ${bulanNama} ${filters.tahun}`], []], {
      origin: "A1",
    });

    XLSX.utils.sheet_add_aoa(
      detailSheet,
      [["NO", "NO SURAT", "KODE SURAT", "TANGGAL", "HAL/PERIHAL", "PENGAMBIL NOMOR", "SEKSI", "STATUS"]],
      { origin: "A4" }
    );

    const monthData = groupedByMonth[month].map((nomor, index) => [
      index + 1,
      nomor.nomor_urut,
      nomor.nomor_lengkap,
      formatDate(nomor.tanggal),
      nomor.keterangan || "-",
      nomor.user_nama || "-",
      nomor.user_seksi || "-",
      nomor.status.toUpperCase(),
    ]);

    XLSX.utils.sheet_add_aoa(detailSheet, monthData, { origin: "A5" });

    const detailLastRow = 5 + monthData.length - 1;

    detailSheet["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 30 },
      { wch: 18 },
      { wch: 50 },
      { wch: 22 },
      { wch: 20 },
      { wch: 12 },
    ];

    detailSheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    ];

    ["A1", "A2"].forEach((cell) => {
      if (detailSheet[cell]) {
        detailSheet[cell].s = {
          font: { bold: true, sz: cell === "A1" ? 12 : 10 },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    });

    const detailCols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    detailCols.forEach((col) => {
      const cellRef = `${col}4`;
      if (!detailSheet[cellRef]) detailSheet[cellRef] = { v: "", t: "s" };
      detailSheet[cellRef].s = {
        fill: { fgColor: { rgb: "9DC3E6" } },
        font: { bold: true, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle,
      };
    });

    for (let row = 5; row <= detailLastRow; row++) {
      detailCols.forEach((col) => {
        const cellRef = `${col}${row}`;
        if (!detailSheet[cellRef]) detailSheet[cellRef] = { v: "", t: "s" };
        detailSheet[cellRef].s = {
          alignment: { vertical: "center" },
          border: borderStyle,
        };
      });
    }

    XLSX.utils.book_append_sheet(workbook, detailSheet, bulanNama);
  });

  const filename = `Rekap_Tahunan_${filters.tahun}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { success: true, filename };
}

function calculateSummary(data) {
  return {
    total: data.length,
    confirmed: data.filter((n) => n.status === "confirmed").length,
    reserved: data.filter((n) => n.status === "reserved").length,
    cancelled: data.filter((n) => n.status === "cancelled").length,
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getBulanNama(bulanNumber) {
  const bulanMap = {
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
  return bulanMap[bulanNumber] || bulanNumber;
}
