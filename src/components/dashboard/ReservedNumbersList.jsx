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
  onKeteranganChange,
}) {
  const headerRef = useRef(null);
  const prevCount = useRef(0);

  useEffect(() => {
    const currentCount = reservedNumbers?.length || 0;
    // Scroll hanya jika bertambah (bukan saat awal load yang sudah ada, atau saat berkurang/batal)
    // Dan hanya di mobile/tablet (lg:col-span-6 adalah 1024px di Tailwind)
    if (currentCount > prevCount.current && window.innerWidth < 1024) {
      // Kecil delay untuk memastikan DOM sudah dirender jika ada transisi
      const timer = setTimeout(() => {
        headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
    prevCount.current = currentCount;
  }, [reservedNumbers?.length]);

  if (!reservedNumbers) {
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
    <div className="lg:col-span-6 bg-white p-4 md:p-6 rounded-none md:rounded-xl shadow-sm md:shadow-md border-y md:border border-gray-200">
      <div
        className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6 py-2 -mt-4 md:-mt-6 mb-3 md:rounded-t-xl border-b border-gray-100 flex items-center justify-between shadow-sm"
        ref={headerRef}
      >
        <h3 style={{ color: "#00325f" }} className="text-sm md:text-lg font-bold">
          Nomor yang Dipesan:
        </h3>
        {reservedNumbers.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider hidden md:block">
              Batas Waktu:
            </span>
            <CountdownTimer
              expiredAt={reservedNumbers[0].expired_at}
              onExpired={() => onNomorExpired(reservedNumbers.map((n) => n.id))}
            />
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-row justify-center gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          className="flex-1 font-semibold py-2 px-2 md:px-5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-base whitespace-nowrap"
          style={{
            backgroundColor: "#efbc62",
            color: "#00325f",
          }}
          onClick={onKonfirmasiSemua}
        >
          Konfirmasi Semua
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          className="flex-1 font-semibold py-2 px-2 md:px-5 rounded-lg transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-base whitespace-nowrap"
          onClick={onBatalkanSemua}
        >
          Batalkan Semua
        </button>
      </div>

      <div className="space-y-3">
        {reservedNumbers.map((nomor, index) => {
          const angkaAkhir = nomor.nomor_urut;
          const isExpired = expiredIds.has(nomor.id);
          const sequenceNum = index + 1;

          return (
            <div
              key={nomor.id}
              className={`border-b py-3 transition-all duration-300 ${isExpired ? "opacity-50 bg-red-50" : ""}`}
              style={{ borderColor: "#efbc6240" }}
            >
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 w-24 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-200 shadow-sm leading-none">
                    <span className="text-sm font-black text-blue-700">#{sequenceNum}</span>
                    <div className="w-px h-4 bg-blue-200 mx-1"></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800 leading-none">{nomor.nomor_urut}</span>
                      {nomor.is_reused && (
                        <span className="text-[10px] text-blue-600 font-medium mt-0.5 flex items-center gap-0.5 animate-pulse">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Reuse Nomor Batal
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isExpired}
                    className="px-4 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                    onClick={() => onCancelNomor(nomor)}
                  >
                    Batal
                  </button>
                </div>
                <div className="relative pt-1">
                  <input
                    type="text"
                    required
                    disabled={isExpired}
                    placeholder={isExpired ? "Expired..." : "Isi keterangan nomor surat"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#efbc62] focus:ring-1 focus:ring-[#efbc62] disabled:opacity-50"
                    onChange={(e) => onKeteranganChange(nomor.id, e.target.value)}
                    value={nomor.keterangan || ""}
                  />
                </div>
              </div>

              {/* Desktop Row View */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-1 w-24 bg-blue-50 px-2 py-2 rounded-lg border border-blue-200 shadow-sm leading-none">
                  <span className="text-sm font-black text-blue-700">#{sequenceNum}</span>
                  <div className="w-px h-4 bg-blue-200 mx-1"></div>
                  <span className="text-sm font-black text-gray-900 ml-auto">{angkaAkhir}</span>
                </div>

                <div className="flex-1">
                  <div className="relative h-10">
                    <label className="absolute -top-4 left-0 text-xs text-gray-600" style={{ lineHeight: "1" }}>
                      Keterangan wajib diisi<span className="text-red-500">*</span>
                    </label>

                    <input
                      type="text"
                      required
                      disabled={isExpired}
                      placeholder={isExpired ? "Nomor expired, akan dihapus..." : "Isi keterangan nomor ini untuk apa"}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm 
                      focus:outline-none focus:border-[2px] focus:border-[#efbc62] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      onChange={(e) => onKeteranganChange(nomor.id, e.target.value)}
                      value={nomor.keterangan || ""}
                      aria-label={`keterangan-${angkaAkhir}`}
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={isExpired}
                    className="h-10 px-4 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => onCancelNomor(nomor)}
                  >
                    Batalkan
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {reservedNumbers.length >= 10 && (
        <div className="mt-6 text-center flex justify-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            className="font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#efbc62",
              color: "#00325f",
            }}
            onClick={onKonfirmasiSemua}
          >
            Konfirmasi Semua
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            className="font-semibold py-2 px-6 rounded-lg transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onBatalkanSemua}
          >
            Batalkan Semua
          </button>
        </div>
      )}
    </div>
  );
}
