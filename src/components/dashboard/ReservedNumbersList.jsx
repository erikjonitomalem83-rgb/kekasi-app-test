import React from "react";
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
    <div className="lg:col-span-6 bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h3 style={{ color: "#00325f" }} className="text-lg font-bold mb-3">
        Nomor yang Dipesan:
      </h3>

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
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm leading-none h-7">
                      <span className="text-xs font-black text-blue-700">#{sequenceNum}</span>
                      <div className="w-px h-3 bg-blue-200"></div>
                      <span className="text-xs font-black text-gray-900">ID: {angkaAkhir}</span>
                    </div>
                    <div>
                      <CountdownTimer expiredAt={nomor.expired_at} onExpired={() => onNomorExpired(nomor.id)} />
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
                <div className="relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg border-2 border-blue-200 shadow-sm whitespace-nowrap z-10 h-6">
                    <span className="text-[11px] font-black text-blue-700 leading-none">#{sequenceNum}</span>
                    <div className="w-px h-2.5 bg-blue-300"></div>
                    <span className="text-[11px] font-black text-gray-900 leading-none">ID: {angkaAkhir}</span>
                  </div>
                  <CountdownTimer expiredAt={nomor.expired_at} onExpired={() => onNomorExpired(nomor.id)} />
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
