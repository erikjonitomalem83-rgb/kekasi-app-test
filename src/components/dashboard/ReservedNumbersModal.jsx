import React from "react";
import ReservedNumbersList from "./ReservedNumbersList";

export default function ReservedNumbersModal({
  isOpen,
  reservedNumbers,
  expiredIds,
  isSubmitting,
  onKonfirmasiSemua,
  onBatalkanSemua,
  onNomorExpired,
  onCancelNomor,
  onItemDataChange,
}) {
  if (!isOpen || !reservedNumbers || reservedNumbers.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold" style={{ color: "#00325f" }}>
            Konfirmasi Pesanan Nomor
          </h2>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {reservedNumbers.length} Nomor Dipesan
            </span>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <div className="p-0">
            <ReservedNumbersList
              reservedNumbers={reservedNumbers}
              expiredIds={expiredIds}
              isSubmitting={isSubmitting}
              onKonfirmasiSemua={onKonfirmasiSemua}
              onBatalkanSemua={onBatalkanSemua}
              onNomorExpired={onNomorExpired}
              onCancelNomor={onCancelNomor}
              onItemDataChange={onItemDataChange}
              isModalView={true}
            />
          </div>
        </div>

        {/* Modal Footer (Optional since List has its own buttons, but we can add a simple close/cancel if needed) */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <p className="text-xs text-gray-400 italic font-medium">
            Selesaikan pengisian keterangan untuk melanjutkan konfirmasi
          </p>
        </div>
      </div>
    </div>
  );
}
