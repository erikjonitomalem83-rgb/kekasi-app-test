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
  const headerRef = useRef(null);
  const prevCount = useRef(0);

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
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm px-6 py-4 space-y-4">
          {/* LARGE STICKY TIMER */}
          <div className="flex items-center justify-center gap-3 bg-red-50 py-3 px-6 rounded-2xl border border-red-100 shadow-sm animate-pulse">
            <div className="bg-red-500 p-1.5 rounded-full shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-xs font-black text-red-800 uppercase tracking-wider">Sisa Waktu Konfirmasi:</span>
              <div className="text-xl font-black text-red-600">
                <CountdownTimer
                  expiredAt={reservedNumbers[0].expired_at}
                  onExpired={() => onNomorExpired(reservedNumbers.map((n) => n.id))}
                />
              </div>
            </div>
          </div>

          {/* BALANCED ACTION BUTTONS */}
          <div className="flex flex-row justify-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              className="w-full max-w-[240px] font-bold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md flex items-center justify-center gap-2"
              style={{ backgroundColor: "#efbc62", color: "#00325f" }}
              onClick={onKonfirmasiSemua}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Konfirmasi ({reservedNumbers.length})
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              className="w-full max-w-[240px] font-bold py-3 px-4 rounded-xl transition-all bg-red-600 text-white hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md flex items-center justify-center gap-2"
              onClick={onBatalkanSemua}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Batalkan Semua
            </button>
          </div>
        </div>
      )}

      {/* NON-MODAL HEADER */}
      <div
        className={`${
          isModalView
            ? "hidden"
            : "sticky top-0 z-20 bg-white/95 backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6 py-2 -mt-4 md:-mt-6 mb-3 md:rounded-t-xl border-b border-gray-100 flex items-center justify-between shadow-sm"
        }`}
        ref={headerRef}
      >
        <h3 style={{ color: "#00325f" }} className="text-sm md:text-lg font-bold">
          Nomor yang Dipesan:
        </h3>
      </div>

      <div className={`p-4 md:p-6 ${isModalView ? "space-y-4" : "space-y-4"}`}>
        <div className="space-y-4">
          {reservedNumbers.map((nomor, index) => {
            const isExpired = expiredIds.has(nomor.id);
            const sequenceNum = index + 1;

            return (
              <div
                key={nomor.id}
                className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-100 ring-1 ring-gray-50 ${
                  isExpired ? "opacity-30 grayscale" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
                  {/* COMPACT ITEM BADGE */}
                  <div className="flex shrink-0">
                    <div className="relative flex flex-col items-center justify-center w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 shadow-inner group transition-colors hover:bg-blue-100 shrink-0">
                      <span className="text-sm font-black opacity-50 leading-none mb-1">#{sequenceNum}</span>
                      <span className="text-xl font-black">{nomor.nomor_urut}</span>
                      {nomor.is_reused && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm text-yellow-900 border border-yellow-500 animate-bounce">
                          REUSE
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EDITABLE CODES & DESC */}
                  <div className="flex-1 w-full space-y-4">
                    {/* CODES ROW */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-gray-50/80 px-3 py-1.5 rounded-xl border border-gray-200">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Kode:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            maxLength={2}
                            className="w-8 text-center text-xs font-black bg-white border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none uppercase text-blue-700"
                            value={nomor.kode_masalah}
                            onChange={(e) => onItemDataChange(nomor.id, "kode_masalah", e.target.value)}
                            placeholder="UM"
                            disabled={isExpired}
                          />
                          <span className="font-bold text-gray-300">.</span>
                          <input
                            type="text"
                            maxLength={3}
                            className="w-8 text-center text-xs font-black bg-white border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-blue-700"
                            value={nomor.kode_submasalah1}
                            onChange={(e) => onItemDataChange(nomor.id, "kode_submasalah1", e.target.value)}
                            placeholder="01"
                            disabled={isExpired}
                          />
                          <span className="font-bold text-gray-300">.</span>
                          <input
                            type="text"
                            maxLength={3}
                            className="w-8 text-center text-xs font-black bg-white border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-blue-700"
                            value={nomor.kode_submasalah2}
                            onChange={(e) => onItemDataChange(nomor.id, "kode_submasalah2", e.target.value)}
                            placeholder="01"
                            disabled={isExpired}
                          />
                        </div>
                      </div>

                      <div className="h-4 w-px bg-gray-200 hidden md:block"></div>

                      <div className="flex items-center gap-2 bg-blue-50/30 px-3 py-1.5 rounded-xl border border-blue-100/50">
                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-tighter">
                          Preview:
                        </span>
                        <span className="text-xs font-black text-blue-800 tracking-tight">{nomor.nomor_lengkap}</span>
                      </div>
                    </div>

                    {/* KETERANGAN INPUT */}
                    <div className="relative">
                      <input
                        type="text"
                        required
                        disabled={isExpired}
                        placeholder={isExpired ? "Sesi telah berakhir..." : "Apa keterangan untuk nomor surat ini?*"}
                        className="w-full px-5 py-3 bg-gray-50/30 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 focus:bg-white transition-all placeholder:text-gray-300 shadow-inner"
                        onChange={(e) => onItemDataChange(nomor.id, "keterangan", e.target.value)}
                        value={nomor.keterangan || ""}
                      />
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={isExpired}
                      title="Batalkan nomor ini"
                      className="group p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all duration-300 border border-red-100 shadow-sm"
                      onClick={() => onCancelNomor(nomor)}
                    >
                      <svg
                        className="w-5 h-5 group-hover:scale-110 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
