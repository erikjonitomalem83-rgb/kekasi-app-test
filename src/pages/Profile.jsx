import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from "../components/common/ChangePasswordModal";

export default function Profile() {
  const { profile, user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Profil Saya</h1>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Nama Lengkap</label>
              <p className="text-gray-800 mt-1">{profile?.nama_lengkap}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600">Username</label>
              <p className="text-gray-800 mt-1">{profile?.username}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600">Email</label>
              <p className="text-gray-800 mt-1">{profile?.email}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600">Nomor HP</label>
              <p className="text-gray-800 mt-1">{profile?.nomor_hp}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600">Seksi</label>
              <p className="text-gray-800 mt-1">{profile?.seksi}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600">Role</label>
              <p className="text-gray-800 mt-1 capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Keamanan Akun</h2>
          <button
            onClick={() => setShowChangePassword(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Ganti Password
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={(message) => {
          setNotification({ show: true, message, type: "success" });
          setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
        }}
        currentUser={user}
      />

      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              notification.type === "success" ? "bg-green-500" : "bg-red-500"
            } text-white`}
          >
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}
