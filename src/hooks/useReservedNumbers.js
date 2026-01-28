import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import {
  reserveNomorBerurutan,
  reserveNomorAcak,
  confirmNomorSurat,
  cancelNomorSurat,
  syncNomorSequence,
  cleanExpiredNomor as serviceCleanExpiredNomor,
} from "../services/nomorSuratService";
import { getLocalMonthString, getLocalParts } from "../utils/dateHelpers";
import { unlockAudio } from "../utils/soundAlert";
import { useNotification } from "../components/common/Notification";

export function useReservedNumbers(profile, isAdmin) {
  const notification = useNotification();
  const [reservedNumbers, setReservedNumbers] = useState(null);
  const [expiredIds, setExpiredIds] = useState(new Set());
  const [adminPool, setAdminPool] = useState([]);
  const [edgeFunctionLogs, setEdgeFunctionLogs] = useState([]);
  const [adminPoolSchedule, setAdminPoolSchedule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedNumbersData, setConfirmedNumbersData] = useState([]);

  // Load admin pool schedule
  const loadAdminPoolSchedule = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const currentMonth = getLocalMonthString();
      const { data, error } = await supabase
        .from("admin_pool_schedule")
        .select("*")
        .eq("year_month", currentMonth)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setAdminPoolSchedule(data || null);
    } catch (error) {
      console.error("[useReservedNumbers] Error load schedule:", error);
    }
  }, [isAdmin]);

  // Check reserved numbers saat mount
  useEffect(() => {
    const checkReservedNumbers = async () => {
      if (!profile?.id) return;
      try {
        const { data } = await supabase
          .from("nomor_surat")
          .select("*")
          .eq("user_id", profile.id)
          .eq("status", "reserved")
          .gte("expired_at", new Date().toISOString());

        if (data && data.length > 0) setReservedNumbers(data);
        else setReservedNumbers(null);
      } catch (error) {
        console.error("[useReservedNumbers] Error check reserved:", error);
      }
    };
    checkReservedNumbers();
  }, [profile?.id]);

  // Sync sequence saat mount
  useEffect(() => {
    const initializeSequence = async () => {
      try {
        await syncNomorSequence();
      } catch (error) {
        console.error("[useReservedNumbers] Error initializing sequence:", error);
      }
    };
    initializeSequence();
  }, []);

  // Load admin pool
  const loadAdminPool = useCallback(
    async (kodeKanwil, kodeUPT, kodeMasalah, subMasalah1, subMasalah2) => {
      if (!isAdmin) return;
      try {
        const currentMonth = getLocalMonthString();
        const startOfMonth = `${currentMonth}-01`;

        // Hitung akhir bulan dengan local time
        const { yyyy, mm } = getLocalParts();
        const nextMonthDate = new Date(parseInt(yyyy), parseInt(mm), 1);
        const nextYear = nextMonthDate.getFullYear();
        const nextMonthNum = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
        const endOfMonth = `${nextYear}-${nextMonthNum}-01`;

        const { data, error } = await supabase
          .from("nomor_surat")
          .select("*")
          .eq("kode_kanwil", kodeKanwil)
          .eq("kode_upt", kodeUPT)
          .eq("kode_masalah", kodeMasalah)
          .eq("kode_submasalah1", subMasalah1)
          .eq("kode_submasalah2", subMasalah2)
          .gte("tanggal", startOfMonth)
          .lt("tanggal", endOfMonth)
          .eq("keterangan", "ADMIN_EMERGENCY_POOL")
          .eq("status", "reserved")
          .is("user_id", null)
          .order("nomor_urut", { ascending: true });

        if (error) throw error;
        setAdminPool(data || []);
      } catch (error) {
        console.error("[useReservedNumbers] Error load admin pool:", error);
      }
    },
    [isAdmin]
  );

  // Load edge function logs
  const loadEdgeFunctionLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from("edge_function_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setEdgeFunctionLogs(data || []);
    } catch (error) {
      console.error("[useReservedNumbers] Error load edge logs:", error);
    }
  }, [isAdmin]);

  const reserveNumbers = async (formData, acquireLockFn, releaseLockFn) => {
    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Konfirmasi Pemesanan",
      message: `Anda akan memesan \n ${formData.jumlahNomor} nomor surat.`,
      confirmText: "Ya, Lanjutkan",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    unlockAudio();
    setIsSubmitting(true);
    let lockAcquired = false;

    try {
      const lockResult = await acquireLockFn();
      if (!lockResult.success) {
        if (lockResult.locked) {
          notification.showWarningToast(
            "Sistem Sedang Digunakan",
            `${lockResult.lockedBy} sedang memesan nomor.\n\nSilakan tunggu hingga proses selesai.`
          );
        } else {
          notification.showErrorToast("Gagal Acquire Lock", lockResult.error || "Unknown error");
        }
        return;
      }

      lockAcquired = true;
      notification.showLoadingOverlay(`Memproses ${formData.jumlahNomor} nomor surat...\nMohon tunggu.`);

      const reserveFunction = formData.mode === "berurutan" ? reserveNomorBerurutan : reserveNomorAcak;
      let result = await reserveFunction(profile.id, formData, formData.jumlahNomor);

      // --- HANDLE PARTIAL SUCCESS ---
      if (!result.success && result.error === "PARTIAL_SUCCESS") {
        notification.hideLoadingOverlay();

        const choice = await notification.confirmChoice({
          type: "warning",
          title: "Jumlah Nomor Belum Sesuai",
          message: `Sistem hanya berhasil memesan ${result.availableCount} dari ${result.requestedCount} nomor yang Anda minta.\n\nApa yang ingin Anda lakukan?`,
          confirmText: "Coba Lagi",
          alternateText: "Lanjutkan",
          cancelText: "Batalkan",
        });

        if (choice === "alternate") {
          // Lanjutkan: Anggap sebagai sukses dengan data parsial
          result = { success: true, data: result.data };
          notification.showLoadingOverlay("Menyesuaikan pesanan...");
        } else if (choice === "confirmed") {
          // Coba Lagi: Batalkan yang parsial dulu, lalu panggil fungsi ini lagi secara rekursif
          notification.showLoadingOverlay("Membatalkan pesanan parsial...");
          const rollbackIds = result.data.map((n) => n.id);
          await supabase
            .from("nomor_surat")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              user_id: null,
            })
            .in("id", rollbackIds);

          notification.hideLoadingOverlay();
          setIsSubmitting(false); // Reset submitting state for the recursive call
          if (lockAcquired) await releaseLockFn();

          return reserveNumbers(formData, acquireLockFn, releaseLockFn); // RETRY
        } else {
          // Batal: Batalkan yang parsial
          notification.showLoadingOverlay("Membatalkan pesanan...");
          const rollbackIds = result.data.map((n) => n.id);
          await supabase
            .from("nomor_surat")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              user_id: null,
            })
            .in("id", rollbackIds);

          notification.hideLoadingOverlay();
          if (lockAcquired) await releaseLockFn();
          setIsSubmitting(false);
          return;
        }
      }

      notification.hideLoadingOverlay();

      if (!result.success) {
        if (result.error === "SYSTEM_BUSY") {
          notification.showWarningToast("Sistem Sedang Sibuk", result.message, 8000);
          return;
        }
        if (result.error && result.error.includes("duplicate key")) {
          notification.showInfoToast("Memproses ulang...", "Conflict terdeteksi, merefresh halaman.");
          await new Promise((r) => setTimeout(r, 1500));
          window.location.reload();
          return;
        }
        notification.showErrorToast("Gagal Memesan Nomor", result.error);
        return;
      }

      setReservedNumbers(result.data);
      notification.showSuccessToast("Berhasil Memesan Nomor", `${result.data.length} nomor berhasil dipesan.`);
    } catch (err) {
      notification.hideLoadingOverlay();
      console.error("[useReservedNumbers] FATAL ERROR:", err);
      notification.showErrorToast("Error", "Gagal mengambil nomor: " + err.message);
    } finally {
      if (lockAcquired) await releaseLockFn();
      setIsSubmitting(false);
    }
  };

  const confirmAll = async () => {
    setIsSubmitting(true);
    try {
      const promises = reservedNumbers.map((nomor) => {
        const { keterangan, kode_masalah, kode_submasalah1, kode_submasalah2, nomor_lengkap } = nomor;
        return confirmNomorSurat(nomor.id, {
          keterangan,
          kode_masalah,
          kode_submasalah1,
          kode_submasalah2,
          nomor_lengkap,
        });
      });
      await Promise.all(promises);
      setConfirmedNumbersData([...reservedNumbers]);
      notification.showSuccessToast("Konfirmasi Berhasil", "Semua nomor berhasil dikonfirmasi!");
      setReservedNumbers(null);
      return true;
    } catch (error) {
      console.error("[useReservedNumbers] Error konfirmasi:", error);
      notification.showErrorToast("Error Konfirmasi", "Gagal konfirmasi nomor: " + error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelAll = async () => {
    const confirmed = await notification.confirmAction({
      type: "danger",
      title: "Batalkan Semua Nomor?",
      message: `Yakin ingin membatalkan ${reservedNumbers.length} nomor yang dipesan?`,
      confirmText: "Ya, Batalkan Semua",
      cancelText: "Tidak",
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const promises = reservedNumbers.map((nomor) => cancelNomorSurat(nomor.id, profile.id));
      await Promise.all(promises);
      notification.showSuccessToast("Berhasil Dibatalkan", `${reservedNumbers.length} nomor berhasil dibatalkan!`);
      setReservedNumbers(null);
    } catch (error) {
      console.error("[useReservedNumbers] Error batalkan semua:", error);
      notification.showErrorToast("Error Batalkan", "Gagal membatalkan nomor: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanExpired = async () => {
    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Clean Expired Numbers?",
      message: "Yakin ingin membersihkan semua nomor yang sudah expired?",
      confirmText: "Ya, Bersihkan",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const result = await serviceCleanExpiredNomor();
      if (result.success) {
        notification.showSuccessToast("Clean Expired Berhasil", `${result.count} nomor berhasil dibersihkan!`);
      } else {
        notification.showErrorToast("Clean Expired Gagal", result.error);
      }
    } catch (error) {
      console.error("[useReservedNumbers] Error clean expired:", error);
      notification.showErrorToast("Error", "Gagal clean expired: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNomorExpired = (ids) => {
    const idArray = Array.isArray(ids) ? ids : [ids];

    setExpiredIds((prev) => {
      const next = new Set(prev);
      idArray.forEach((id) => next.add(id));
      return next;
    });

    setTimeout(() => {
      setReservedNumbers((prev) => {
        if (!prev) return null;
        const updated = prev.filter((n) => !idArray.includes(n.id));
        return updated.length > 0 ? updated : null;
      });

      // Panggil cleanup di server agar status jadi cancelled di DB
      serviceCleanExpiredNomor();
    }, 2000);
  };

  return {
    reservedNumbers,
    setReservedNumbers,
    expiredIds,
    adminPool,
    setAdminPool,
    edgeFunctionLogs,
    adminPoolSchedule,
    isSubmitting,
    setIsSubmitting,
    confirmedNumbersData,
    loadAdminPool,
    loadEdgeFunctionLogs,
    loadAdminPoolSchedule,
    reserveNumbers,
    confirmAll,
    cancelAll,
    cleanExpired,
    handleNomorExpired,
  };
}
