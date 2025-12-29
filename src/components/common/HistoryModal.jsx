import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import { updateNomorSuratData, deleteNomorSurat } from "../../services/nomorSuratService";
import { useNotification } from "../common/Notification";

export default function HistoryModal({ isOpen, onClose, profile, isAdmin, isSuperAdmin }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("confirmed");

  // State untuk edit mode
  const [editingId, setEditingId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // State untuk edit data lengkap
  const [editingData, setEditingData] = useState({
    kodeKanwil: "",
    kodeUPT: "",
    kodeMasalah: "",
    subMasalah1: "",
    subMasalah2: "",
    keterangan: "",
  });
  const [editErrors, setEditErrors] = useState({});

  const notification = useNotification();

  const loadHistory = async () => {
    setLoading(true);

    try {
      let query = supabase.from("nomor_surat").select(
        `
        *,
        users:user_id (
          nama_lengkap,
          seksi
        )
      `
      );

      // Filter berdasarkan tab aktif
      if (activeTab === "confirmed") {
        query = query.eq("status", "confirmed");
      } else if (activeTab === "emergency") {
        query = query.eq("keterangan", "ADMIN_EMERGENCY_POOL");
      }

      if (!isAdmin) {
        query = query.eq("user_id", profile.id);
      }

      if (filter === "this_month") {
        const currentMonth = new Date().toISOString().substring(0, 7);
        query = query.like("tanggal", `${currentMonth}%`);
      } else if (filter === "last_month") {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().substring(0, 7);
        query = query.like("tanggal", `${lastMonthStr}%`);
      }

      // Sort
      const dateColumn = activeTab === "confirmed" ? "confirmed_at" : "reserved_at";

      if (sortBy === "newest") {
        query = query.order(dateColumn, { ascending: false }).order("nomor_urut", { ascending: true });
      } else if (sortBy === "oldest") {
        query = query.order(dateColumn, { ascending: true }).order("nomor_urut", { ascending: true });
      } else if (sortBy === "nomor_asc") {
        query = query.order("nomor_urut", { ascending: true });
      } else if (sortBy === "nomor_desc") {
        query = query.order("nomor_urut", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      setHistoryData(data || []);
    } catch (error) {
      console.error("Error load history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filter, sortBy, profile?.id, isAdmin, activeTab]);

  const handleStartEdit = (nomor) => {
    setEditingId(nomor.id);

    // Set data lengkap untuk edit
    setEditingData({
      kodeKanwil: nomor.kode_kanwil || "",
      kodeUPT: nomor.kode_upt || "",
      kodeMasalah: nomor.kode_masalah || "",
      subMasalah1: nomor.kode_submasalah1 || "",
      subMasalah2: nomor.kode_submasalah2 || "",
      keterangan: nomor.keterangan || "",
    });
    setEditErrors({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({
      kodeKanwil: "",
      kodeUPT: "",
      kodeMasalah: "",
      subMasalah1: "",
      subMasalah2: "",
      keterangan: "",
    });
    setEditErrors({});
  };

  const handleEditInputChange = (field, value) => {
    setEditingData((prev) => ({ ...prev, [field]: value }));

    // Clear error untuk field yang sedang diisi
    if (editErrors[field]) {
      setEditErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateEditData = () => {
    const errors = {};

    if (!editingData.kodeKanwil.trim()) {
      errors.kodeKanwil = "Kode Kanwil wajib diisi";
    }

    if (!editingData.kodeUPT.trim()) {
      errors.kodeUPT = "Kode UPT wajib diisi";
    }

    if (!editingData.kodeMasalah.trim()) {
      errors.kodeMasalah = "Kode Masalah wajib diisi";
    } else if (editingData.kodeMasalah.length !== 2) {
      errors.kodeMasalah = "Kode Masalah harus 2 huruf";
    }

    if (!editingData.subMasalah1.trim()) {
      errors.subMasalah1 = "Sub Masalah 1 wajib diisi";
    } else if (editingData.subMasalah1.length !== 2) {
      errors.subMasalah1 = "Harus 2 digit angka";
    }

    if (editingData.subMasalah2.trim() && editingData.subMasalah2.length !== 2) {
      errors.subMasalah2 = "Harus 2 digit angka";
    }

    if (!editingData.keterangan.trim()) {
      errors.keterangan = "Keterangan wajib diisi";
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async (nomorId) => {
    // Validasi
    if (!validateEditData()) {
      notification.showWarningToast("Data Tidak Valid", "Mohon periksa kembali data yang Anda masukkan!");
      return;
    }

    // Preview nomor lengkap yang akan dihasilkan
    const cleanSubMasalah2 = editingData.subMasalah2.trim();
    const previewNomorLengkap =
      cleanSubMasalah2 !== ""
        ? `${editingData.kodeKanwil}.${editingData.kodeUPT}-${editingData.kodeMasalah}.${editingData.subMasalah1}.${cleanSubMasalah2}-[nomor urut]`
        : `${editingData.kodeKanwil}.${editingData.kodeUPT}-${editingData.kodeMasalah}.${editingData.subMasalah1}-[nomor urut]`;

    // Konfirmasi
    const confirmed = await notification.confirmAction({
      type: "info",
      title: "Simpan Perubahan?",
      message: `Yakin ingin mengubah data nomor surat?\n\nFormat baru: ${previewNomorLengkap}\n\nKeterangan: "${editingData.keterangan.trim()}"\n\nNomor urut tidak akan berubah.`,
      confirmText: "Ya, Simpan",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    setIsUpdating(true);

    try {
      const result = await updateNomorSuratData(nomorId, editingData);

      if (result.success) {
        notification.showSuccessToast("Berhasil!", "Data nomor surat berhasil diperbarui");

        // Update data lokal tanpa reload
        setHistoryData((prev) =>
          prev.map((nomor) =>
            nomor.id === nomorId
              ? {
                  ...nomor,
                  kode_kanwil: editingData.kodeKanwil.trim(),
                  kode_upt: editingData.kodeUPT.trim(),
                  kode_masalah: editingData.kodeMasalah.trim().toUpperCase(),
                  kode_submasalah1: editingData.subMasalah1.trim(),
                  kode_submasalah2: editingData.subMasalah2.trim(),
                  keterangan: editingData.keterangan.trim(),
                  nomor_lengkap: result.data.nomor_lengkap,
                }
              : nomor
          )
        );

        // Reset edit mode
        handleCancelEdit();
      } else {
        notification.showErrorToast("Gagal", result.error);
      }
    } catch (error) {
      console.error("Error update nomor surat data:", error);
      notification.showErrorToast("Error", "Terjadi kesalahan saat mengupdate data nomor surat");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNomor = async (nomor) => {
    // Konfirmasi delete
    const confirmed = await notification.confirmAction({
      type: "danger",
      title: "Hapus Nomor Surat?",
      message: `Yakin ingin menghapus nomor surat ini?\n\nNomor: ${nomor.nomor_lengkap}\nNomor Urut: ${nomor.nomor_urut}\nKeterangan: ${nomor.keterangan}\n\nNomor akan dikembalikan ke pool dan bisa digunakan user lain.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    setIsUpdating(true);

    try {
      const result = await deleteNomorSurat(nomor.id, profile.id);

      if (result.success) {
        notification.showSuccessToast(
          "Berhasil Dihapus",
          `Nomor ${nomor.nomor_urut} berhasil dihapus dan dikembalikan ke pool`
        );

        // Hapus dari data lokal
        setHistoryData((prev) => prev.filter((n) => n.id !== nomor.id));
      } else {
        notification.showErrorToast("Gagal Hapus", result.error);
      }
    } catch (error) {
      console.error("Error delete nomor:", error);
      notification.showErrorToast("Error", "Terjadi kesalahan saat menghapus nomor");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredData = historyData.filter((nomor) => {
    if (!searchQuery) return true;

    const search = searchQuery.toLowerCase();
    return (
      nomor.nomor_lengkap.toLowerCase().includes(search) ||
      nomor.keterangan?.toLowerCase().includes(search) ||
      nomor.users?.nama_lengkap?.toLowerCase().includes(search)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b flex justify-between items-center"
          style={{ backgroundColor: "#00325f" }}
        >
          <div className="flex-1 mr-4">
            <h2 className="text-sm md:text-xl font-bold text-white text-left leading-tight">
              {activeTab === "confirmed" ? "Riwayat Konfirmasi" : "Riwayat Emergency"}
            </h2>
            <p className="text-[10px] md:text-sm text-gray-200 mt-0.5 text-left line-clamp-1">
              {activeTab === "confirmed"
                ? isAdmin
                  ? "Semua nomor yang telah dikonfirmasi"
                  : "Nomor yang telah Anda konfirmasi"
                : "Nomor emergency admin (terpakai/belum)"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-white hover:text-gray-300 transition shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b bg-white overflow-x-auto no-scrollbar">
          <div className="px-4 md:px-6 flex gap-2">
            <button
              onClick={() => setActiveTab("confirmed")}
              className={`px-3 md:px-4 py-2.5 md:py-3 font-bold text-xs md:text-sm border-b-2 transition whitespace-nowrap ${
                activeTab === "confirmed"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Dikonfirmasi
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("emergency")}
                className={`px-3 md:px-4 py-2.5 md:py-3 font-bold text-xs md:text-sm border-b-2 transition whitespace-nowrap ${
                  activeTab === "emergency"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Emergency
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari nomor, keterangan, atau user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            {/* Selects & Refresh - Stacked on Mobile, Row on Desktop */}
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1 md:flex md:flex-row md:gap-3">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="all">Semua Periode</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Lalu</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="nomor_asc">Kecil ke Besar</option>
                  <option value="nomor_desc">Besar ke Kecil</option>
                </select>
              </div>

              <button
                onClick={loadHistory}
                disabled={loading}
                className="p-2 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm shrink-0"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                <span className="hidden md:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Memuat data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-600 font-semibold">Tidak ada data</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchQuery ? "Tidak ada nomor yang cocok dengan pencarian" : "Belum ada nomor yang dikonfirmasi"}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-2.5 md:p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                <p className="text-xs md:text-sm font-bold" style={{ color: "#00325f" }}>
                  Total: <span className="text-sm md:text-lg">{filteredData.length}</span> nomor
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[10px] md:text-xs text-blue-600 font-bold hover:underline"
                  >
                    Reset Pencarian
                  </button>
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#00325f" }} className="text-white text-sm">
                      <th className="px-4 py-3 text-center font-semibold">No</th>
                      <th className="px-4 py-3 text-center font-semibold">Nomor Lengkap</th>
                      {activeTab === "emergency" && <th className="px-4 py-3 text-center font-semibold">Status</th>}
                      <th className="px-4 py-3 text-center font-semibold">Data Nomor Surat</th>
                      {isAdmin && activeTab === "confirmed" && (
                        <th className="px-4 py-3 text-center font-semibold">User</th>
                      )}
                      {activeTab === "emergency" && (
                        <th className="px-4 py-3 text-center font-semibold">Diambil Oleh</th>
                      )}
                      <th className="px-4 py-3 text-center font-semibold">Tanggal</th>
                      <th className="px-4 py-3 text-center font-semibold">
                        {activeTab === "confirmed" ? "Dikonfirmasi" : "Direserve"}
                      </th>
                      {activeTab === "confirmed" && <th className="px-4 py-3 text-center font-semibold">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((nomor, index) => (
                      <tr key={nomor.id} className="border-b hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>

                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-blue-700">{nomor.nomor_lengkap}</span>
                          <div className="text-xs text-gray-500 mt-1">Nomor Urut: {nomor.nomor_urut}</div>
                        </td>

                        {/* Status (Emergency tab only) */}
                        {activeTab === "emergency" && (
                          <td className="px-4 py-3 text-sm">
                            {nomor.status === "reserved" ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                                Belum Diambil
                              </span>
                            ) : nomor.status === "confirmed" ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                Sudah Diambil
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                                {nomor.status}
                              </span>
                            )}
                          </td>
                        )}

                        {/* KOLOM DATA NOMOR SURAT - DENGAN EDIT MODE (hanya di tab confirmed) */}
                        <td className="px-4 py-3">
                          {activeTab === "confirmed" && editingId === nomor.id ? (
                            // MODE EDIT (hanya di tab confirmed)
                            <div className="space-y-3 bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                              <div className="grid grid-cols-2 gap-3">
                                {/* Kode Kanwil */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Kode Kanwil <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={editingData.kodeKanwil}
                                    onChange={(e) => handleEditInputChange("kodeKanwil", e.target.value.toUpperCase())}
                                    className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                                      editErrors.kodeKanwil ? "border-red-500" : "border-gray-300"
                                    }`}
                                    placeholder="WIM.2"
                                    disabled={isUpdating}
                                  />
                                  {editErrors.kodeKanwil && (
                                    <p className="text-xs text-red-600 mt-1">{editErrors.kodeKanwil}</p>
                                  )}
                                </div>

                                {/* Kode UPT */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Kode UPT <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={editingData.kodeUPT}
                                    onChange={(e) => handleEditInputChange("kodeUPT", e.target.value.toUpperCase())}
                                    className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                                      editErrors.kodeUPT ? "border-red-500" : "border-gray-300"
                                    }`}
                                    placeholder="IMI.4"
                                    disabled={isUpdating}
                                  />
                                  {editErrors.kodeUPT && (
                                    <p className="text-xs text-red-600 mt-1">{editErrors.kodeUPT}</p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                {/* Kode Masalah */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Kode Masalah <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    maxLength="2"
                                    value={editingData.kodeMasalah}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase();
                                      handleEditInputChange("kodeMasalah", value);
                                    }}
                                    className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                                      editErrors.kodeMasalah ? "border-red-500" : "border-gray-300"
                                    }`}
                                    placeholder="UM"
                                    disabled={isUpdating}
                                  />
                                  {editErrors.kodeMasalah && (
                                    <p className="text-xs text-red-600 mt-1">{editErrors.kodeMasalah}</p>
                                  )}
                                </div>

                                {/* Sub Masalah 1 */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Sub 1 <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    maxLength="2"
                                    value={editingData.subMasalah1}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, "");
                                      handleEditInputChange("subMasalah1", value);
                                    }}
                                    className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      editErrors.subMasalah1 ? "border-red-500" : "border-gray-300"
                                    }`}
                                    placeholder="01"
                                    disabled={isUpdating}
                                  />
                                  {editErrors.subMasalah1 && (
                                    <p className="text-xs text-red-600 mt-1">{editErrors.subMasalah1}</p>
                                  )}
                                </div>

                                {/* Sub Masalah 2 */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Sub 2 <span className="text-gray-400">(opsional)</span>
                                  </label>
                                  <input
                                    type="text"
                                    maxLength="2"
                                    value={editingData.subMasalah2}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, "");
                                      handleEditInputChange("subMasalah2", value);
                                    }}
                                    className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      editErrors.subMasalah2 ? "border-red-500" : "border-gray-300"
                                    }`}
                                    placeholder="01"
                                    disabled={isUpdating}
                                  />
                                  {editErrors.subMasalah2 && (
                                    <p className="text-xs text-red-600 mt-1">{editErrors.subMasalah2}</p>
                                  )}
                                </div>
                              </div>

                              {/* Keterangan */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Keterangan <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  value={editingData.keterangan}
                                  onChange={(e) => handleEditInputChange("keterangan", e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    editErrors.keterangan ? "border-red-500" : "border-gray-300"
                                  }`}
                                  rows="2"
                                  placeholder="Masukkan keterangan..."
                                  disabled={isUpdating}
                                />
                                {editErrors.keterangan && (
                                  <p className="text-xs text-red-600 mt-1">{editErrors.keterangan}</p>
                                )}
                              </div>

                              {/* Tombol Save & Cancel */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleSaveEdit(nomor.id)}
                                  disabled={isUpdating}
                                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                >
                                  {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={isUpdating}
                                  className="px-4 py-2 bg-gray-400 text-white rounded-lg text-sm font-semibold hover:bg-gray-500 transition disabled:opacity-50"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            // MODE NORMAL (semua tab)
                            <div className="text-sm">
                              <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-gray-50 rounded">
                                <div>
                                  <span className="text-xs text-gray-500">Kanwil:</span>
                                  <span className="ml-1 font-semibold text-gray-700">{nomor.kode_kanwil}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">UPT:</span>
                                  <span className="ml-1 font-semibold text-gray-700">{nomor.kode_upt}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Masalah:</span>
                                  <span className="ml-1 font-semibold text-gray-700">{nomor.kode_masalah}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Sub:</span>
                                  <span className="ml-1 font-semibold text-gray-700">
                                    {nomor.kode_submasalah1}
                                    {nomor.kode_submasalah2 && `.${nomor.kode_submasalah2}`}
                                  </span>
                                </div>
                              </div>
                              <div className="pt-2 border-t">
                                <span className="text-xs text-gray-500">Keterangan:</span>
                                <div className="mt-1 text-gray-700">
                                  {nomor.keterangan || <span className="text-gray-400 italic">-</span>}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* User (Confirmed tab only) */}
                        {isAdmin && activeTab === "confirmed" && (
                          <td className="px-4 py-3 text-sm">
                            <div className="font-semibold text-gray-900">{nomor.users?.nama_lengkap || "Unknown"}</div>
                            <div className="text-xs text-gray-500">{nomor.users?.seksi || "-"}</div>
                          </td>
                        )}

                        {/* Diambil Oleh (Emergency tab only) */}
                        {activeTab === "emergency" && (
                          <td className="px-4 py-3 text-sm">
                            {nomor.user_id ? (
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {nomor.users?.nama_lengkap || "Unknown"}
                                </div>
                                <div className="text-xs text-gray-500">{nomor.users?.seksi || "-"}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">Belum diambil</span>
                            )}
                          </td>
                        )}

                        {/* Tanggal */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(nomor.tanggal).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Dikonfirmasi / Direserve */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {activeTab === "confirmed"
                            ? nomor.confirmed_at
                              ? new Date(nomor.confirmed_at).toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"
                            : nomor.reserved_at
                            ? new Date(nomor.reserved_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </td>

                        {/* KOLOM AKSI - TOMBOL EDIT & DELETE (hanya di tab confirmed) */}
                        {activeTab === "confirmed" && (
                          <td className="px-4 py-3 text-center">
                            {editingId === nomor.id ? (
                              <span className="text-xs text-gray-400 italic">Editing...</span>
                            ) : (
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => handleStartEdit(nomor)}
                                  disabled={editingId !== null || isUpdating}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Edit
                                </button>
                                {(isSuperAdmin || isAdmin) && (
                                  <button
                                    onClick={() => handleDeleteNomor(nomor)}
                                    disabled={editingId !== null || isUpdating}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Card List */}
              <div className="md:hidden space-y-3">
                {filteredData.map((nomor, index) => (
                  <div
                    key={nomor.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-colors"
                  >
                    {/* Card Header: sequence and date */}
                    <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">#{index + 1}</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(nomor.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long" })}
                      </span>
                    </div>

                    <div className="p-3">
                      {/* Full Numer */}
                      <div className="mb-2.5">
                        <div className="font-mono font-bold text-sm text-blue-700 break-all leading-tight bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                          {nomor.nomor_lengkap}
                          {activeTab === "emergency" && (
                            <span
                              className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                nomor.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {nomor.status === "confirmed" ? "Terpakai" : "Ready"}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 pl-1 italic">Nomor Urut: {nomor.nomor_urut}</div>
                      </div>

                      {/* Metadata Grid (Kanwil, UPT, Masalah) */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 bg-gray-50/50 p-2 rounded-lg text-[11px]">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                            Instansi
                          </span>
                          <span className="text-gray-700 font-semibold">
                            {nomor.kode_kanwil}.{nomor.kode_upt}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                            Klasifikasi
                          </span>
                          <span className="text-gray-700 font-semibold">
                            {nomor.kode_masalah}.{nomor.kode_submasalah1}
                            {nomor.kode_submasalah2 && `.${nomor.kode_submasalah2}`}
                          </span>
                        </div>
                        {isAdmin && activeTab === "confirmed" && (
                          <div className="flex flex-col col-span-2 mt-1 pt-1 border-t border-gray-100">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                              Petugas
                            </span>
                            <span className="text-gray-700 font-bold truncate">
                              {nomor.users?.nama_lengkap || "Unknown"}
                            </span>
                          </div>
                        )}
                        {activeTab === "emergency" && nomor.user_id && (
                          <div className="flex flex-col col-span-2 mt-1 pt-1 border-t border-gray-100">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                              Diambil Oleh
                            </span>
                            <span className="text-gray-700 font-bold truncate">
                              {nomor.users?.nama_lengkap || "Unknown"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Keterangan */}
                      <div className="mb-3">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter block mb-0.5">
                          Keterangan
                        </span>
                        <p className="text-xs text-gray-700 leading-normal line-clamp-3 italic">
                          {nomor.keterangan || <span className="text-gray-300 italic">Tidak ada keterangan</span>}
                        </p>
                      </div>

                      {/* Actions for Confirmed Tab */}
                      {activeTab === "confirmed" && (
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleStartEdit(nomor)}
                            disabled={editingId !== null || isUpdating}
                            className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition disabled:opacity-50 border border-blue-100"
                          >
                            Edit Data
                          </button>
                          {(isSuperAdmin || isAdmin) && (
                            <button
                              onClick={() => handleDeleteNomor(nomor)}
                              disabled={editingId !== null || isUpdating}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition disabled:opacity-50 border border-red-100"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      )}

                      {/* Info Confirmation Date */}
                      <div className="mt-2 text-[9px] text-gray-400 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {activeTab === "confirmed" ? "Konfirmasi: " : "Reserve: "}
                        {activeTab === "confirmed"
                          ? nomor.confirmed_at
                            ? new Date(nomor.confirmed_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"
                          : nomor.reserved_at
                          ? new Date(nomor.reserved_at).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </div>
                    </div>

                    {/* Inline Edit Form for Mobile */}
                    {activeTab === "confirmed" && editingId === nomor.id && (
                      <div className="px-3 pb-3 pt-0 border-t border-blue-100 bg-blue-50/30">
                        <div className="bg-white p-3 rounded-lg border border-blue-200 mt-2 shadow-sm space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Kanwil</label>
                              <input
                                type="text"
                                value={editingData.kodeKanwil}
                                onChange={(e) => handleEditInputChange("kodeKanwil", e.target.value.toUpperCase())}
                                className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded text-xs uppercase"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">UPT</label>
                              <input
                                type="text"
                                value={editingData.kodeUPT}
                                onChange={(e) => handleEditInputChange("kodeUPT", e.target.value.toUpperCase())}
                                className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded text-xs uppercase"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Masalah</label>
                              <input
                                type="text"
                                maxLength="2"
                                value={editingData.kodeMasalah}
                                onChange={(e) => handleEditInputChange("kodeMasalah", e.target.value.toUpperCase())}
                                className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded text-xs uppercase"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Sub 1</label>
                              <input
                                type="text"
                                maxLength="2"
                                value={editingData.subMasalah1}
                                onChange={(e) => handleEditInputChange("subMasalah1", e.target.value)}
                                className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Sub 2</label>
                              <input
                                type="text"
                                maxLength="2"
                                value={editingData.subMasalah2}
                                onChange={(e) => handleEditInputChange("subMasalah2", e.target.value)}
                                className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Keterangan</label>
                            <textarea
                              value={editingData.keterangan}
                              onChange={(e) => handleEditInputChange("keterangan", e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              rows="2"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(nomor.id)}
                              className="flex-1 py-2 bg-green-600 text-white rounded font-bold text-xs"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-bold text-xs"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition text-sm md:text-base"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
