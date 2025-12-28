import React from "react";

export default function AdminEmergencyPool({
  isAdmin,
  edgeFunctionLogs,
  adminPool,
  adminPoolSchedule,
  isSubmitting,
  onAmbilEmergency,
  onGeneratePoolManual,
}) {
  if (!isAdmin) return null;

  return (
    <>
      {/* Edge Function Status */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
        <h3 className="text-xs md:text-sm font-bold mb-2 text-blue-900">Status Edge Function (Auto Reserve Pool)</h3>
        {edgeFunctionLogs[0] ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Last Run</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(edgeFunctionLogs[0].created_at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <p className={`text-sm font-bold ${edgeFunctionLogs[0].success ? "text-green-600" : "text-red-600"}`}>
                  {edgeFunctionLogs[0].success ? "Success" : "Failed"}
                </p>
              </div>

              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Reserved Count</p>
                <p className="text-lg font-bold text-blue-600">{edgeFunctionLogs[0].reserved_count}</p>
              </div>

              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Data Source</p>
                <p className="text-sm font-semibold text-gray-800">
                  {edgeFunctionLogs[0].data_source === "confirmed" ? "Confirmed" : "Fallback"}
                </p>
              </div>
            </div>

            {!edgeFunctionLogs[0].success && edgeFunctionLogs[0].error_message && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs font-semibold text-red-900 mb-1">Error Message:</p>
                <p className="text-xs text-red-700">{edgeFunctionLogs[0].error_message}</p>
              </div>
            )}

            <details className="mt-2">
              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                View detailed logs (last 5 runs)
              </summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {edgeFunctionLogs.slice(0, 5).map((log, idx) => (
                  <div key={log.id} className="text-xs p-2 bg-white rounded border">
                    <span className="font-semibold">{idx + 1}.</span> {new Date(log.created_at).toLocaleString("id-ID")}{" "}
                    - Reserved: {log.reserved_count} -{" "}
                    <span className={log.success ? "text-green-600" : "text-red-600"}>
                      {log.success ? "Success" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        ) : (
          <p className="text-xs text-gray-600">Belum ada log edge function</p>
        )}
      </div>

      {/* ADMIN EMERGENCY POOL INFO */}
      <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-3 md:p-6">
        <h3 className="text-sm md:text-lg font-bold mb-2" style={{ color: "#00325f" }}>
          Nomor Emergency Bulan Ini ({new Date().toLocaleString("id-ID", { month: "long", year: "numeric" })})
        </h3>

        <p className="text-[11px] md:text-sm text-gray-700 mb-2">Nomor yang disisihkan untuk keperluan urgent admin:</p>

        {adminPool.length > 0 ? (
          <div className="mb-4">
            <div className="flex gap-2 flex-wrap mb-2">
              {adminPool.map((nomor) => (
                <span
                  key={nomor.id}
                  className="inline-block px-4 py-2 bg-purple-600 text-white font-bold rounded-lg text-lg"
                >
                  {nomor.nomor_urut}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Sisa {adminPool.length} nomor dari 3 nomor yang disisihkan bulan ini
            </p>
          </div>
        ) : (
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg mb-3">
            <p className="text-xs text-gray-600">Belum ada nomor emergency bulan ini.</p>
            <p className="text-[10px] text-gray-500 mt-1">
              Klik tombol "Generate Pool Manual" untuk membuat nomor emergency.
            </p>
          </div>
        )}

        {/* Schedule Info */}
        {adminPoolSchedule && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h4 className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Jadwal Otomatis Bulan Ini
            </h4>
            <div className="flex gap-2">
              {adminPoolSchedule.scheduled_dates.map((date) => (
                <span
                  key={date}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    new Date().getDate() === date
                      ? "bg-indigo-600 text-white animate-pulse"
                      : "bg-white text-indigo-700 border border-indigo-200"
                  }`}
                >
                  Tgl {date}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-indigo-600 mt-2 italic">
              *Sistem akan mengisi tabungan secara otomatis pada tanggal-tanggal di atas.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
          <button
            onClick={onAmbilEmergency}
            disabled={isSubmitting || adminPool.length === 0}
            className="w-full sm:w-auto bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base"
          >
            Ambil Nomor Emergency
          </button>

          <button
            onClick={onGeneratePoolManual}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base"
          >
            Generate Pool Manual
          </button>
        </div>
      </div>
    </>
  );
}
