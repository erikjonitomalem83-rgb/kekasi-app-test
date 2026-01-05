import React, { useState, useRef, useEffect } from "react";

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
  dateWarning,
}) => {
  const [showMasalahDropdown, setShowMasalahDropdown] = useState(false);
  const masalahRef = useRef(null);
  const problems = ["UM", "GR", "SA", "TI", "KU"];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (masalahRef.current && !masalahRef.current.contains(event.target)) {
        setShowMasalahDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded md:rounded-xl shadow-sm md:shadow-md border-y md:border border-gray-200 max-w-sm md:max-w-lg mx-auto overflow-hidden">
      <div className="bg-gray-200 border-b border-[#efbc62]/20 py-3 md:py-4 px-4 md:px-6 mb-4 md:mb-6">
        <h2 style={{ color: "#00325f" }} className="text-sm md:text-lg font-bold text-center">
          Formulir Pemesanan Nomor Surat
        </h2>
      </div>

      <div className="px-4 md:px-6 pb-4 md:pb-6">
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

        {dateWarning && (
          <div className="mb-3 p-3 bg-orange-50 border-2 border-orange-400 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-orange-900">
                  Hari ini adalah {dateWarning.dayType || "Hari Libur"}
                </p>
                <p className="text-xs text-orange-800 mt-1">
                  Nomor surat akan diarsipkan sebagai tanggal <strong>{dateWarning.effectiveDateFormatted}</strong>
                </p>
              </div>
            </div>
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
                  Tombol "Ambil Nomor" akan aktif kembali setelah {lockStatus.lockedBy} selesai memesan nomor (maksimal
                  5 menit).
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
            <div className="relative" ref={masalahRef}>
              <label className="block text-[10px] md:text-sm font-semibold text-gray-700 mb-1">
                Masalah <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={`w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg box-border uppercase text-xs md:text-base pr-8
                  focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150
                  ${formErrors.kodeMasalah ? "border-red-500" : ""}`}
                  maxLength="2"
                  value={formData.kodeMasalah}
                  autoComplete="off"
                  onFocus={() => setShowMasalahDropdown(true)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase();
                    onInputChange("kodeMasalah", value);
                    setShowMasalahDropdown(true);
                  }}
                  placeholder="UM"
                  disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowMasalahDropdown(!showMasalahDropdown)}
                  disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showMasalahDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {showMasalahDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {problems.map((prob) => (
                    <button
                      key={prob}
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors uppercase font-medium"
                      onClick={() => {
                        onInputChange("kodeMasalah", prob);
                        setShowMasalahDropdown(false);
                      }}
                    >
                      {prob}
                    </button>
                  ))}
                </div>
              )}
              {formErrors.kodeMasalah && (
                <p className="text-[10px] text-red-600 mt-1 leading-tight">{formErrors.kodeMasalah}</p>
              )}
            </div>

            {[
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
                    let value = e.target.value.replace(/\D/g, "");
                    onInputChange(key, value);
                  }}
                  onFocus={() => onInputChange(key, "")}
                  onBlur={(e) => {
                    let value = e.target.value;
                    if (!value) {
                      onInputChange(key, "01");
                    } else if (value.length === 1) {
                      onInputChange(key, `0${value}`);
                    }
                  }}
                  placeholder={placeholder}
                  disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
                />
                {formErrors[key] && <p className="text-[10px] text-red-600 mt-1 leading-tight">{formErrors[key]}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div className="col-span-2">
              <label className="block text-[11px] md:text-sm font-semibold text-gray-700 mb-2 text-center">
                Jumlah Nomor <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#2d333d] text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  onClick={() => {
                    const currentVal = parseInt(formData.jumlahNomor) || 1;
                    if (currentVal > 1) onInputChange("jumlahNomor", currentVal - 1);
                  }}
                  disabled={
                    isSubmitting ||
                    (reservedNumbers && reservedNumbers.length > 0) ||
                    (parseInt(formData.jumlahNomor) || 1) <= 1
                  }
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                  </svg>
                </button>

                <input
                  type="number"
                  className="w-12 h-10 md:w-14 md:h-12 text-center text-lg md:text-xl font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={formData.jumlahNomor}
                  onFocus={() => onInputChange("jumlahNomor", "")}
                  onBlur={() => {
                    if (!formData.jumlahNomor) onInputChange("jumlahNomor", 1);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      onInputChange("jumlahNomor", "");
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) {
                        onInputChange("jumlahNomor", Math.max(1, Math.min(50, num)));
                      }
                    }
                  }}
                  disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
                />

                <button
                  type="button"
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#2d333d] text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  onClick={() => {
                    const currentVal = parseInt(formData.jumlahNomor) || 1;
                    if (currentVal < 50) onInputChange("jumlahNomor", currentVal + 1);
                  }}
                  disabled={
                    isSubmitting ||
                    (reservedNumbers && reservedNumbers.length > 0) ||
                    (parseInt(formData.jumlahNomor) || 1) >= 50
                  }
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
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
              className="w-full sm:flex-[2] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm tracking-tight bg-[#efbc62] text-[#00325f] hover:brightness-105"
            >
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="truncate">
                {isSubmitting
                  ? "Memproses..."
                  : reservedNumbers && reservedNumbers.length > 0
                  ? "Tuntaskan Pesanan"
                  : lockStatus.isLocked && lockStatus.lockedByUserId !== profile.id
                  ? "Sedang Digunakan"
                  : "Pesan Nomor Surat"}
              </span>
            </button>
            <button
              type="button"
              onClick={onShowNomorLama}
              disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
              className="w-full sm:flex-1 bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition shadow-md active:scale-95 disabled:opacity-50 text-xs md:text-sm whitespace-nowrap"
            >
              Nomor Lama
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={isSubmitting || (reservedNumbers && reservedNumbers.length > 0)}
              className="w-full sm:flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl hover:bg-gray-300 transition shadow-md active:scale-95 disabled:opacity-50 text-xs md:text-sm whitespace-nowrap"
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NomorSuratForm;
