import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import { useNotification } from "./Notification";

export default function PathRekapModal({ isOpen, onClose }) {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  const loadCurrentPath = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("settings").select("value").eq("key", "rekap_path").single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) setPath(data.value);
    } catch (error) {
      console.error("Error loading path:", error);
      notification.showErrorToast("Gagal memuat path", error.message);
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    if (isOpen) {
      loadCurrentPath();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Helper untuk membersihkan path dari double backslash dan merapikan format Windows
  const normalizePath = (p) => {
    if (!p) return "";
    // Ganti forward slash ke backslash
    let normalized = p.replace(/\//g, "\\");
    // Hilangkan double backslash kecuali di awal (untuk Network Drive //server/share)
    if (normalized.startsWith("\\\\")) {
      normalized = "\\\\" + normalized.substring(2).replace(/\\+/g, "\\");
    } else {
      normalized = normalized.replace(/\\+/g, "\\");
    }
    return normalized;
  };

  const handleSave = async () => {
    const finalPath = normalizePath(path.trim());
    if (!finalPath) {
      notification.showWarningToast("Input Kosong", "Silakan masukkan path folder.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("settings").upsert(
        {
          key: "rekap_path",
          value: finalPath,
          description: "Path folder untuk penyimpanan rekap otomatis",
        },
        { onConflict: "key" }
      );

      if (error) throw error;

      notification.showSuccessToast("Berhasil", "Path rekap berhasil diperbarui.");
      onClose();
    } catch (error) {
      console.error("Error saving path:", error);
      notification.showErrorToast("Gagal menyimpan path", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border border-white/20">
        {/* Header - More Compact */}
        <div className="px-6 py-4 bg-gradient-to-br from-[#00325f] to-[#004b8d] relative overflow-hidden">
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
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                PENGATURAN PATH REKAP
              </h2>
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

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
            <div className="p-1.5 bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-500/20 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-xs text-blue-800 font-bold leading-relaxed">
              Lokasi ini digunakan oleh sistem rekap otomatis setiap malam.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black text-[#00325f] uppercase tracking-wider ml-1">
                Lokasi Penyimpanan (Local Path)
              </label>
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="D:\KEKASI\REKAP"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 outline-none transition-all font-mono text-sm font-bold text-gray-700 shadow-inner"
                disabled={loading}
              />

              <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                {path && (
                  <button
                    onClick={() => setPath("")}
                    className="px-3 text-gray-300 hover:text-red-500 transition-colors bg-white/50 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100"
                    title="Hapus / Bersihkan"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Tidy Hint Box - Compact Mode */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 overflow-hidden relative">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-amber-900 uppercase tracking-widest mb-3">
                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px]">SOLUSI AKURAT</span>
                Cara Copy-Paste:
              </h4>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded-lg border border-amber-200/50 shadow-sm flex flex-col items-center text-center">
                  <div className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-[10px] mb-1">
                    1
                  </div>
                  <p className="text-[10px] text-amber-800 font-bold leading-tight">
                    Buka di <br />
                    Explorer
                  </p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-200/50 shadow-sm flex flex-col items-center text-center">
                  <div className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-[10px] mb-1">
                    2
                  </div>
                  <p className="text-[10px] text-amber-800 font-bold leading-tight">
                    Copy <br />
                    <span className="text-blue-600 underline">Alamat</span>
                  </p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-200/50 shadow-sm flex flex-col items-center text-center">
                  <div className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-[10px] mb-1">
                    3
                  </div>
                  <p className="text-[10px] text-amber-800 font-bold leading-tight">
                    X lalu <br />
                    <span className="text-blue-600 underline">Paste</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Compact Action Bar */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
          >
            Batal
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="group relative px-6 py-2.5 bg-[#00325f] hover:bg-[#004b8d] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
          >
            <div className="flex items-center gap-2 relative z-10">
              {!loading && (
                <svg className="w-3.5 h-3.5 text-[#efbc62]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {loading ? "Menyimpan..." : "SIMPAN"}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
