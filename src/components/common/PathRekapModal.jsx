import { useState, useEffect, useCallback } from "react";
import { useNotification } from "./Notification";
import {
  getRekapLogs,
  getRekapFiles,
  downloadRekapFile,
  triggerManualRekap,
  deleteRekapFile,
} from "../../services/rekapService";

export default function PathRekapModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("files");
  const notification = useNotification();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = String(now.getMonth() + 1).padStart(2, "0");

      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevY = prevDate.getFullYear();
      const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");

      const results = await Promise.allSettled([
        getRekapLogs(50),
        getRekapFiles("harian", curY, curM),
        getRekapFiles("harian", prevY, prevM),
        getRekapFiles("tahunan", curY),
        getRekapFiles("tahunan", prevY),
      ]);

      const [logsRes, harianCur, harianPrev, tahunanCur, tahunanPrev] = results;

      if (logsRes.status === "fulfilled" && logsRes.value.success) {
        setLogs(logsRes.value.data || []);
      } else {
        console.error("[PathRekapModal] Logs fetch failed:", logsRes);
      }

      let allFiles = [];
      const addFiles = (res) => {
        if (res.status === "fulfilled" && res.value.success) {
          allFiles = [...allFiles, ...(res.value.data || [])];
        }
      };

      addFiles(harianCur);
      addFiles(harianPrev);
      addFiles(tahunanCur);
      addFiles(tahunanPrev);

      // De-duplicate by unique path
      const uniqueFilesMap = new Map();
      allFiles.forEach((file) => {
        if (!uniqueFilesMap.has(file.path)) {
          uniqueFilesMap.set(file.path, file);
        }
      });
      const uniqueFiles = Array.from(uniqueFilesMap.values());

      // Sort by created_at desc
      uniqueFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFiles(uniqueFiles);
    } catch (error) {
      console.error("[PathRekapModal] Fatal error loading rekap data:", error);
      notification.showErrorToast("Gagal memuat data", error.message);
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleDownload = async (filePath, filename) => {
    try {
      notification.showLoadingOverlay("Mengunduh file...");
      const result = await downloadRekapFile(filePath);
      notification.hideLoadingOverlay();

      if (result.success) {
        notification.showSuccessToast("Download Berhasil", `File ${filename} berhasil diunduh.`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      notification.hideLoadingOverlay();
      notification.showErrorToast("Download Gagal", error.message);
    }
  };

  const handleTriggerRekap = async () => {
    setGenerating(true);
    notification.showLoadingOverlay("Generating rekap...\nMohon tunggu.");

    try {
      const result = await triggerManualRekap();
      notification.hideLoadingOverlay();

      if (result.success && result.data?.success) {
        const dailyCount = result.data.daily?.count || 0;
        const yearlyCount = result.data.yearly?.count || 0;

        notification.showSuccessToast("Rekap Berhasil", `Harian: ${dailyCount} nomor. Tahunan: ${yearlyCount} nomor.`);
        loadData(); // Refresh
      } else {
        throw new Error(result.data?.message || result.error || "Gagal generate rekap");
      }
    } catch (error) {
      notification.hideLoadingOverlay();
      notification.showErrorToast("Rekap Gagal", error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (filePath, filename) => {
    const confirmed = await notification.confirmAction({
      type: "danger",
      title: "Hapus File?",
      message: `Yakin ingin menghapus file ${filename}?\nTindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    try {
      notification.showLoadingOverlay("Menghapus file...");
      const result = await deleteRekapFile(filePath);
      notification.hideLoadingOverlay();

      if (result.success) {
        notification.showSuccessToast("Berhasil", `File ${filename} telah dihapus.`);
        // Small delay to ensure storage list is updated
        setTimeout(() => {
          loadData();
        }, 500);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      notification.hideLoadingOverlay();
      notification.showErrorToast("Gagal Menghapus", error.message);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up border border-white/20 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-br from-[#00325f] to-[#004b8d] relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md border border-white/20">
                  <svg className="w-5 h-5 text-[#efbc62]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                REKAP OTOMATIS
              </h2>
              <p className="text-xs text-white/60 mt-1 ml-11">Dijalankan setiap hari jam 23:59 WIB</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "files"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-500 hover:text-blue-600"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              File Rekap
            </span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "logs"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-500 hover:text-blue-600"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Log Eksekusi
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === "files" ? (
            <div className="space-y-2">
              {files.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium">Belum ada file rekap</p>
                  <p className="text-xs text-gray-400 mt-1">File akan muncul setelah rekap otomatis berjalan</p>
                </div>
              ) : (
                files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">{file.name}</p>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                              file.path.startsWith("harian")
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {file.path.startsWith("harian") ? "Harian" : "Tahunan"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : ""}
                          {file.created_at && ` • ${formatDate(file.created_at)} ${formatTime(file.created_at)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(file.path, file.name)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Download"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(file.path, file.name)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-sm font-medium">Belum ada log</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border ${
                      log.status === "success"
                        ? "bg-green-50/50 border-green-100"
                        : log.status === "skipped"
                          ? "bg-yellow-50/50 border-yellow-100"
                          : "bg-red-50/50 border-red-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === "success" ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        ) : log.status === "skipped" ? (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                        <span className="text-xs font-bold text-gray-700">{formatDate(log.tanggal)}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            log.status === "success"
                              ? "bg-green-100 text-green-700"
                              : log.status === "skipped"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">{formatTime(log.created_at)}</span>
                    </div>
                    <div className="mt-1.5 ml-4">
                      {log.filename && <p className="text-xs text-gray-600 font-medium">{log.filename}</p>}
                      {log.total_records > 0 && (
                        <p className="text-[10px] text-gray-500">{log.total_records} nomor surat</p>
                      )}
                      {log.error_message && <p className="text-xs text-red-600 mt-1">{log.error_message}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-xs font-bold">Refresh</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={generating}
              className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest px-4 py-2"
            >
              Tutup
            </button>

            <button
              onClick={handleTriggerRekap}
              disabled={generating || loading}
              className="group relative px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-green-900/10 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <div className="flex items-center gap-2 relative z-10">
                {generating ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                {generating ? "GENERATING..." : "GENERATE SEKARANG"}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
