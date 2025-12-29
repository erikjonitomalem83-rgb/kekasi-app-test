import React from "react";

const NomorSuratForm = ({
  formData,
  formErrors,
  isSubmitting,
  reservedNumbers,
  lockStatus,
  profile,
  onInputChange,
  onSubmit,
  onShowNomorLama,
  onReset,
}) => {
  return (
    <div className="lg:col-span-6 bg-white p-4 md:p-6 rounded-none md:rounded-xl shadow-sm md:shadow-md border-y md:border border-gray-200 lg:ml-2">
      <h2 style={{ color: "#00325f" }} className="text-sm md:text-lg font-bold mb-3">
        Pesan Nomor Surat
      </h2>

      {reservedNumbers && reservedNumbers.length > 0 && (
        <div className="mb-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="text-xs font-semibold" style={{ color: "#00325f" }}>
            Perhatian: Anda memiliki {reservedNumbers.length} nomor yang belum dikonfirmasi.
          </p>
          <p className="text-[10px] text-gray-700 mt-1">
            Silahkan konfirmasi atau batalkan terlebih dahulu sebelum mengambil nomor baru.
          </p>
        </div>
      )}

      {lockStatus.isLocked && lockStatus.lockedByUserId !== profile.id && (
        <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-400 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-900 mb-1">Sistem Sedang Digunakan User Lain</p>
              <p className="text-sm text-orange-800 mb-2">
                <span className="font-semibold">{lockStatus.lockedBy}</span> sedang memesan nomor surat.
              </p>
              {lockStatus.lockedAt && (
                <p className="text-xs text-orange-700">
                  Dimulai: {new Date(lockStatus.lockedAt).toLocaleTimeString("id-ID")} (
                  {Math.floor((Date.now() - new Date(lockStatus.lockedAt).getTime()) / 1000)} detik yang lalu)
                </p>
              )}
              <p className="text-xs text-orange-600 mt-2">
                Tombol "Ambil Nomor" akan aktif kembali setelah {lockStatus.lockedBy} selesai memesan nomor (maksimal 5
                menit).
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {[
            { key: "kodeKanwil", label: "Kode Kanwil", placeholder: "WIM.2" },
            { key: "kodeUPT", label: "Kode UPT", placeholder: "IMI.4" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[11px] md:text-sm font-semibold text-gray-700 mb-1">
                {label} <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg box-border uppercase text-xs md:text-base
                focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150
                ${formErrors[key] ? "border-red-500" : ""}`}
                value={formData[key]}
                onChange={(e) => onInputChange(key, e.target.value.toUpperCase())}
                placeholder={placeholder}
                disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
              />
              {formErrors[key] && <p className="text-xs text-red-600 mt-1">{formErrors[key]}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {[
            { key: "kodeMasalah", label: "Masalah", placeholder: "UM" },
            { key: "subMasalah1", label: "Sub 1", placeholder: "01" },
            {
              key: "subMasalah2",
              label: "Sub 2",
              placeholder: "01",
              optional: true,
            },
          ].map(({ key, label, placeholder, optional }) => (
            <div key={key}>
              <label className="block text-[10px] md:text-sm font-semibold text-gray-700 mb-1">
                {label} {!optional && <span className="text-red-500">*</span>}
              </label>
              <input
                className={`w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg box-border uppercase text-xs md:text-base
                  focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150
                  ${formErrors[key] ? "border-red-500" : ""}`}
                maxLength="2"
                value={formData[key]}
                onChange={(e) => {
                  let value = e.target.value;
                  if (key === "kodeMasalah") {
                    value = value.replace(/[^A-Za-z]/g, "").toUpperCase();
                  } else {
                    value = value.replace(/\D/g, "");
                  }
                  onInputChange(key, value);
                }}
                placeholder={placeholder}
                disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
              />
              {formErrors[key] && <p className="text-[10px] text-red-600 mt-1 leading-tight">{formErrors[key]}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-[11px] md:text-sm font-semibold text-gray-700 mb-1 text-left">
              Jumlah Nomor <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg box-border text-xs md:text-base
              focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150
              ${formErrors.jumlahNomor ? "border-red-500" : ""}`}
              value={formData.jumlahNomor}
              min="1"
              max="50"
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || value === null) {
                  onInputChange("jumlahNomor", "");
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue)) {
                    onInputChange("jumlahNomor", numValue);
                  }
                }
              }}
              disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
            />
            {formErrors.jumlahNomor && <p className="text-xs text-red-600 mt-1">{formErrors.jumlahNomor}</p>}
          </div>
        </div>

        <div className="flex flex-col items-start">
          <label className="text-[11px] md:text-sm font-semibold text-gray-700 mb-1 w-full text-left">
            Keterangan (Opsional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg box-border resize-none text-xs md:text-base
            focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150"
            rows="2"
            placeholder="Contoh: Surat perjalanan dinas 3 pegawai"
            value={formData.keterangan}
            onChange={(e) => onInputChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (reservedNumbers && reservedNumbers.length > 0) ||
              (lockStatus.isLocked && lockStatus.lockedByUserId !== profile.id)
            }
            className="w-full sm:flex-1 font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style={{
              backgroundColor: "#efbc62",
              color: "#00325f",
            }}
          >
            {isSubmitting
              ? "Memproses..."
              : reservedNumbers && reservedNumbers.length > 0
              ? "Tuntaskan Pesanan Nomor"
              : lockStatus.isLocked && lockStatus.lockedByUserId !== profile.id
              ? "Sistem Sedang Digunakan..."
              : "Pesan Nomor Surat"}
          </button>
          <button
            type="button"
            onClick={onShowNomorLama}
            disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
            className="w-full sm:flex-1 bg-purple-600 text-white font-semibold py-2.5 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm"
          >
            Nomor Lama
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={isSubmitting}
            className="w-full sm:flex-1 bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 text-sm"
          >
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default NomorSuratForm;
