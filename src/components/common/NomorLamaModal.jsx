import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";

export default function NomorLamaModal({ isOpen, onClose, onReserveSuccess, userId, notification }) {
  const [loading, setLoading] = useState(false);
  const [nomorList, setNomorList] = useState([]);
  const [selectedNomor, setSelectedNomor] = useState([]);
  const [keterangan, setKeterangan] = useState("");

  // Filter states
  const [filterTahun, setFilterTahun] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [searchNomor, setSearchNomor] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Tahun: tahun berjalan dan 1 tahun ke belakang
  const availableYears = [currentYear, currentYear - 1];

  // Semua bulan (untuk referensi)
  const allBulanOptions = [
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

  // Filter bulan berdasarkan tahun yang dipilih
  const getAvailableMonths = () => {
    const selectedYear = parseInt(filterTahun);

    // Jika tahun yang dipilih adalah tahun berjalan
    if (selectedYear === currentYear) {
      // Hanya tampilkan bulan sampai bulan berjalan (exclude bulan berjalan dan bulan setelahnya)
      return allBulanOptions.filter((bulan) => {
        const bulanValue = parseInt(bulan.value);
        return bulanValue < currentMonth; // Hanya bulan sebelum bulan berjalan
      });
    }

    // Jika tahun sebelumnya, tampilkan semua bulan
    return allBulanOptions;
  };

  const bulanOptions = getAvailableMonths();

  // Load nomor lama saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      // Default: tahun berjalan dulu (untuk ambil nomor hari sebelumnya di tahun ini)
      setFilterTahun(String(currentYear));
      setCurrentPage(1);
      loadNomorLama(String(currentYear), "", "");
    } else {
      // Reset saat modal ditutup
      setSelectedNomor([]);
      setKeterangan("");
      setNomorList([]);
      setFilterBulan("");
      setSearchNomor("");
    }
  }, [isOpen]);

  const loadNomorLama = async (tahun, bulan, nomorSearch) => {
    setLoading(true);
    setCurrentPage(1); // Reset page on filter
    try {
      const today = new Date().toISOString().split("T")[0];

      let query = supabase
        .from("nomor_surat")
        .select("*")
        .eq("tahun", tahun)
        .eq("status", "cancelled")
        .is("keterangan", null)
        .lt("tanggal", today); // Exclude nomor hari ini

      // Filter bulan (opsional)
      if (bulan) {
        const startOfMonth = `${tahun}-${bulan}-01`;
        const nextMonth = new Date(`${tahun}-${bulan}-01`);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endOfMonth = nextMonth.toISOString().split("T")[0];

        query = query.gte("tanggal", startOfMonth).lt("tanggal", endOfMonth);
      }

      // Filter search nomor urut (opsional)
      if (nomorSearch) {
        query = query.eq("nomor_urut", parseInt(nomorSearch));
      }

      const { data, error } = await query.order("nomor_urut", { ascending: true }).limit(100);

      if (error) throw error;

      setNomorList(data || []);
    } catch (error) {
      console.error("Error load nomor lama:", error);
      notification.showErrorToast("Error", "Gagal memuat nomor lama: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = () => {
    loadNomorLama(filterTahun, filterBulan, searchNomor);
  };

  // Handle checkbox selection
  const handleCheckboxChange = (nomor) => {
    setSelectedNomor((prev) => {
      const isSelected = prev.find((n) => n.id === nomor.id);
      if (isSelected) {
        return prev.filter((n) => n.id !== nomor.id);
      } else {
        if (prev.length >= 10) {
          notification.showWarningToast("Maksimal 10 Nomor", "Anda hanya bisa memilih maksimal 10 nomor sekaligus.");
          return prev;
        }
        return [...prev, nomor];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNomor.length === nomorList.length) {
      setSelectedNomor([]);
    } else {
      const toSelect = nomorList.slice(0, 10);
      setSelectedNomor(toSelect);
      if (nomorList.length > 10) {
        notification.showInfoToast("Info", "Hanya 10 nomor pertama yang dipilih (maksimal).");
      }
    }
  };

  // Handle reserve nomor
  const handleReserve = async () => {
    if (selectedNomor.length === 0) {
      notification.showWarningToast("Pilih Nomor", "Silakan pilih minimal 1 nomor terlebih dahulu.");
      return;
    }

    if (!keterangan || keterangan.trim() === "") {
      notification.showWarningToast("Keterangan Kosong", "Keterangan wajib diisi untuk semua nomor yang dipilih.");
      return;
    }

    // Konfirmasi
    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Konfirmasi Penggunaan Nomor Lama",
      message: `Anda akan menggunakan ${
        selectedNomor.length
      } nomor lama dari tahun ${filterTahun}.\n\nNomor: ${selectedNomor
        .map((n) => n.nomor_urut)
        .join(", ")}\n\nKeterangan: ${keterangan}\n\nLanjutkan?`,
      confirmText: "Ya, Gunakan Nomor",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    setLoading(true);

    try {
      // Import function dari service
      const { reserveNomorLama } = await import("../../services/nomorSuratService");

      const result = await reserveNomorLama(userId, selectedNomor, keterangan);

      if (result.success) {
        notification.showSuccessToast(
          "Berhasil",
          `${result.data.length} nomor lama berhasil di-reserve.\n\nSilakan konfirmasi dalam 5 menit.`
        );

        onReserveSuccess(result.data);
        onClose();
      } else {
        notification.showErrorToast("Gagal Reserve", result.error);
      }
    } catch (error) {
      console.error("Error reserve nomor lama:", error);
      notification.showErrorToast("Error", "Gagal reserve nomor lama: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(nomorList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNomorList = nomorList.slice(startIndex, startIndex + itemsPerPage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Nomor Lama Tersedia</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition disabled:opacity-50 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filter Tahun */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
                Tahun <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                value={filterTahun}
                onChange={(e) => {
                  const newYear = e.target.value;
                  setFilterTahun(newYear);

                  // Reset bulan jika bulan yang dipilih tidak valid untuk tahun baru
                  if (parseInt(newYear) === currentYear && filterBulan) {
                    const selectedMonth = parseInt(filterBulan);
                    if (selectedMonth >= currentMonth) {
                      setFilterBulan(""); // Reset bulan jika tidak valid
                      notification.showInfoToast(
                        "Filter Bulan Di-reset",
                        `Bulan ${allBulanOptions[selectedMonth - 1].label} tidak tersedia untuk tahun ${currentYear}`
                      );
                    }
                  }
                }}
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Bulan (Opsional)</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                disabled={loading || bulanOptions.length === 0}
              >
                <option value="">
                  {bulanOptions.length === 0 ? "Tidak ada bulan tersedia" : "Semua Bulan yang Tersedia"}
                </option>
                {bulanOptions.map((bulan) => (
                  <option key={bulan.value} value={bulan.value}>
                    {bulan.label}
                  </option>
                ))}
              </select>
              {parseInt(filterTahun) === currentYear && bulanOptions.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Tidak ada bulan sebelumnya tersedia di tahun {currentYear}</p>
              )}
            </div>

            {/* Search Nomor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Cari Nomor (Opsional)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="Contoh: 150"
                value={searchNomor}
                onChange={(e) => setSearchNomor(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Button Filter */}
            <div className="flex items-end">
              <button
                onClick={handleFilterChange}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Memuat..." : "Terapkan Filter"}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : nomorList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 font-semibold mb-2">Tidak ada nomor lama tersedia</p>
              <p className="text-sm text-gray-400">Coba ubah filter atau pilih tahun/bulan lain</p>
            </div>
          ) : (
            <>
              {/* Info & Select All */}
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  Ditemukan <span className="font-bold text-blue-600">{nomorList.length}</span> nomor | Dipilih:{" "}
                  <span className="font-bold text-green-600">{selectedNomor.length}</span>/10
                </p>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                  disabled={loading}
                >
                  {selectedNomor.length === nomorList.length ? "Batal Pilih Semua" : "Pilih Semua (Max 10)"}
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pilih</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nomor Urut</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nomor Lengkap</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tahun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNomorList.map((nomor) => {
                      const isSelected = selectedNomor.find((n) => n.id === nomor.id);
                      return (
                        <tr
                          key={nomor.id}
                          className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleCheckboxChange(nomor);
                              }}
                              className="w-4 h-4 text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td
                            className="px-4 py-3 text-sm font-bold text-gray-800 cursor-pointer"
                            onClick={() => handleCheckboxChange(nomor)}
                          >
                            {nomor.nomor_urut}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-700 cursor-pointer"
                            onClick={() => handleCheckboxChange(nomor)}
                          >
                            {nomor.nomor_lengkap}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                            onClick={() => handleCheckboxChange(nomor)}
                          >
                            {new Date(nomor.tanggal).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                            onClick={() => handleCheckboxChange(nomor)}
                          >
                            {nomor.tahun}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">
                    Halaman <span className="text-blue-600">{currentPage}</span> dari{" "}
                    <span className="text-gray-900">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Prev
                    </button>

                    <div className="flex items-center -space-x-px">
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
                                ? "bg-blue-600 text-white z-10 border border-blue-600 shadow-md transform scale-110 rounded-lg"
                                : "bg-white text-gray-600 border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
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
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-300"
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Keterangan & Button */}
        {selectedNomor.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
                Keterangan Penggunaan <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                rows="2"
                placeholder="Contoh: Nomor digunakan untuk surat perjalanan dinas 3 pegawai"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                disabled={loading}
              />
              {selectedNomor.length > 0 && keterangan.trim() === "" && (
                <p className="text-xs text-red-500 mt-1">Keterangan wajib diisi sebelum menggunakan nomor</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleReserve}
                disabled={loading || selectedNomor.length === 0 || keterangan.trim() === ""}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Memproses..." : `Gunakan ${selectedNomor.length} Nomor`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
