import React, { useState } from "react";
import LogoKekasi from "../assets/images/Logo_KEKASI.svg";

export default function Sidebar({
  isAdmin,
  isSuperAdmin,
  isSubmitting,
  onShowRekap,
  onShowHistory,
  onShowUserList,
  onShowHoliday,
  onCleanExpired,
  onShowProfile,
  // Emergency Pool Props
  adminPool = [],
  adminPoolSchedule = null,
  edgeFunctionLogs = [],
  onAmbilEmergency,
  onGeneratePoolManual,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: "Rekap",
      icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      color: "bg-green-600",
      onClick: onShowRekap,
      show: true,
    },
    {
      label: "Riwayat Nomor",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      color: "bg-blue-600",
      onClick: onShowHistory,
      show: true,
    },
    {
      label: "Users",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
      color: "bg-purple-600",
      onClick: onShowUserList,
      show: isAdmin || isSuperAdmin,
    },
    {
      label: "Hari Libur",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      color: "bg-red-600",
      onClick: onShowHoliday,
      show: isAdmin || isSuperAdmin,
    },
    {
      label: "Clean Expired",
      icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
      color: "bg-yellow-500",
      onClick: onCleanExpired,
      show: isAdmin,
    },
    {
      label: "Profil",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      color: "bg-indigo-600",
      onClick: onShowProfile,
      show: true,
    },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-white shadow-lg rounded-md text-gray-600"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white z-40 transition-transform duration-300 transform 
          ${
            isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } md:translate-x-0 md:static md:block border-r shadow-none md:shadow-sm`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b flex items-center justify-center bg-gradient-to-r from-gray-50 to-white">
            <img src={LogoKekasi} alt="Logo KEKASI" className="w-32 h-auto object-contain" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Main Menu</p>
              {menuItems.map(
                (item, index) =>
                  item.show && (
                    <button
                      key={index}
                      onClick={() => {
                        item.onClick();
                        if (window.innerWidth < 768) setIsOpen(false);
                      }}
                      disabled={isSubmitting}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all hover:bg-gray-100 group"
                    >
                      <div
                        className={`${item.color} p-2 rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 leading-none">{item.label}</span>
                    </button>
                  )
              )}
            </nav>

            {/* Emergency Pool Section */}
            {isAdmin && (
              <div className="mx-4 my-6 p-4 bg-[#efbc62]/10 rounded-2xl border border-[#efbc62] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#00325f] uppercase">Emergency Pool</h3>
                  <div className="flex gap-1">
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        adminPool.length > 0 ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></span>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap mb-4">
                  {adminPool.length > 0 ? (
                    adminPool.map((nomor) => (
                      <span
                        key={nomor.id}
                        className="px-2 py-1 bg-[#efbc62] text-[#00325f] text-xs font-bold rounded-lg shadow-sm border border-[#efbc62]/20"
                      >
                        {nomor.nomor_urut}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#00325f] italic font-medium">Pool Kosong</span>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={onAmbilEmergency}
                    disabled={isSubmitting || adminPool.length === 0}
                    className="w-full bg-[#efbc62] hover:brightness-105 text-[#00325f] py-2 rounded-lg text-[11px] font-bold transition shadow-sm disabled:opacity-50"
                  >
                    Ambil Nomor
                  </button>
                  <button
                    onClick={onGeneratePoolManual}
                    disabled={isSubmitting}
                    className="w-full bg-white hover:bg-[#efbc62]/10 text-[#00325f] border border-[#efbc62] py-2 rounded-lg text-[11px] font-bold transition shadow-sm disabled:opacity-50"
                  >
                    Generate Pool
                  </button>
                </div>

                {/* Schedule Info - More Visible */}
                {adminPoolSchedule && (
                  <div className="mt-4 pt-3 border-t border-[#efbc62]/30">
                    <p className="text-[11px] font-bold text-[#00325f] uppercase mb-2 tracking-wide">Jadwal Otomatis</p>
                    <div className="flex gap-1.5">
                      {adminPoolSchedule.scheduled_dates.map((date) => (
                        <span
                          key={date}
                          className={`px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm ${
                            new Date().getDate() === date
                              ? "bg-[#efbc62] text-[#00325f] ring-2 ring-[#efbc62]/50"
                              : "bg-white text-[#00325f] border border-[#efbc62]"
                          }`}
                        >
                          {date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edge Status */}
                {edgeFunctionLogs[0] && (
                  <div className="mt-3 text-center">
                    <p
                      className={`text-[8px] font-bold uppercase ${
                        edgeFunctionLogs[0].success ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      Last Sync: {edgeFunctionLogs[0].success ? "Success" : "Failed"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
