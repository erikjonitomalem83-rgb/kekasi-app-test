import React from "react";
import LogoKEKASI from "../../assets/images/Logo_KEKASI.svg";
import LogoK from "../../assets/images/Logo_K.svg";

export default function DashboardHeader({
  profile,
  isAdmin,
  isSuperAdmin,
  isSubmitting,
  onShowRekap,
  onShowHistory,
  onShowCreateUser,
  onShowUserList,
  onCleanExpired,
  onShowProfile,
  onLogout,
}) {
  return (
    <header
      className="bg-transparent shadow-lg"
      style={{
        borderBottomLeftRadius: "20px",
        borderBottomRightRadius: "20px",
      }}
    >
      <div className="container mx-auto px-4 md:px-6 py-2 flex justify-between items-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            {/* Desktop Logo */}
            <img src={LogoKEKASI} alt="Logo KEKASI" className="hidden md:block w-28 h-8 object-contain" />
            {/* Mobile Logo */}
            <img src={LogoK} alt="Logo KEKASI" className="md:hidden w-8 h-8 object-contain" />
          </div>
          <p
            className="hidden md:block text-gray-700 font-semibold text-center mt-1"
            style={{
              fontSize: "10px",
              lineHeight: "1.2",
            }}
          >
            Kantor Imigrasi Kelas II TPI Pematang Siantar
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 lg:gap-4">
          <div className="text-right hidden lg:block">
            <p className="text-sm font-semibold text-gray-800">{profile?.nama_lengkap}</p>
            <p className="text-xs text-gray-600">{profile?.seksi}</p>
            {isAdmin && (
              <span
                className="inline-block mt-1 px-2 py-1 text-xs rounded-full font-semibold"
                style={{ backgroundColor: "#efbc62", color: "#00325f" }}
              >
                Admin
              </span>
            )}
          </div>

          <button
            onClick={onShowRekap}
            className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition text-xs lg:text-sm"
            disabled={isSubmitting}
          >
            <span className="hidden lg:inline">Rekap</span>
            <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>

          <button
            onClick={onShowHistory}
            className="bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition text-xs lg:text-sm whitespace-nowrap"
            disabled={isSubmitting}
          >
            <span className="hidden xl:inline">Riwayat Nomor</span>
            <span className="hidden lg:inline xl:hidden">Riwayat</span>
            <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>

          {(isAdmin || isSuperAdmin) && (
            <>
              <button
                onClick={onShowCreateUser}
                className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition text-xs lg:text-sm whitespace-nowrap"
                disabled={isSubmitting}
              >
                <span className="hidden lg:inline">Buat Akun Baru</span>
                <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </button>

              <button
                onClick={onShowUserList}
                className="bg-purple-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-purple-700 transition text-xs lg:text-sm whitespace-nowrap"
                disabled={isSubmitting}
              >
                <span className="hidden lg:inline">Users</span>
                <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </button>
            </>
          )}

          {isAdmin && (
            <button
              onClick={onCleanExpired}
              className="bg-yellow-500 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-yellow-600 transition text-xs lg:text-sm whitespace-nowrap"
              disabled={isSubmitting}
            >
              <span className="hidden lg:inline">Clean Expired</span>
              <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </button>
          )}

          <button
            onClick={onShowProfile}
            className="bg-indigo-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-indigo-700 transition text-xs lg:text-sm"
            disabled={isSubmitting}
          >
            <span className="hidden lg:inline">Profil</span>
            <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>

          <button
            onClick={() => onLogout(false)}
            className="bg-gray-200 text-gray-800 px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition text-xs lg:text-sm"
          >
            <span className="hidden lg:inline">Logout</span>
            <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Buttons */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={onShowRekap}
            className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>

          <button
            onClick={onShowHistory}
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>

          <button
            onClick={onShowProfile}
            className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>

          <button
            onClick={() => onLogout(false)}
            className="bg-gray-200 text-gray-800 p-2 rounded-md hover:bg-gray-300 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
