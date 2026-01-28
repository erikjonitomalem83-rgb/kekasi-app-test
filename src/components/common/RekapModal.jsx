import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import { generateRekapHarian, generateRekapBulanan, generateRekapTahunan } from "../../services/excelExportService";
import { getLocalDateString, getLocalParts } from "../../utils/dateHelpers";

function RekapModal({ isOpen, onClose, notification, isAdmin, userId }) {
  const [loading, setLoading] = useState(false);
  const [jenisRekap, setJenisRekap] = useState("harian");

  // Export confirmation states
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [exportScope, setExportScope] = useState("semua"); // 'semua' or 'saya'

  // Filter states
  const [filterTahun, setFilterTahun] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterStatus, setFilterStatus] = useState("confirmed"); // confirmed, reserved, cancelled
  const [filterUser, setFilterUser] = useState("");

  // Data states
  const [previewData, setPreviewData] = useState([]);
  const [totalData, setTotalData] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [userList, setUserList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { yyyy, mm } = getLocalParts();
  const currentDate = getLocalDateString();
  const currentYear = parseInt(yyyy);
  const currentMonth = mm;

  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const bulanOptions = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  // Load user list
  const loadUserList = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("users").select("id, nama_lengkap").order("nama_lengkap");

      if (error) throw error;
      setUserList(data || []);
    } catch (error) {
      console.error("Error load user list:", error);
    }
  }, []);

  // Load preview data
  const loadPreviewData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("nomor_surat").select(
        `
        *,
        users!nomor_surat_user_id_fkey (
          nama_lengkap,
          seksi
        )
      `,
        { count: "exact" }
      );

      // Filter by jenis rekap
      if (jenisRekap === "harian") {
        if (!filterTanggal || filterTanggal.trim() === "") {
          console.warn("[loadPreviewData] filterTanggal is empty, skipping query");
          setPreviewData([]);
          setTotalData(0);
          setLoading(false);
          return;
        }
        query = query.eq("tanggal", filterTanggal);
      } else if (jenisRekap === "bulanan") {
        if (!filterBulan || filterBulan.trim() === "") {
          console.warn("[loadPreviewData] filterBulan is empty, skipping query");
          setPreviewData([]);
          setTotalData(0);
          setLoading(false);
          return;
        }
        const startOfMonth = `${filterTahun}-${filterBulan}-01`;
        const nextMonth = new Date(`${filterTahun}-${filterBulan}-01`);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endOfMonth = nextMonth.toISOString().split("T")[0];

        query = query.gte("tanggal", startOfMonth).lt("tanggal", endOfMonth);
      } else {
        // tahunan
        if (!filterTahun || filterTahun.trim() === "") {
          console.warn("[loadPreviewData] filterTahun is empty, skipping query");
          setPreviewData([]);
          setTotalData(0);
          setLoading(false);
          return;
        }
        query = query.eq("tahun", filterTahun);
      }

      // Filter by status
      if (filterStatus) {
        query = query.eq("status", filterStatus);
      } else {
        // Jika tidak ada status yang dipilih (should not happen with radio), jangan tampilkan apa pun
        setPreviewData([]);
        setTotalData(0);
        setLoading(false);
        return;
      }

      // Filter by user
      if (filterUser) {
        query = query.eq("user_id", filterUser);
      }

      const { data, error, count } = await query
        .order("tanggal", { ascending: true })
        .order("nomor_urut", { ascending: true });

      if (error) throw error;

      // Transform data
      const transformedData = data.map((nomor) => ({
        ...nomor,
        user_nama: nomor.users?.nama_lengkap || "-",
        user_seksi: nomor.users?.seksi || "-",
      }));

      setPreviewData(transformedData);
      setTotalData(count || 0);
    } catch (error) {
      console.error("Error load preview:", error);

      if (error.message && error.message.includes("invalid input syntax")) {
        console.error("[loadPreviewData] Invalid date format error");
        notification.showErrorToast("Error Format Tanggal", "Format tanggal tidak valid. Silakan refresh halaman.");
      } else {
        notification.showErrorToast("Error Load Data", error.message);
      }

      setPreviewData([]);
      setTotalData(0);
      setCurrentPage(1); // Added reset here
    } finally {
      setLoading(false);
    }
  }, [jenisRekap, filterTanggal, filterBulan, filterTahun, filterStatus, filterUser, notification]);

  // Initialize
  useEffect(() => {
    if (isOpen) {
      setFilterTahun(String(currentYear));
      setFilterBulan(currentMonth);
      setFilterTanggal(currentDate);
      setCurrentPage(1);
      setSearchQuery("");
      loadUserList();
    } else {
      setPreviewData([]);
      setTotalData(0);
      setSearchQuery("");
    }
  }, [isOpen, currentDate, currentMonth, currentYear, loadUserList]);

  // Synchronize dropdowns when date changes
  const handleTanggalChange = (dateValue) => {
    setFilterTanggal(dateValue);
    if (dateValue) {
      const [y, m] = dateValue.split("-");
      setFilterTahun(y);
      setFilterBulan(m);
    }
  };

  // Synchronize date when month changes
  const handleBulanChange = (monthValue) => {
    setFilterBulan(monthValue);
    if (jenisRekap === "harian" && filterTanggal) {
      const [, , d] = filterTanggal.split("-");
      // Create valid date to handle month end differences (e.g. Feb 30)
      const newDt = new Date(filterTahun, parseInt(monthValue) - 1, d);
      // If month rolled over (overflow), set to last day of intended month
      if (newDt.getMonth() !== parseInt(monthValue) - 1) {
        const lastDay = new Date(filterTahun, parseInt(monthValue), 0).getDate();
        setFilterTanggal(`${filterTahun}-${monthValue}-${String(lastDay).padStart(2, "0")}`);
      } else {
        setFilterTanggal(`${filterTahun}-${monthValue}-${d}`);
      }
    }
  };

  // Synchronize date when year changes
  const handleTahunChange = (yearValue) => {
    setFilterTahun(yearValue);
    if (jenisRekap === "harian" && filterTanggal && filterBulan) {
      const [, , d] = filterTanggal.split("-");
      const newDt = new Date(yearValue, parseInt(filterBulan) - 1, d);
      if (newDt.getMonth() !== parseInt(filterBulan) - 1) {
        const lastDay = new Date(yearValue, parseInt(filterBulan), 0).getDate();
        setFilterTanggal(`${yearValue}-${filterBulan}-${String(lastDay).padStart(2, "0")}`);
      } else {
        setFilterTanggal(`${yearValue}-${filterBulan}-${d}`);
      }
    }
  };

  // Reload preview saat filter berubah
  useEffect(() => {
    if (!isOpen) return;
    loadPreviewData();
  }, [isOpen, loadPreviewData]);

  // Handle export
  const handleExport = async () => {
    // Validasi filter
    if (jenisRekap === "harian" && (!filterTanggal || filterTanggal.trim() === "")) {
      notification.showWarningToast("Filter Tidak Lengkap", "Silakan pilih tanggal terlebih dahulu.");
      return;
    }

    if (jenisRekap === "bulanan" && (!filterBulan || filterBulan.trim() === "")) {
      notification.showWarningToast("Filter Tidak Lengkap", "Silakan pilih bulan terlebih dahulu.");
      return;
    }

    if (!filterTahun || filterTahun.trim() === "") {
      notification.showWarningToast("Filter Tidak Lengkap", "Silakan pilih tahun terlebih dahulu.");
      return;
    }

    if (totalData === 0) {
      notification.showWarningToast("Tidak Ada Data", "Tidak ada data untuk di-export. Ubah filter Anda.");
      return;
    }

    setShowExportConfirm(true);
  };

  const confirmExport = async () => {
    setShowExportConfirm(false);
    setLoading(true);
    notification.showLoadingOverlay("Generating Excel...\nMohon tunggu.");

    try {
      // Fetch ALL data (tidak limit)
      let query = supabase.from("nomor_surat").select(
        `
        *,
        users!nomor_surat_user_id_fkey (
          nama_lengkap,
          seksi
        )
      `
      );

      // Apply same filters
      if (jenisRekap === "harian") {
        query = query.eq("tanggal", filterTanggal);
      } else if (jenisRekap === "bulanan") {
        const startOfMonth = `${filterTahun}-${filterBulan}-01`;
        const nextMonth = new Date(`${filterTahun}-${filterBulan}-01`);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endOfMonth = nextMonth.toISOString().split("T")[0];

        query = query.gte("tanggal", startOfMonth).lt("tanggal", endOfMonth);
      } else {
        query = query.eq("tahun", filterTahun);
      }

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      } else {
        notification.showWarningToast("Status Belum Dipilih", "Silakan pilih status terlebih dahulu.");
        setLoading(false);
        notification.hideLoadingOverlay();
        return;
      }

      // Filter by user
      if (filterUser) {
        query = query.eq("user_id", filterUser);
      }

      // APPLY EXPORT SCOPE FILTER (Override other user filters if "saya")
      if (exportScope === "saya") {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query
        .order("tanggal", { ascending: true })
        .order("nomor_urut", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        notification.showWarningToast("Tidak Ada Data", "Tidak ada data yang sesuai dengan pilihan export Anda.");
        notification.hideLoadingOverlay();
        setLoading(false);
        return;
      }

      // Transform data
      const transformedData = data.map((nomor) => ({
        ...nomor,
        user_nama: nomor.users?.nama_lengkap || "-",
        user_seksi: nomor.users?.seksi || "-",
      }));

      // Generate file
      const filters = {
        tahun: filterTahun,
        bulan: filterBulan,
        tanggal: filterTanggal,
      };

      let result;
      if (jenisRekap === "harian") {
        result = generateRekapHarian(transformedData, filters);
      } else if (jenisRekap === "bulanan") {
        result = generateRekapBulanan(transformedData, filters);
      } else {
        result = generateRekapTahunan(transformedData, filters);
      }

      // Jika export "saya", tambahkan info ke nama file jika sukses
      if (result.success && exportScope === "saya") {
        console.log("Exported personal letters only");
      }

      notification.hideLoadingOverlay();

      if (result.success) {
        notification.showSuccessToast("Export Berhasil", `File ${result.filename} berhasil di-download!`);
        onClose();
      }
    } catch (error) {
      console.error("Error export:", error);
      notification.hideLoadingOverlay();
      notification.showErrorToast("Error Export", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtering logic
  const filteredData = (previewData || []).filter((item) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const nomorMatch = (item.nomor_lengkap || "").toLowerCase().includes(searchLower);
    const keteranganMatch = (item.keterangan || "").toLowerCase().includes(searchLower);
    return nomorMatch || keteranganMatch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPreviewData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Dynamic label for "Action By"
  const activeStatuses = [
    { key: "confirmed", active: filterStatus === "confirmed", label: "Dikonfirmasi oleh" },
    { key: "reserved", active: filterStatus === "reserved", label: "Dipesan oleh" },
    { key: "cancelled", active: filterStatus === "cancelled", label: "Dibatalkan oleh" },
  ].filter((s) => s.active);

  const actionLabel = activeStatuses.length === 1 ? activeStatuses[0].label : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#16a34a] border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Rekap Nomor Surat</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 text-white hover:bg-white/10 transition disabled:opacity-50 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sticky Filter Section */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gray-50/50">
          <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm transition-all">
            <div className="grid grid-cols-1 gap-3">
              {/* Row 1: Jenis Rekap & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Jenis Rekap Segmented Control */}
                <div>
                  <div className="inline-flex bg-gray-50 p-1 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto">
                    {["harian", "bulanan", "tahunan"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setJenisRekap(type)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex-1 md:flex-none ${
                          jenisRekap === type
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selection Segmented Control */}
                <div>
                  <div className="inline-flex bg-gray-50 p-1 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto">
                    {[
                      { value: "confirmed", label: "Dikonfirmasi" },
                      { value: "reserved", label: "Dipesan" },
                      ...(isAdmin ? [{ value: "cancelled", label: "Batal" }] : []),
                    ].map((status) => (
                      <button
                        key={status.value}
                        onClick={() => setFilterStatus(status.value)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex-1 md:flex-none ${
                          filterStatus === status.value
                            ? "bg-green-600 text-white shadow-sm"
                            : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Date Filters & User Filter */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                {/* Tahun */}
                <div>
                  <select
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                    value={filterTahun}
                    onChange={(e) => handleTahunChange(e.target.value)}
                    disabled={loading}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bulan */}
                {(jenisRekap === "harian" || jenisRekap === "bulanan") && (
                  <div>
                    <select
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                      value={filterBulan}
                      onChange={(e) => handleBulanChange(e.target.value)}
                      disabled={loading}
                    >
                      {bulanOptions.map((bulan) => (
                        <option key={bulan.value} value={bulan.value}>
                          {bulan.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tanggal */}
                {jenisRekap === "harian" && (
                  <div className="col-span-1 md:col-span-1">
                    <input
                      type="date"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                      value={filterTanggal}
                      onChange={(e) => handleTanggalChange(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                {/* User Filter */}
                <div
                  className={`${jenisRekap === "harian" ? "col-span-1" : jenisRekap === "bulanan" ? "col-span-2 md:col-span-2" : "col-span-2 md:col-span-3"}`}
                >
                  <select
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Semua User</option>
                    {userList.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nama_lengkap}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Static Preview Info Row */}
        <div className="flex-shrink-0 px-4 md:px-6 py-2.5 md:py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-xs md:text-sm font-semibold text-gray-700">Data Preview</span>
            </div>
            <button
              type="button"
              onClick={loadPreviewData}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-[10px] md:text-xs font-medium">Refresh</span>
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-hidden">
            {/* Search Input - Fixed width for stability */}
            <div className="relative group flex-1 md:flex-none md:w-[450px]">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400 group-focus-within:text-green-600 transition-colors duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Cari nomor / keterangan surat..."
                className="block w-full pl-10 pr-12 py-2.5 border-2 border-gray-200 rounded-full text-xs font-semibold focus:border-green-600 outline-none transition-all duration-200 bg-white placeholder:text-gray-400 shadow-none focus:shadow-none"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-green-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Total Badge - Fixed width to prevent shifting */}
            <div className="flex-shrink-0 min-w-[85px] md:min-w-[100px] flex justify-end">
              <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 w-full justify-center">
                <span className="text-[10px] md:text-xs text-green-700 font-medium">Total:</span>
                <span className="text-xs md:text-sm text-green-700 font-bold whitespace-nowrap">
                  {(searchQuery ? filteredData.length : totalData).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/30">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : previewData.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-600">Tidak ada data sesuai filter</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white min-h-[400px]">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-[#f8fafc] border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider w-16 border-b border-gray-200">
                        No
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider w-64 border-b border-gray-200">
                        Kode Surat
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Keterangan
                      </th>
                      {actionLabel && (
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider w-64 border-b border-gray-200">
                          {actionLabel}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {paginatedPreviewData.map((nomor, index) => (
                      <tr key={nomor.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-700 text-center font-medium w-16">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-4 py-3 text-left w-64">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            {nomor.nomor_lengkap}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 italic text-left">
                          {nomor.keterangan || <span className="text-gray-400 font-normal">-</span>}
                        </td>
                        {actionLabel && (
                          <td className="px-4 py-3 text-gray-700 font-semibold text-left w-64">{nomor.user_nama}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Card List */}
              <div className="md:hidden space-y-3">
                {paginatedPreviewData.map((nomor, index) => (
                  <div
                    key={nomor.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-colors"
                  >
                    {/* Card Header: sequence */}
                    <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        #{startIndex + index + 1}
                      </span>
                    </div>

                    <div className="p-3">
                      {/* Full Number */}
                      <div className="mb-2">
                        <div className="font-mono font-bold text-sm text-blue-700 break-all leading-tight bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                          {nomor.nomor_lengkap}
                        </div>
                      </div>

                      {/* Keterangan */}
                      <div className="mb-0">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter block mb-0.5">
                          Keterangan
                        </span>
                        <p className="text-xs text-gray-700 leading-normal italic line-clamp-2">
                          {nomor.keterangan || <span className="text-gray-300 italic">Tidak ada keterangan</span>}
                        </p>
                      </div>

                      {/* Action By (Mobile) */}
                      {actionLabel && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter block mb-0.5">
                            {actionLabel}
                          </span>
                          <p className="text-xs font-bold text-gray-800">{nomor.user_nama}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sticky Action Footer incorporating Pagination & Export */}
        {(totalPages > 1 || !(!isAdmin && filterStatus === "reserved")) && (
          <div
            className={`px-4 md:px-6 py-3 md:py-4 bg-white border-t border-gray-100 flex flex-row items-center gap-2 md:gap-4 bg-gray-50/80 flex-shrink-0 ${totalPages > 1 ? "justify-between" : "justify-end"}`}
          >
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 md:gap-1.5">
                {/* Page Info - Hidden on small mobile */}
                <p className="hidden sm:block text-xs md:text-sm text-gray-600 font-medium mr-2">
                  <span className="text-blue-600 font-bold">{currentPage}</span>/
                  <span className="text-gray-900 font-bold">{totalPages}</span>
                </p>

                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 md:px-2.5 md:py-2 bg-white border border-gray-300 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-30 shadow-sm"
                  title="First Page"
                >
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 md:px-3 md:py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-40 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="hidden md:flex items-center -space-x-px">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 flex items-center justify-center text-sm font-bold transition-all ${
                          currentPage === pageNum
                            ? "bg-green-600 text-white z-10 border border-green-600 shadow-md transform scale-105 rounded-lg"
                            : "bg-white text-gray-600 border border-gray-300 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                  className="p-1.5 md:px-3 md:py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-green-300 transition-all disabled:opacity-40 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || loading}
                  className="p-1.5 md:px-2.5 md:py-2 bg-white border border-gray-300 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-50 hover:border-green-300 transition-all disabled:opacity-30 shadow-sm"
                  title="Last Page"
                >
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Action Buttons Right */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-3 md:px-5 py-1.5 md:py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition disabled:opacity-50 text-[11px] md:text-sm shadow-sm"
              >
                Batal
              </button>
              {!(!isAdmin && filterStatus === "reserved") && (
                <button
                  onClick={handleExport}
                  disabled={loading || totalData === 0}
                  className="px-3 md:px-5 py-1.5 md:py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 md:gap-2 text-[11px] md:text-sm shadow-md"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 md:h-3.5 md:w-3.5 border-b-2 border-white"></div>
                      <span className="sm:hidden">Proses</span>
                      <span className="hidden sm:inline">Proses...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="sm:hidden">Excel</span>
                      <span className="hidden sm:inline">Download Excel</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Export Confirmation Modal */}
      {showExportConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            {/* Header Modal */}
            <div className="bg-[#16a34a] px-6 py-4 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Konfirmasi Download</h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-50 p-3 rounded-full flex-shrink-0 text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-gray-600 leading-relaxed mb-4 text-left">
                    Silakan pilih jenis data yang ingin di-download:
                  </p>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-green-300 transition-all group shadow-sm">
                      <input
                        type="radio"
                        name="exportScope"
                        value="semua"
                        checked={exportScope === "semua"}
                        onChange={(e) => setExportScope(e.target.value)}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                          Semua Surat
                        </span>
                        <span className="text-[10px] text-gray-500">Download seluruh data sesuai filter</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-green-300 transition-all group shadow-sm">
                      <input
                        type="radio"
                        name="exportScope"
                        value="saya"
                        checked={exportScope === "saya"}
                        onChange={(e) => setExportScope(e.target.value)}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                          Surat Saya
                        </span>
                        <span className="text-[10px] text-gray-500">Hanya download surat yang Anda ambil</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowExportConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={confirmExport}
                className="flex-[1.5] px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95"
              >
                Ya, Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RekapModal;
