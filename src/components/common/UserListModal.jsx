import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import { updateUserData, deleteUser } from "../../services/adminService";

export default function UserListModal({ isOpen, onClose, notification, profile, onShowCreateUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);

  // Edit Mode State
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    username: "",
    email: "", // Tambahkan email
    seksi: "",
    nomor_hp: "",
    role: "user",
    is_active: true,
  });

  // Wrap loadUsers in useCallback to fix dependency warning
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").select("*").order("nama_lengkap", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      notification.showErrorToast("Error", "Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  }, [notification]); // Add notification to dependency if stable, or keep empty if we trust it doesn't change

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, loadUsers]);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      nama_lengkap: user.nama_lengkap,
      username: user.username,
      email: user.email || "", // Populate email
      seksi: user.seksi || "",
      nomor_hp: user.nomor_hp || "",
      role: user.role,
      is_active: user.is_active,
    });
  };

  const handleDeleteClick = async (user) => {
    const confirm = await notification.confirmAction({
      title: "Hapus Pengguna",
      message: `Apakah Anda yakin ingin menghapus pengguna "${user.nama_lengkap}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Hapus",
      type: "danger",
    });

    if (confirm) {
      setProcessing(true);
      try {
        const result = await deleteUser(user.id);
        if (result.success) {
          notification.showSuccessToast("Berhasil", "Pengguna berhasil dihapus");
          loadUsers();
        } else {
          notification.showErrorToast("Gagal", result.error);
        }
      } catch (error) {
        console.error("Delete error:", error);
        notification.showErrorToast("Error", "Terjadi kesalahan saat menghapus pengguna");
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.nama_lengkap || !formData.username) {
      notification.showWarningToast("Peringatan", "Nama Lengkap dan Username wajib diisi");
      return;
    }

    setProcessing(true);
    try {
      // NOTE: Update email di tabel 'users' publik AMAN karena login menggunakan custom auth yang membaca dari tabel ini.
      // Jika di masa depan menggunakan Supabase Auth native (magic link, reset password),
      // perlu sinkronisasi additional ke auth.users via backend function.
      const result = await updateUserData(editingUser.id, formData);
      if (result.success) {
        notification.showSuccessToast("Berhasil", "Data pengguna berhasil diperbarui");
        setEditingUser(null); // Tutup form edit
        loadUsers(); // Reload list
      } else {
        notification.showErrorToast("Gagal", result.error);
      }
    } catch (error) {
      console.error("Update error:", error);
      notification.showErrorToast("Error", "Terjadi kesalahan saat menyimpan data");
    } finally {
      setProcessing(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Menampilkan 8 user per halaman agar tidak scroll

  // ... (loadUsers tetap sama)

  const filteredUsers = users.filter(
    (user) =>
      user.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.seksi?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset ke halaman 1 saat mencari
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Container Utama - Lebar Dinamis: 5xl untuk tabel, 2xl untuk form edit agar pas */}
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden transition-all duration-300 ${
          editingUser ? "max-w-2xl" : "max-w-5xl"
        }`}
      >
        {/* EDIT OVERLAY (Muncul di atas list jika ada user yang diedit) */}
        {editingUser && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col animate-fadeIn">
            <div className="flex-shrink-0 px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Edit Pengguna</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Alert Info Auth */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Mengubah data disini (termasuk email) akan langsung tersimpan dan berpengaruh pada login
                        pengguna.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="max-w-[300px] md:max-w-full mx-auto w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={formData.nama_lengkap}
                      onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="max-w-[300px] md:max-w-full mx-auto w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  {/* Email Input */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="contoh@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Seksi / Bagian</label>
                    <input
                      type="text"
                      value={formData.seksi}
                      onChange={(e) => setFormData({ ...formData, seksi: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">No. HP</label>
                    <input
                      type="text"
                      value={formData.nomor_hp}
                      onChange={(e) => setFormData({ ...formData, nomor_hp: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Pengaturan Akun</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Status Akun</label>
                      <select
                        value={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "true" })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        {/* Convert boolean properly */}
                        <option value="true">Aktif</option>
                        <option value="false">Nonaktif (Banned)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={processing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        )}

        {/* LIST VIEW (Tampilan Tabel Normal) */}
        <div className="sticky top-0 bg-[#9333ea] border-b border-white/10 px-6 py-4 rounded-t-xl z-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Daftar Pengguna</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={onShowCreateUser}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah User
              </button>
              <button onClick={onClose} className="text-white hover:bg-white/10 transition rounded-full p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Cari nama, username, atau seksi..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          />
        </div>

        {/* Content Table - Fixed min-height to prevent jumping during pagination (set to match 8 rows height) */}
        <div className="flex-1 overflow-y-auto p-6 z-0 min-h-[580px]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <p className="text-gray-500 font-semibold">Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 text-center">No</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 text-center">Nama Lengkap</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 text-center">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 text-center">Seksi</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 text-center">No. HP</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 text-center">Role</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 text-center">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user, index) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{user.nama_lengkap}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{user.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.seksi || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.nomor_hp || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            user.role === "superadmin"
                              ? "bg-red-100 text-red-800"
                              : user.role === "admin"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            user.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* Jangan biarkan user menghapus dirinya sendiri */}
                        {profile?.id !== user.id && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                              title="Edit Pengguna"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                              title="Hapus Pengguna"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl z-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Total: <span className="font-bold text-gray-800">{filteredUsers.length}</span> pengguna
              </p>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1 px-2">
                    <span className="text-xs font-bold text-purple-600">{currentPage}</span>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-xs text-gray-500">{totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
