import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getHolidays,
  addHoliday,
  deleteHoliday,
  bulkAddHolidays,
  deleteAllHolidays,
} from "../../services/holidayService";

export default function HariLiburModal({ isOpen, onClose, notification }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState("semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [sqlInput, setSqlInput] = useState("");
  const previewRef = useRef(null);
  const [newHoliday, setNewHoliday] = useState({
    tanggal: "",
    nama_libur: "",
    jenis: "libur_nasional",
  });

  const humanizeError = (err) => {
    const msg = err?.message || err || "";
    if (msg.includes("hari_libur_tanggal_key") || msg.includes("duplicate key")) {
      return "Gagal menyimpan. Terdapat tanggal yang sudah terdaftar sebelumnya (duplikat).";
    }
    return msg;
  };

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    const result = await getHolidays();
    if (result.success) {
      setHolidays(result.data);
    } else {
      notification.showErrorToast("Gagal", "Tidak dapat memuat data hari libur");
    }
    setLoading(false);
  }, [notification]);

  useEffect(() => {
    if (isOpen) {
      setFilterYear(new Date().getFullYear().toString());
      setFilterType("semua");
      setSearchTerm("");
      setIsAdding(false);
      setIsImporting(false);
      setShowImportPreview(false);
      loadHolidays();
    }
  }, [isOpen, loadHolidays]);

  useEffect(() => {
    if (showImportPreview && previewRef.current) {
      setTimeout(() => {
        previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showImportPreview]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchYear = filterYear === "semua" || h.tahun.toString() === filterYear;
      const matchType = filterType === "semua" || h.jenis === filterType;
      const matchSearch = h.nama_libur.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchType && matchSearch;
    });
  }, [holidays, filterYear, filterType, searchTerm]);

  const stats = useMemo(() => {
    const currentYearHolidays = holidays.filter((h) => h.tahun.toString() === filterYear);
    return {
      nasional: currentYearHolidays.filter((h) => h.jenis === "libur_nasional").length,
      cuti: currentYearHolidays.filter((h) => h.jenis === "cuti_bersama").length,
      total: currentYearHolidays.length,
    };
  }, [holidays, filterYear]);

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!sqlInput.trim()) return;

    setLoading(true);
    try {
      // 1. Ambil kolom-kolom yang didefinisikan di INSERT INTO (jika ada)
      // Contoh: INSERT INTO "table" ("col1", "col2") VALUES ...
      const columnMatch = sqlInput.match(/INSERT\s+INTO\s+[^(]+\(([^)]+)\)/i);
      let columnMap = ["id", "tanggal", "nama_libur", "jenis", "tahun"]; // Default mapping

      if (columnMatch) {
        columnMap = columnMatch[1].split(",").map((c) => c.trim().replace(/['"`]/g, ""));
      }

      // 2. Ambil semua baris VALUES
      const valuesMatch = sqlInput.match(/VALUES\s+([\s\S]+);?$/i);
      if (!valuesMatch) {
        throw new Error("Format SQL tidak valid. Pastikan ada bagian 'VALUES (...)'.");
      }

      const valuesStr = valuesMatch[1].trim();
      const rows = [];

      // Parser manual yang lebih kuat untuk menangani tanda kurung dalam string
      let currentPos = 0;
      while (currentPos < valuesStr.length) {
        // Cari pembuka baris '('
        const startIdx = valuesStr.indexOf("(", currentPos);
        if (startIdx === -1) break;

        let endIdx = -1;
        let inQuotes = false;

        // Cari penutup baris ')' yang bukan di dalam tanda petik
        for (let i = startIdx + 1; i < valuesStr.length; i++) {
          const char = valuesStr[i];
          if (char === "'") {
            // Cek apakah ini tanda petik yang di-escape ('' dalam SQL)
            if (valuesStr[i + 1] === "'") {
              i++; // Skip petik berikutnya
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ")" && !inQuotes) {
            endIdx = i;
            break;
          }
        }

        if (endIdx === -1) break;

        const rowContent = valuesStr.substring(startIdx + 1, endIdx);
        // Parsing kolom dalam baris, handle koma dalam string
        const columns = rowContent.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map((c) => c.trim().replace(/^'|'$/g, ""));

        if (columns.length >= Math.min(columnMap.length, 5)) {
          const rowData = {};
          columnMap.forEach((colName, idx) => {
            const val = columns[idx];
            if (colName === "tanggal") rowData.tanggal = val;
            if (colName === "nama_libur") rowData.nama_libur = val;
            if (colName === "jenis") rowData.jenis = val;
            if (colName === "tahun") rowData.tahun = val;
          });

          // Fallback jika column mapping tidak ditemukan tapi index tersedia
          if (!rowData.tanggal && columns[1]) rowData.tanggal = columns[1];
          if (!rowData.nama_libur && columns[2]) rowData.nama_libur = columns[2];
          if (!rowData.jenis && columns[3]) rowData.jenis = columns[3];
          if (!rowData.tahun && columns[4]) rowData.tahun = columns[4];

          if (rowData.tanggal && rowData.nama_libur) {
            rows.push(rowData);
          }
        }

        currentPos = endIdx + 1;
      }

      if (rows.length === 0) {
        throw new Error("Tidak ada data yang berhasil diekstrak. Pastikan format SQL benar.");
      }

      // Deteksi tahun unik
      const yearsMap = {};
      rows.forEach((r) => {
        yearsMap[r.tahun] = (yearsMap[r.tahun] || 0) + 1;
      });

      const detectedYears = Object.keys(yearsMap).sort();

      if (detectedYears.length > 1) {
        // Tampilkan pilihan tahun jika lebih dari satu
        setImportPreviewData(rows);
        setSelectedYears(detectedYears); // Default pilih semua
        setShowImportPreview(true);
      } else {
        // Langsung import jika hanya satu tahun
        const result = await bulkAddHolidays(rows);
        if (result.success) {
          notification.showSuccessToast("Berhasil", `${result.count} hari libur berhasil diimpor.`);
          setIsImporting(false);
          setSqlInput("");
          loadHolidays();
        } else {
          notification.showErrorToast("Gagal", humanizeError(result.error));
        }
      }
    } catch (err) {
      notification.showErrorToast("Error Import", humanizeError(err));
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    const finalData = importPreviewData.filter((r) => selectedYears.includes(r.tahun.toString()));

    if (finalData.length === 0) {
      notification.showErrorToast("Peringatan", "Pilih minimal satu tahun untuk diimpor");
      return;
    }

    setLoading(true);
    try {
      const result = await bulkAddHolidays(finalData);
      if (result.success) {
        notification.showSuccessToast("Berhasil", `${result.count} hari libur berhasil diimpor.`);
        setShowImportPreview(false);
        setIsImporting(false);
        setSqlInput("");
        setImportPreviewData([]);
        loadHolidays();
      } else {
        notification.showErrorToast("Gagal", humanizeError(result.error));
      }
    } catch (err) {
      notification.showErrorToast("Error", humanizeError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleYearSelection = (year) => {
    setSelectedYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await addHoliday(newHoliday);
    if (result.success) {
      notification.showSuccessToast("Berhasil", "Hari libur ditambahkan");
      setIsAdding(false);
      setNewHoliday({ tanggal: "", nama_libur: "", jenis: "libur_nasional" });
      loadHolidays();
    } else {
      notification.showErrorToast("Gagal", humanizeError(result.error));
    }
    setLoading(false);
  };

  const handleDelete = async (id, name) => {
    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Hapus Hari Libur?",
      message: `Yakin ingin menghapus "${name}"?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
    });

    if (confirmed) {
      setLoading(true);
      const result = await deleteHoliday(id);
      if (result.success) {
        notification.showSuccessToast("Berhasil", "Hari libur dihapus");
        loadHolidays();
      } else {
        notification.showErrorToast("Gagal", result.error);
      }
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    const isFiltered = filterYear !== "semua";
    const targetText = isFiltered ? `tahun ${filterYear}` : "SEMUA TAHUN";

    const confirmed = await notification.confirmAction({
      type: "danger",
      title: `Hapus Semua Libur ${targetText}?`,
      message: `Tindakan ini tidak dapat dibatalkan. Seluruh data hari libur ${targetText} akan dihapus permanen.`,
      confirmText: "Ya, Hapus Semua",
      cancelText: "Batal",
    });

    if (confirmed) {
      setLoading(true);
      const result = await deleteAllHolidays(isFiltered ? filterYear : null);
      if (result.success) {
        notification.showSuccessToast("Berhasil", `Seluruh data hari libur ${targetText} telah dihapus`);
        loadHolidays();
      } else {
        notification.showErrorToast("Gagal", result.error);
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </span>
              Kelola Hari Libur
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Manajemen hari libur nasional dan cuti bersama sesuai SKB 3 menteri
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Libur Nasional</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.nasional}</h3>
              </div>
              <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Cuti Bersama</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.cuti}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Total Hari Libur</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-600">Tahun:</label>
              <select
                className="px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="semua">Semua Tahun</option>
                {[...new Set(holidays.map((h) => h.tahun))]
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-600">Jenis:</label>
              <select
                className="px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="semua">Semua Jenis</option>
                <option value="libur_nasional">Libur Nasional</option>
                <option value="cuti_bersama">Cuti Bersama</option>
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Cari nama libur..."
                className="w-full pl-10 pr-4 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAll}
                disabled={loading || filteredHolidays.length === 0}
                className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold hover:bg-red-600 hover:text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Hapus Semua
              </button>
              <button
                onClick={() => {
                  setIsAdding(!isAdding);
                  setIsImporting(false);
                }}
                className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shadow-sm ${
                  isAdding ? "bg-gray-100 text-gray-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Satu
              </button>
              <button
                onClick={() => {
                  setIsImporting(!isImporting);
                  setIsAdding(false);
                  if (!isImporting) setFilterYear("semua");
                }}
                className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shadow-sm ${
                  isImporting ? "bg-gray-100 text-gray-700" : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Import SQL
              </button>
            </div>
          </div>

          {/* Import SQL Form */}
          {isImporting && (
            <form
              onSubmit={handleBulkImport}
              className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-4 animate-in slide-in-from-top duration-300"
            >
              <div>
                <label className="block text-sm font-bold text-green-700 mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Tempel Sintaks SQL INSERT INTO disini
                </label>
                <textarea
                  required
                  placeholder='INSERT INTO "public"."hari_libur" ...'
                  className="w-full h-32 px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-xs"
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="submit"
                  disabled={loading || !sqlInput.trim()}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Memproses..." : "Eksekusi Import"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsImporting(false)}
                  className="bg-white text-gray-600 px-4 py-2 rounded-lg font-bold border hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* Multi-Year Selection Preview */}
          {showImportPreview && (
            <div
              ref={previewRef}
              className="bg-amber-50 p-6 rounded-xl border border-amber-200 space-y-4 animate-in zoom-in duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-amber-800">Deteksi Tahun Ganda</h4>
                  <p className="text-sm text-amber-700">
                    Terdapat data dari beberapa tahun berbeda dalam SQL Anda. Silakan pilih tahun yang ingin diimpor:
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-amber-100 divide-y">
                <div className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={
                        selectedYears.length === [...new Set(importPreviewData.map((r) => r.tahun.toString()))].length
                      }
                      onChange={(e) => {
                        const allYears = [...new Set(importPreviewData.map((r) => r.tahun.toString()))];
                        setSelectedYears(e.target.checked ? allYears : []);
                      }}
                    />
                    <span className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
                      Pilih Semua Tahun
                    </span>
                  </label>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {importPreviewData.length} Total Data
                  </span>
                </div>
                {[...new Set(importPreviewData.map((r) => r.tahun.toString()))].sort().map((year) => (
                  <div key={year} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedYears.includes(year)}
                        onChange={() => toggleYearSelection(year)}
                      />
                      <span className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                        Tahun {year}
                      </span>
                    </label>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">
                      {importPreviewData.filter((r) => r.tahun.toString() === year).length} Data
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={confirmImport}
                  disabled={loading || selectedYears.length === 0}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {loading
                    ? "Mengimpor..."
                    : `Konfirmasi Import (${
                        importPreviewData.filter((r) => selectedYears.includes(r.tahun.toString())).length
                      } Data)`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportPreview(false);
                    setImportPreviewData([]);
                  }}
                  className="bg-white text-gray-600 px-4 py-2 rounded-lg font-bold border hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Add Form */}
          {isAdding && (
            <form
              onSubmit={handleAdd}
              className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-wrap gap-4 items-end animate-in slide-in-from-top duration-300"
            >
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-indigo-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newHoliday.tanggal}
                  onChange={(e) => setNewHoliday({ ...newHoliday, tanggal: e.target.value })}
                />
              </div>
              <div className="flex-[2] min-w-[250px]">
                <label className="block text-xs font-bold text-indigo-700 mb-1">Nama Hari Libur</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Idul Fitri 1447 H"
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newHoliday.nama_libur}
                  onChange={(e) => setNewHoliday({ ...newHoliday, nama_libur: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-indigo-700 mb-1">Jenis</label>
                <select
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newHoliday.jenis}
                  onChange={(e) => setNewHoliday({ ...newHoliday, jenis: e.target.value })}
                >
                  <option value="libur_nasional">Libur Nasional</option>
                  <option value="cuti_bersama">Cuti Bersama</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bg-white text-gray-600 px-4 py-2 rounded-lg font-bold border hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-center">No</th>
                  <th className="px-6 py-3 text-center">Tanggal</th>
                  <th className="px-6 py-3 text-center">Nama Hari Libur</th>
                  <th className="px-6 py-3 text-center">Jenis</th>
                  <th className="px-6 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">
                      Tidak ada data hari libur ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((h, index) => (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-800">
                          {new Date(h.tanggal).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{h.tanggal}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{h.nama_libur}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-tight ${
                            h.jenis === "libur_nasional"
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}
                        >
                          {h.jenis.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelete(h.id, h.nama_libur)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
