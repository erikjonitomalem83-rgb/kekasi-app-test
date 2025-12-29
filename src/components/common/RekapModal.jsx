import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import { generateRekapHarian, generateRekapBulanan, generateRekapTahunan } from "../../services/excelExportService";

export default function RekapModal({ isOpen, onClose, notification, isAdmin }) {
  const [loading, setLoading] = useState(false);
  const [jenisRekap, setJenisRekap] = useState("harian");

  // Filter states
  const [filterTahun, setFilterTahun] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterStatusConfirmed, setFilterStatusConfirmed] = useState(true);
  const [filterStatusReserved, setFilterStatusReserved] = useState(true);
  const [filterStatusCancelled, setFilterStatusCancelled] = useState(false);
  const [filterUser, setFilterUser] = useState("");

  // Data states
  const [previewData, setPreviewData] = useState([]);
  const [totalData, setTotalData] = useState(0);
  const [userList, setUserList] = useState([]);

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const currentDate = new Date().toISOString().split("T")[0];

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

  // Initialize
  useEffect(() => {
    if (isOpen) {
      setFilterTahun(String(currentYear));
      setFilterBulan(currentMonth);
      setFilterTanggal(currentDate);
      loadUserList();
    } else {
      setPreviewData([]);
      setTotalData(0);
    }
  }, [isOpen, currentDate, currentMonth, currentYear, loadUserList]);

  // Load user list
  const loadUserList = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase.from("users").select("id, nama_lengkap").order("nama_lengkap");

      if (error) throw error;
      setUserList(data || []);
    } catch (error) {
      console.error("Error load user list:", error);
    }
  }, [isAdmin]);

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
      const statusFilter = [];
      if (filterStatusConfirmed) statusFilter.push("confirmed");
      if (filterStatusReserved) statusFilter.push("reserved");
      if (filterStatusCancelled) statusFilter.push("cancelled");

      if (statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }

      // Filter by user (admin only)
      if (isAdmin && filterUser) {
        query = query.eq("user_id", filterUser);
      }

      const { data, error, count } = await query
        .order("tanggal", { ascending: false })
        .order("nomor_urut", { ascending: true })
        .limit(10);

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
    } finally {
      setLoading(false);
    }
  }, [
    jenisRekap,
    filterTanggal,
    filterBulan,
    filterTahun,
    filterStatusConfirmed,
    filterStatusReserved,
    filterStatusCancelled,
    isAdmin,
    filterUser,
    notification,
  ]);
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

    const confirmed = await notification.confirmAction({
      type: "info",
      title: "Konfirmasi Export",
      message: `Anda akan export ${totalData} data nomor surat ke Excel.\n\nJenis: ${
        jenisRekap.charAt(0).toUpperCase() + jenisRekap.slice(1)
      }\n\nLanjutkan?`,
      confirmText: "Ya, Export Excel",
      cancelText: "Batal",
    });

    if (!confirmed) return;

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

      const statusFilter = [];
      if (filterStatusConfirmed) statusFilter.push("confirmed");
      if (filterStatusReserved) statusFilter.push("reserved");
      if (filterStatusCancelled) statusFilter.push("cancelled");

      if (statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }

      if (isAdmin && filterUser) {
        query = query.eq("user_id", filterUser);
      }

      const { data, error } = await query
        .order("tanggal", { ascending: false })
        .order("nomor_urut", { ascending: true });

      if (error) throw error;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Rekap Nomor Surat</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Jenis Rekap */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Jenis Rekap</label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="jenisRekap"
                  value="harian"
                  checked={jenisRekap === "harian"}
                  onChange={(e) => setJenisRekap(e.target.value)}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">Harian</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="jenisRekap"
                  value="bulanan"
                  checked={jenisRekap === "bulanan"}
                  onChange={(e) => setJenisRekap(e.target.value)}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">Bulanan</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="jenisRekap"
                  value="tahunan"
                  checked={jenisRekap === "tahunan"}
                  onChange={(e) => setJenisRekap(e.target.value)}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">Tahunan</span>
              </label>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-left">Filter</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Filter Tahun */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">
                  Tahun <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                  disabled={loading}
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Bulan */}
              {(jenisRekap === "harian" || jenisRekap === "bulanan") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">
                    Bulan <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={filterBulan}
                    onChange={(e) => setFilterBulan(e.target.value)}
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

              {/* Filter Tanggal */}
              {jenisRekap === "harian" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">
                    Tanggal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={filterTanggal}
                    onChange={(e) => setFilterTanggal(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            {/* Filter Status */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-2 text-left">Status</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterStatusConfirmed}
                    onChange={(e) => setFilterStatusConfirmed(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">Confirmed</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterStatusReserved}
                    onChange={(e) => setFilterStatusReserved(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">Reserved</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterStatusCancelled}
                    onChange={(e) => setFilterStatusCancelled(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">Cancelled</span>
                </label>
              </div>
            </div>

            {/* Filter User (Admin Only) */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">
                  Filter User (Opsional)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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
            )}
          </div>

          {/* Preview */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Preview Data</h3>
              <span className="text-sm text-blue-600 font-bold">Total: {totalData.toLocaleString("id-ID")} nomor</span>
            </div>

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
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 text-center w-16">No</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Kode Surat</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((nomor, index) => (
                        <tr key={nomor.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700 text-center">{index + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-blue-700 truncate max-w-[200px]">
                            {nomor.nomor_lengkap}
                          </td>
                          <td className="px-3 py-2 text-gray-600 italic">
                            {nomor.keterangan || <span className="text-gray-400 font-normal">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Card List */}
                <div className="md:hidden space-y-3">
                  {previewData.map((nomor, index) => (
                    <div
                      key={nomor.id}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-colors"
                    >
                      {/* Card Header: sequence */}
                      <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          #{index + 1}
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
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {previewData.length > 0 && totalData > 10 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Menampilkan 10 dari {totalData.toLocaleString("id-ID")} data
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleExport}
            disabled={loading || totalData === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Memproses...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
