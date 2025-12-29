import { useState } from "react";
import ChangePasswordModal from "./ChangePasswordModal";

export default function ProfileModal({ isOpen, onClose, profile, user, isAdmin }) {
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Profil Pengguna</h2>
              <button onClick={onClose} className="text-white hover:text-gray-200 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Profile Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {profile?.nama_lengkap?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{profile?.nama_lengkap}</p>
                <p className="text-sm text-gray-600">{profile?.email}</p>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Role</p>
                    <p className="text-sm font-semibold text-gray-800">{profile?.role}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Seksi</p>
                    <p className="text-sm font-semibold text-gray-800">{profile?.seksi}</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  <p className="text-xs text-center font-semibold text-yellow-800">Admin Access</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex gap-3">
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Ubah Password
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => {
          setShowChangePassword(false);
          onClose();
        }}
        currentUser={user}
      />
    </>
  );
}
