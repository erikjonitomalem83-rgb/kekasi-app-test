import React, { useEffect, useRef } from "react";
import CountdownTimer from "../common/CountdownTimer";

export default function ReservedNumbersList({
  reservedNumbers,
  expiredIds,
  isSubmitting,
  onKonfirmasiSemua,
  onBatalkanSemua,
  onNomorExpired,
  onCancelNomor,
  onItemDataChange,
  isModalView = false,
}) {
  const [activeDropdownId, setActiveDropdownId] = React.useState(null);
  const headerRef = useRef(null);
  const prevCount = useRef(0);
  const inputRefs = useRef({}); // Store refs for all inputs: { [id-field]: element }

  useEffect(() => {
    const currentCount = reservedNumbers?.length || 0;
    if (currentCount > prevCount.current && window.innerWidth < 1024 && !isModalView) {
      const timer = setTimeout(() => {
        headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
    prevCount.current = currentCount;
  }, [reservedNumbers?.length, isModalView]);

  if (!reservedNumbers) {
    if (isModalView) return null;
    return (
      <div className="lg:col-span-6 bg-white bg-opacity-50 p-6 rounded-xl shadow-md border-2 border-dashed border-gray-300">
        <h3 style={{ color: "#00325f" }} className="text-lg font-bold mb-4">
          Nomor yang Dipesan:
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-500 font-semibold mb-2">Belum ada nomor yang dipesan</p>
          <p className="text-sm text-gray-400 max-w-md">
            Klik tombol "Pesan Nomor Surat" di sebelah kiri untuk memesan nomor
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        isModalView
          ? "bg-white"
          : "lg:col-span-6 bg-white p-4 md:p-6 rounded-none md:rounded-xl shadow-sm md:shadow-md border-y md:border border-gray-200"
      }`}
    >
      {/* STICKY HEADER FOR TIMER & BUTTONS (Modal View Only) */}
      {isModalView && (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm px-4 py-2 md:py-3 space-y-2">
          {/* COMPACT STICKY TIMER */}
          <div className="flex items-center justify-center gap-2 bg-red-50 py-0 px-3 md:px-4 rounded-xl border border-red-100 shadow-sm transition-all">
            <div className="bg-red-500 p-0.5 rounded-full shrink-0">
              <svg
                className="w-2 h-2 md:w-2.5 md:h-2.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[8px] sm:text-[10px] font-bold text-red-800 uppercase tracking-wider">
                Sisa Waktu Pemesanan:
              </span>
              <div className="text-red-600">
                <CountdownTimer
                  expiredAt={reservedNumbers[0].expired_at}
                  onExpired={() => onNomorExpired(reservedNumbers.map((n) => n.id))}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* COMPACT ACTION BUTTONS */}
          <div className="flex flex-row justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              className="flex-1 max-w-[180px] font-medium py-3 md:py-3.5 px-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-xs sm:text-base shadow-sm flex items-center justify-center gap-1 md:gap-1.5"
              style={{ backgroundColor: "#efbc62", color: "#00325f" }}
              onClick={onKonfirmasiSemua}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              Konfirmasi ({reservedNumbers.length})
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              className="flex-1 max-w-[180px] font-medium py-3 md:py-3.5 px-3 rounded-xl transition-all bg-red-600 text-white active:scale-95 disabled:opacity-50 text-xs sm:text-base shadow-sm flex items-center justify-center gap-1 md:gap-1.5"
              onClick={onBatalkanSemua}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Batal Semua
            </button>
          </div>
        </div>
      )}

      {/* NON-MODAL HEADER */}
      <div
        className={`${
          isModalView
            ? "hidden"
            : "sticky top-0 z-20 bg-[#efbc62] backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6 py-3 -mt-4 md:-mt-6 mb-3 md:rounded-t-xl border-b border-[#efbc62]/20 flex items-center justify-between shadow-sm"
        }`}
        ref={headerRef}
      >
        <h3 style={{ color: "#00325f" }} className="text-sm md:text-lg font-bold">
          Nomor yang Dipesan:
        </h3>
      </div>

      <div className={`p-3 md:p-6 ${isModalView ? "p-3" : "p-4"}`}>
        <div className="space-y-2">
          {reservedNumbers.map((nomor, index) => {
            const isExpired = expiredIds.has(nomor.id);
            const sequenceNum = index + 1;

            return (
              <div
                key={nomor.id}
                className={`bg-white rounded-2xl p-2.5 md:p-4 border border-gray-100 shadow-sm transition-all duration-300 ring-1 ring-gray-50 ${
                  isExpired ? "opacity-30 grayscale" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch md:items-start">
                  {/* ULTRA COMPACT MOBILE HEADER (Side-by-side Badge, Codes, Actions) */}
                  <div className="flex md:hidden items-center justify-between gap-2">
                    <div className="relative flex flex-col items-center justify-center w-12 h-12 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-inner shrink-0 leading-none">
                      <span className="text-[9px] font-bold opacity-50 mb-0.5">#{sequenceNum}</span>
                      <span className="text-base font-bold">{nomor.nomor_urut}</span>
                      {nomor.is_reused && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-[5px] font-bold px-1 py-0.5 rounded-full shadow-sm text-yellow-900 border border-yellow-500 animate-bounce">
                          REUSE
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 relative">
                          <input
                            ref={(el) => (inputRefs.current[`${nomor.id}-km`] = el)}
                            type="text"
                            maxLength={2}
                            autoComplete="off"
                            className="w-10 text-center text-[10px] font-bold bg-white border border-gray-200 rounded-md py-0.5 uppercase text-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 z-10 relative"
                            value={nomor.kode_masalah}
                            onChange={(e) => {
                              onItemDataChange(nomor.id, "kode_masalah", e.target.value);
                            }}
                            onFocus={(e) => {
                              setActiveDropdownId(nomor.id);
                              // Auto scroll to make room for dropdown
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                              }, 100);
                            }}
                            onBlur={() => setTimeout(() => setActiveDropdownId(null), 200)}
                            placeholder="UM"
                            disabled={isExpired}
                          />
                          {activeDropdownId === nomor.id && (
                            <div
                              className="absolute top-full left-0 w-20 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 overflow-hidden py-1 max-h-48 overflow-y-auto"
                              style={{ zIndex: 9999 }}
                            >
                              {["UM", "GR", "SA", "TI", "KU"].map((opt) => (
                                <div
                                  key={opt}
                                  className="px-2 py-2 text-[10px] font-bold text-gray-700 hover:bg-blue-50 cursor-pointer text-center border-b border-gray-50 last:border-0"
                                  onClick={() => {
                                    onItemDataChange(nomor.id, "kode_masalah", opt);
                                    setActiveDropdownId(null);
                                    inputRefs.current[`${nomor.id}-ks1`]?.focus(); // Optional: Focus next after selection for better flow
                                  }}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="font-bold text-gray-300">.</span>
                          <input
                            ref={(el) => (inputRefs.current[`${nomor.id}-ks1`] = el)}
                            type="text"
                            maxLength={3}
                            className="w-7 text-center text-[10px] font-bold bg-white border border-gray-200 rounded-md py-0.5 text-blue-700"
                            value={nomor.kode_submasalah1}
                            onFocus={(e) => {
                              if (nomor.kode_submasalah1 === "01") {
                                onItemDataChange(nomor.id, "kode_submasalah1", "");
                              }
                              e.target.select();
                            }}
                            onChange={(e) => {
                              onItemDataChange(nomor.id, "kode_submasalah1", e.target.value);
                            }}
                            placeholder="01"
                            disabled={isExpired}
                          />
                          <input
                            ref={(el) => (inputRefs.current[`${nomor.id}-ks2`] = el)}
                            type="text"
                            maxLength={3}
                            className="w-7 text-center text-[10px] font-bold bg-white border border-gray-200 rounded-md py-0.5 text-blue-700 ml-0.5"
                            value={nomor.kode_submasalah2}
                            onFocus={(e) => {
                              if (nomor.kode_submasalah2 === "01") {
                                onItemDataChange(nomor.id, "kode_submasalah2", "");
                              }
                              e.target.select();
                            }}
                            onChange={(e) => onItemDataChange(nomor.id, "kode_submasalah2", e.target.value)}
                            placeholder="01"
                            disabled={isExpired}
                          />
                        </div>
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold text-blue-600 truncate uppercase tracking-tight">
                        {nomor.nomor_lengkap}
                      </div>
                    </div>

                    <button
                      type="button"
                      tabIndex="-1"
                      disabled={isExpired}
                      className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100"
                      onClick={() => onCancelNomor(nomor)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* DESKTOP BADGE (Hidden on Mobile) */}
                  <div className="hidden md:flex relative flex-col items-center justify-center w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 shadow-inner shrink-0 transition-colors">
                    <span className="text-sm font-bold opacity-50 mb-0.5">#{sequenceNum}</span>
                    <span className="text-xl font-bold">{nomor.nomor_urut}</span>
                    {nomor.is_reused && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-[8px] font-bold px-1 py-0.5 rounded-full shadow-sm text-yellow-900 border border-yellow-500 animate-bounce">
                        REUSE
                      </div>
                    )}
                  </div>

                  {/* INFO AREA */}
                  <div className="flex-1 min-w-0 space-y-1 md:space-y-3">
                    {/* PC CODES & PREVIEW (Hidden on Mobile) */}
                    <div className="hidden md:flex flex-row items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Kode:</span>
                        <div className="flex items-center gap-1 relative">
                          <input
                            ref={(el) => (inputRefs.current[`${nomor.id}-km-pc`] = el)}
                            type="text"
                            maxLength={2}
                            autoComplete="off"
                            className="w-10 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none uppercase text-blue-700 z-10 relative"
                            value={nomor.kode_masalah}
                            onChange={(e) => {
                              onItemDataChange(nomor.id, "kode_masalah", e.target.value);
                            }}
                            onFocus={(e) => {
                              setActiveDropdownId(`${nomor.id}-pc`);
                              // Auto scroll to make room for dropdown
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                              }, 100);
                            }}
                            onBlur={() => setTimeout(() => setActiveDropdownId(null), 200)}
                            placeholder="UM"
                            disabled={isExpired}
                          />
                          {activeDropdownId === `${nomor.id}-pc` && (
                            <div
                              className="absolute top-full left-0 w-24 bg-white border border-gray-200 rounded-lg shadow-xl z-50 mt-1 overflow-hidden py-1 max-h-48 overflow-y-auto"
                              style={{ zIndex: 9999 }}
                            >
                              {["UM", "GR", "SA", "TI", "KU"].map((opt) => (
                                <div
                                  key={opt}
                                  className="px-3 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 cursor-pointer text-center border-b border-gray-50 last:border-0"
                                  onClick={() => {
                                    onItemDataChange(nomor.id, "kode_masalah", opt);
                                    setActiveDropdownId(null);
                                    inputRefs.current[`${nomor.id}-ks1-pc`]?.focus();
                                  }}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="font-bold text-gray-300">.</span>
                          <input
                            ref={(el) => (inputRefs.current[`${nomor.id}-ks1-pc`] = el)}
                            type="text"
                            maxLength={3}
                            className="w-8 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-blue-700"
                            value={nomor.kode_submasalah1}
                            onChange={(e) => {
                              onItemDataChange(nomor.id, "kode_submasalah1", e.target.value);
                            }}
                            onFocus={(e) => {
                              if (nomor.kode_submasalah1 === "01") {
                                onItemDataChange(nomor.id, "kode_submasalah1", "");
                              }
                              e.target.select();
                            }}
                            placeholder="01"
                            disabled={isExpired}
                          />
                          <span className="font-bold text-gray-300">.</span>
                          <input
                            ref={(el) => (inputRefs.current[`${nomor.id}-ks2-pc`] = el)}
                            type="text"
                            maxLength={3}
                            className="w-8 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-blue-700"
                            value={nomor.kode_submasalah2}
                            onChange={(e) => onItemDataChange(nomor.id, "kode_submasalah2", e.target.value)}
                            onFocus={(e) => {
                              if (nomor.kode_submasalah2 === "01") {
                                onItemDataChange(nomor.id, "kode_submasalah2", "");
                              }
                              e.target.select();
                            }}
                            placeholder="01"
                            disabled={isExpired}
                          />
                        </div>
                      </div>
                      <div className="h-4 w-px bg-gray-200"></div>
                      <div className="flex items-center gap-1.5 bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100/50">
                        <span className="text-[10px] font-bold text-blue-300 uppercase">Preview:</span>
                        <span className="text-xs font-bold text-blue-800 uppercase">{nomor.nomor_lengkap}</span>
                      </div>
                    </div>

                    <div className="relative group">
                      <input
                        ref={(el) => (inputRefs.current[`${nomor.id}-ket`] = el)}
                        type="text"
                        required
                        autoComplete="off"
                        disabled={isExpired}
                        placeholder={isExpired ? "Sesi berakhir" : "Keterangan * (Wajib Diisi)"}
                        className={`w-full px-3 md:px-4 py-1.5 md:py-2.5 bg-gray-50/30 border rounded-xl text-[10px] md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 focus:bg-white transition-all placeholder:text-gray-400 shadow-inner ${
                          !nomor.keterangan || nomor.keterangan.trim() === ""
                            ? "border-red-200 bg-red-50/10"
                            : "border-gray-200"
                        }`}
                        onChange={(e) => onItemDataChange(nomor.id, "keterangan", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            if (e.shiftKey) {
                              const prevItem = reservedNumbers[index - 1];
                              if (prevItem) {
                                e.preventDefault();
                                inputRefs.current[`${prevItem.id}-ket`]?.focus();
                              } else {
                                e.preventDefault();
                                inputRefs.current[`${reservedNumbers[reservedNumbers.length - 1].id}-ket`]?.focus();
                              }
                            } else {
                              const nextItem = reservedNumbers[index + 1];
                              if (nextItem) {
                                e.preventDefault();
                                inputRefs.current[`${nextItem.id}-ket`]?.focus();
                              } else {
                                e.preventDefault();
                                inputRefs.current[`${reservedNumbers[0].id}-ket`]?.focus();
                              }
                            }
                          }
                        }}
                        value={nomor.keterangan || ""}
                      />
                      {(!nomor.keterangan || nomor.keterangan.trim() === "") && !isExpired && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                          <span className="text-red-500 font-bold text-xs">*</span>
                          <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-tighter">
                            Wajib Diisi
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PC DELETE BUTTON (Hidden on Mobile) */}
                  <div className="hidden md:block shrink-0">
                    <button
                      type="button"
                      tabIndex="-1"
                      disabled={isExpired}
                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300 border border-red-100 shadow-sm"
                      onClick={() => onCancelNomor(nomor)}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
