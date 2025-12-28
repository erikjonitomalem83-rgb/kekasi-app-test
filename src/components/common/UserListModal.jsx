import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";

export default function UserListModal({ isOpen, onClose, notification }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
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
  };

  const filteredUsers = users.filter(
    (user) =>
      user.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.seksi?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Daftar Pengguna</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Cari nama, username, atau seksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{user.nama_lengkap}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.username}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Total: <span className="font-bold text-gray-800">{filteredUsers.length}</span> pengguna
              {searchTerm && ` (dari ${users.length} total)`}
            </p>
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
