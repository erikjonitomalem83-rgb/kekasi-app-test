import { unlockAudio } from "../utils/soundAlert";
import CountdownTimer from "../components/common/CountdownTimer";
import { useNotification } from "../components/common/Notification";
import { cleanupOnLogout } from "../services/lockService";
import { detectBrowser, getBrowserMessage } from "../utils/browserDetection";
import LogoKEKASI from "../assets/images/Logo_KEKASI.svg";
import CreateUserModal from "../components/common/CreateUserModal";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from "../components/common/ChangePasswordModal";
import { validateSession, subscribeToSessionChanges } from "../services/sessionService";
import ProfileModal from "../components/common/ProfileModal";

import {
  reserveNomorBerurutan,
  reserveNomorAcak,
  confirmNomorSurat,
  cancelNomorSurat,
  syncNomorSequence,
} from "../services/nomorSuratService";
import {
  acquireLock,
  releaseLock,
  checkLockStatus,
  subscribeToLockStatus,
  forceReleaseLock,
} from "../services/lockService";
import { MAX_NOMOR_PER_REQUEST, MIN_NOMOR_PER_REQUEST } from "../utils/constants";
import { useIdleTimer } from "../hooks/useIdleTimer";
import { logout } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import HistoryModal from "../components/common/HistoryModal";
import NomorLamaModal from "../components/common/NomorLamaModal";
import RekapModal from "../components/common/RekapModal";
import UserListModal from "../components/common/UserListModal";

export default function Dashboard() {
  // ========== HOOK PERTAMA DAN SATU-SATUNYA ==========
  const { profile, user, isAdmin } = useAuth(); // ← AMBIL SEMUA SEKALIGUS

  // ========== AUTH STORE ==========
  const { logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const notification = useNotification();

  // ========== STATE UNTUK PASSWORD WARNING ==========
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPasswordWarning, setShowPasswordWarning] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ========== STATE UNTUK FORM DAN DATA LAINNYA ==========
  const [formData, setFormData] = useState({
    kodeKanwil: "WIM.2",
    kodeUPT: "IMI.4",
    kodeMasalah: "UM",
    subMasalah1: "01",
    subMasalah2: "01",
    jumlahNomor: 1,
    mode: "berurutan",
    keterangan: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservedNumbers, setReservedNumbers] = useState(null);
  const [expiredIds, setExpiredIds] = useState(new Set());
  const [adminPool, setAdminPool] = useState([]);
  const [edgeFunctionLogs, setEdgeFunctionLogs] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [lockStatus, setLockStatus] = useState({
    isLocked: false,
    lockedBy: null,
    lockedByUserId: null,
    lockedAt: null,
  });
  const [hasLock, setHasLock] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNomorLamaModal, setShowNomorLamaModal] = useState(false);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [idleWarningShown, setIdleWarningShown] = useState(false);

  // ========== REF UNTUK AVOID CIRCULAR DEPENDENCY ==========
  const handleLogoutRef = useRef();

  // ========== EFFECT: CEK PASSWORD DEFAULT ==========
  useEffect(() => {
    if (profile?.password === "Password123!") {
      setShowPasswordWarning(true);
    }
  }, [profile]);

  // Browser check
  useEffect(() => {
    const browser = detectBrowser();
    if (browser.blocked) {
      const message = getBrowserMessage();

      console.log(`[Browser Block] Detected: ${browser.name}`);

      notification.showErrorToast(message.title, message.message + "\n\nAnda akan di-logout dalam 5 detik.");

      const timeoutId = setTimeout(async () => {
        try {
          console.log("[Browser Block] Starting forced logout...");

          if (hasLock && profile?.id) {
            console.log("[Browser Block] Releasing user lock...");
            try {
              await releaseLock(profile.id);
              console.log("[Browser Block] Lock released");
            } catch (lockErr) {
              console.error("[Browser Block] Lock release error:", lockErr);
            }
          }

          if (reservedNumbers && reservedNumbers.length > 0) {
            console.log(`[Browser Block] Cancelling ${reservedNumbers.length} reserved numbers...`);
            try {
              const cancelPromises = reservedNumbers.map((nomor) =>
                cancelNomorSurat(nomor.id, profile.id).catch((err) => {
                  console.error(`[Browser Block] Failed to cancel nomor ${nomor.nomor_urut}:`, err);
                  return null;
                })
              );
              await Promise.allSettled(cancelPromises);
              console.log("[Browser Block] Reserved numbers cancelled");
            } catch (cancelErr) {
              console.error("[Browser Block] Cancel error:", cancelErr);
            }
          }

          console.log("[Browser Block] Executing logout...");
          try {
            await logout();
            console.log("[Browser Block] Logout successful");
          } catch (logoutErr) {
            console.error("[Browser Block] Logout error:", logoutErr);
          }

          clearAuth();
          console.log("[Browser Block] Auth store cleared");

          console.log("[Browser Block] Redirecting to Chrome download...");
          window.location.href = "https://www.google.com/chrome/";
        } catch (error) {
          console.error("[Browser Block] Fatal error during forced logout:", error);
          clearAuth();
          window.location.href = "https://www.google.com/chrome/";
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [notification, clearAuth, hasLock, profile, reservedNumbers]);

  // Cek reserved numbers saat component mount
  useEffect(() => {
    const checkReservedNumbers = async () => {
      if (!profile?.id) return;

      try {
        const { data, error } = await supabase
          .from("nomor_surat")
          .select("*")
          .eq("user_id", profile.id)
          .eq("status", "reserved")
          .gte("expired_at", new Date().toISOString());

        if (error) throw error;

        if (data && data.length > 0) {
          setReservedNumbers(data);
        }
      } catch (error) {
        console.error("Error check reserved:", error);
      }
    };

    checkReservedNumbers();
  }, [profile]);

  // Sync sequence saat Dashboard pertama kali load
  useEffect(() => {
    const initializeSequence = async () => {
      try {
        console.log("[Dashboard] Initializing nomor sequence...");
        await syncNomorSequence();
        console.log("[Dashboard] Nomor sequence initialized successfully");
      } catch (error) {
        console.error("[Dashboard] Error initializing sequence:", error);
      }
    };

    initializeSequence();
  }, []);

  // Session validator - periodic check every 30 seconds
  useEffect(() => {
    if (!profile?.id) return;

    const checkSession = async () => {
      // ✅ PENTING: Skip check jika sedang logout ATAU tidak ada profile
      if (window.isLoggingOut || !profile?.id) {
        console.log("[Dashboard] Skipping session check - logout in progress or no profile");
        return;
      }

      // ✅ Cek localStorage untuk verifikasi kita masih login
      const kekasiAuth = localStorage.getItem("kekasi-auth");
      if (!kekasiAuth) {
        console.log("[Dashboard] No auth data found, skipping session check");
        return;
      }

      const result = await validateSession(profile.id);

      if (!result.valid) {
        console.log("[Dashboard] Invalid session detected, forcing logout...");

        // ✅ JANGAN tampilkan notif jika isLoggingOut sudah true
        if (!window.isLoggingOut) {
          notification.showWarningToast(
            "Sesi Tidak Valid",
            "Akun Anda telah login dari perangkat lain. Anda akan logout otomatis.",
            5000
          );

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (handleLogoutRef.current) {
          await handleLogoutRef.current(true);
        }
      }
    };

    // Check immediately on mount
    checkSession();

    // Check every 30 seconds
    const interval = setInterval(checkSession, 30000);

    // Simpan interval ID ke window agar bisa di-clear saat logout
    window.sessionCheckInterval = interval;

    return () => {
      clearInterval(interval);
      if (window.sessionCheckInterval === interval) {
        window.sessionCheckInterval = null;
      }
    };
  }, [profile, notification]);
  // Realtime session monitor - detect force logout immediately
  useEffect(() => {
    if (!profile?.id) return;

    console.log("[Dashboard] 🔔 Setting up realtime session monitor for user:", profile.id);

    // ✅ Flag untuk prevent duplicate trigger dalam satu instance
    let forceLogoutTriggered = false;

    const handleForceLogout = async () => {
      // ✅ Skip jika sudah triggered atau sedang logout
      if (forceLogoutTriggered || window.isLoggingOut) {
        console.log("[Dashboard] ⚠️ Force logout already triggered or logout in progress, skipping...");
        return;
      }

      forceLogoutTriggered = true;
      console.log("[Dashboard] 🚨 Force logout detected from another device - TRIGGERING LOGOUT");

      // ✅ Ambil reserved count dari current state (closure)
      const currentReservedCount = reservedNumbers ? reservedNumbers.length : 0;

      // ✅ Tampilkan HANYA 1 notifikasi
      if (currentReservedCount > 0) {
        notification.showWarningToast(
          "Login dari Perangkat Lain",
          `Akun Anda telah login dari perangkat lain.\n\n${currentReservedCount} nomor yang Anda pesan akan dibatalkan otomatis.\n\nSesi ini akan diakhiri.`,
          6000
        );
      } else {
        notification.showWarningToast(
          "Login dari Perangkat Lain",
          "Akun Anda telah login dari perangkat/browser lain. Sesi ini akan diakhiri.",
          5000
        );
      }

      // Wait 2 detik sebelum logout
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger logout
      if (handleLogoutRef.current) {
        await handleLogoutRef.current(true);
      }
    };

    // Subscribe ke session changes
    const channel = subscribeToSessionChanges(profile.id, handleForceLogout);

    // Cleanup
    return () => {
      console.log("[Dashboard] 🧹 Cleaning up realtime session monitor");
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [profile?.id]); // ✅ ONLY profile.id - hapus notification & reservedNumbers!

  // Monitor lock status
  useEffect(() => {
    const loadLockStatus = async () => {
      const result = await checkLockStatus();
      if (result.success) {
        setLockStatus({
          isLocked: result.isLocked,
          lockedBy: result.lockedBy,
          lockedByUserId: result.lockedByUserId,
          lockedAt: result.lockedAt,
        });

        if (result.isLocked && result.lockedAt) {
          const lockTime = new Date(result.lockedAt).getTime();
          const now = Date.now();
          const diffSeconds = (now - lockTime) / 1000;
          const diffMinutes = diffSeconds / 60;

          console.log(`[Dashboard] Lock age: ${diffSeconds.toFixed(0)}s (${diffMinutes.toFixed(1)}m)`);

          if (diffMinutes > 2) {
            console.log(`[Dashboard] Lock timeout detected (${diffMinutes.toFixed(1)}m), force releasing...`);

            const forceResult = await forceReleaseLock();

            if (forceResult.success) {
              console.log("[Dashboard] Lock force released successfully");

              setLockStatus({
                isLocked: false,
                lockedBy: null,
                lockedByUserId: null,
                lockedAt: null,
              });

              notification.showInfoToast(
                "Lock Released",
                `Lock dari ${result.lockedBy} telah di-release otomatis (timeout 2 menit).`
              );
            }
          }
        }
      }
    };

    loadLockStatus();

    const channel = subscribeToLockStatus((newLockData) => {
      console.log("[Dashboard] Lock status changed:", {
        isLocked: newLockData.is_locked,
        lockedBy: newLockData.locked_by_user_name,
      });

      setLockStatus({
        isLocked: newLockData.is_locked,
        lockedBy: newLockData.locked_by_user_name,
        lockedByUserId: newLockData.locked_by_user_id,
        lockedAt: newLockData.locked_at,
      });

      if (!newLockData.is_locked) {
        setHasLock(false);
      }
    });

    const interval = setInterval(() => {
      loadLockStatus();
    }, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [notification]);

  // Load admin pool bulan ini
  useEffect(() => {
    const loadAdminPool = async () => {
      if (!isAdmin) return;

      try {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const startOfMonth = `${currentMonth}-01`;
        const nextMonth = new Date(currentMonth + "-01");
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endOfMonth = nextMonth.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("nomor_surat")
          .select("*")
          .eq("kode_kanwil", formData.kodeKanwil)
          .eq("kode_upt", formData.kodeUPT)
          .eq("kode_masalah", formData.kodeMasalah)
          .eq("kode_submasalah1", formData.subMasalah1)
          .eq("kode_submasalah2", formData.subMasalah2)
          .gte("tanggal", startOfMonth)
          .lt("tanggal", endOfMonth)
          .eq("keterangan", "ADMIN_EMERGENCY_POOL")
          .eq("status", "reserved")
          .is("user_id", null)
          .order("nomor_urut", { ascending: true });

        if (error) throw error;

        console.log("[Dashboard] Admin Pool loaded:", data);
        console.log("[Dashboard] Admin Pool count:", data?.length || 0);

        setAdminPool(data || []);
      } catch (error) {
        console.error("Error load admin pool:", error);
      }
    };

    loadAdminPool();
  }, [
    isAdmin,
    formData.kodeKanwil,
    formData.kodeUPT,
    formData.kodeMasalah,
    formData.subMasalah1,
    formData.subMasalah2,
  ]);

  // Load edge function logs
  useEffect(() => {
    const loadEdgeFunctionLogs = async () => {
      if (!isAdmin) return;

      try {
        const { data, error } = await supabase
          .from("edge_function_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        setEdgeFunctionLogs(data || []);
        console.log("[Dashboard] Edge function logs loaded:", data?.length || 0);
      } catch (error) {
        console.error("Error load edge logs:", error);
      }
    };

    loadEdgeFunctionLogs();
  }, [isAdmin]);

  // DEBUG admin pool
  useEffect(() => {
    console.log("=== DEBUG ADMIN POOL ===");
    console.log("isAdmin:", isAdmin);
    console.log("adminPool:", adminPool);
    console.log("adminPool.length:", adminPool.length);
  }, [adminPool, isAdmin]);

  // HANDLE LOGOUT FUNCTION
  const handleLogout = async (skipConfirm = false) => {
    window.isLoggingOut = true;
    console.log("[Logout] isLoggingOut flag set to true");

    // Stop session checker
    if (window.sessionCheckInterval) {
      clearInterval(window.sessionCheckInterval);
      window.sessionCheckInterval = null;
      console.log("[Logout] Session checker stopped");
    }

    // ✅ TAMBAHKAN: Cleanup session channel
    try {
      const { cleanupSessionChannel } = await import("../services/sessionService");
      cleanupSessionChannel();
      console.log("[Logout] 🧹 Session channel cleaned up");
    } catch (err) {
      console.warn("[Logout] Could not cleanup session channel:", err);
    }

    // Clear localStorage
    try {
      localStorage.removeItem("kekasi-auth");
      localStorage.removeItem("kekasi_session_token");
      console.log("[Logout] Auth data cleared from localStorage");
    } catch (e) {
      console.warn("[Logout] Could not clear localStorage:", e);
    }

    if (!skipConfirm) {
      const confirmed = await notification.confirmAction({
        type: "warning",
        title: "Konfirmasi Logout",
        message:
          "Yakin ingin keluar dari aplikasi?\n\nJika Anda memiliki nomor yang belum dikonfirmasi, nomor tersebut akan dibatalkan otomatis.",
        confirmText: "Ya, Logout",
        cancelText: "Batal",
      });

      if (!confirmed) {
        window.isLoggingOut = false;
        return;
      }
    }

    console.log("=== LOGOUT PROCESS STARTED ===");

    try {
      if (hasLock || lockStatus.lockedByUserId === profile.id) {
        console.log("[Logout] Step 1: Releasing user lock...");

        try {
          const cleanupResult = await cleanupOnLogout(profile.id);

          if (cleanupResult.success) {
            console.log("[Logout] Lock cleanup successful");
            if (cleanupResult.forced) {
              console.log("[Logout] Lock was force-released");
            }
          } else {
            console.warn("[Logout] Lock cleanup failed:", cleanupResult.error);
          }

          setHasLock(false);
          setLockStatus({
            isLocked: false,
            lockedBy: null,
            lockedByUserId: null,
            lockedAt: null,
          });
        } catch (lockErr) {
          console.error("[Logout] Lock cleanup error:", lockErr);
        }
      } else {
        console.log("[Logout] Step 1: No active lock to release");
      }

      if (reservedNumbers && reservedNumbers.length > 0) {
        console.log(`[Logout] Step 2: Cancelling ${reservedNumbers.length} reserved numbers...`);

        try {
          const cancelPromises = reservedNumbers.map((nomor) =>
            cancelNomorSurat(nomor.id, profile.id).catch((err) => {
              console.error(`[Logout] Failed to cancel nomor ${nomor.nomor_urut}:`, err);
              return null;
            })
          );

          await Promise.allSettled(cancelPromises);
          console.log("[Logout] Reserved numbers cancelled");

          setReservedNumbers(null);
        } catch (cancelErr) {
          console.error("[Logout] Error cancelling numbers:", cancelErr);
        }
      } else {
        console.log("[Logout] Step 2: No reserved numbers to cancel");
      }

      console.log("[Logout] Step 3: Executing auth logout...");

      const logoutResult = await logout();

      if (logoutResult.success) {
        console.log("[Logout] Auth logout successful");

        console.log("[Logout] Step 4: Clearing auth store...");
        clearAuth();

        console.log("[Logout] Step 5: Clearing component state...");
        setReservedNumbers(null);
        setFormData({
          kodeKanwil: "WIM.2",
          kodeUPT: "IMI.4",
          kodeMasalah: "UM",
          subMasalah1: "01",
          subMasalah2: "01",
          jumlahNomor: 1,
          mode: "berurutan",
          keterangan: "",
        });
        setFormErrors({});
        setExpiredIds(new Set());
        setAdminPool([]);

        console.log("[Logout] Step 6: Navigating to login...");
        navigate("/login", { replace: true });

        console.log("=== LOGOUT PROCESS COMPLETED ===");
      } else {
        console.warn("[Logout] Auth logout failed, forcing logout anyway...");
        console.error("[Logout] Error:", logoutResult.error);

        clearAuth();
        navigate("/login", { replace: true });

        console.log("=== FORCED LOGOUT COMPLETED ===");
      }
    } catch (error) {
      console.error("[Logout] FATAL ERROR during logout:", error);

      try {
        clearAuth();

        const { forceLogout } = await import("../services/authService");
        forceLogout();
      } catch (finalErr) {
        console.error("[Logout] Even force logout failed:", finalErr);
        navigate("/login", { replace: true });
        window.location.reload();
      }
    } finally {
      // Clear flag setelah logout selesai
      window.isLoggingOut = false;
    }
  };

  // Set ref
  handleLogoutRef.current = handleLogout;

  // Callback untuk warning sebelum auto-logout
  const handleIdleWarning = useCallback(async () => {
    if (idleWarningShown) return;

    setIdleWarningShown(true);

    const hasReserved = reservedNumbers !== null && reservedNumbers.length > 0;
    const idleDuration = hasReserved ? "45 menit" : "30 menit";

    const stayLoggedIn = await notification.confirmAction({
      type: "warning",
      title: "Peringatan Idle",
      message: `Anda tidak aktif selama ${idleDuration}.\n\nAnda akan logout otomatis dalam 2 menit jika tidak ada aktivitas.\n\nKlik 'Tetap Login' untuk melanjutkan sesi Anda.`,
      confirmText: "Tetap Login",
      cancelText: "Logout Sekarang",
    });

    if (stayLoggedIn) {
      setIdleWarningShown(false);
    } else {
      await handleLogoutRef.current(true);
    }
  }, [idleWarningShown, notification, reservedNumbers]);

  // Callback untuk auto-logout
  const handleAutoLogout = useCallback(async () => {
    console.log("[Auto-Logout] Starting auto-logout due to idle time...");

    const hasReserved = reservedNumbers !== null && reservedNumbers.length > 0;
    const idleDuration = hasReserved ? "45 menit" : "30 menit";

    notification.showWarningToast(
      "Auto Logout",
      `Anda telah logout otomatis karena tidak ada aktivitas selama ${idleDuration}`
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await handleLogoutRef.current(true);
  }, [notification, reservedNumbers]);

  // Initialize idle timer
  useIdleTimer(
    30 * 60 * 1000, // normalIdleTime: 30 menit
    2 * 60 * 1000, // warningTime: 2 menit
    handleIdleWarning,
    handleAutoLogout,
    reservedNumbers !== null && reservedNumbers.length > 0, // hasReservedNumbers
    45 * 60 * 1000 // extendedIdleTime: 45 menit
  );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.kodeKanwil.trim()) errors.kodeKanwil = "Kode Kanwil wajib diisi";
    if (!formData.kodeUPT.trim()) errors.kodeUPT = "Kode UPT wajib diisi";

    if (!formData.kodeMasalah.trim()) {
      errors.kodeMasalah = "Kode Masalah wajib diisi";
    } else if (formData.kodeMasalah.length !== 2) {
      errors.kodeMasalah = "Kode Masalah harus 2 huruf";
    }

    if (!formData.subMasalah1.trim()) {
      errors.subMasalah1 = "Sub Masalah 1 wajib diisi";
    } else if (formData.subMasalah1.length !== 2) {
      errors.subMasalah1 = "Harus 2 digit angka";
    }

    if (formData.subMasalah2.trim() && formData.subMasalah2.length !== 2) {
      errors.subMasalah2 = "Harus 2 digit angka";
    }

    if (formData.jumlahNomor < MIN_NOMOR_PER_REQUEST || formData.jumlahNomor > MAX_NOMOR_PER_REQUEST)
      errors.jumlahNomor = `Jumlah nomor harus antara ${MIN_NOMOR_PER_REQUEST}-${MAX_NOMOR_PER_REQUEST}`;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Konfirmasi Pemesanan",
      message: `Anda akan memesan ${formData.jumlahNomor} nomor surat.\n\nSebelum pesanan nomor diberikan, pastikan Anda memang membutuhkan nomor surat ini.\n\nLanjutkan pemesanan?`,
      confirmText: "Ya, Lanjutkan",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    unlockAudio();
    setIsSubmitting(true);

    let lockAcquired = false;

    try {
      console.log("[handleSubmit] Trying to acquire lock...");
      const lockResult = await acquireLock(profile.id, profile.nama_lengkap);

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
      setHasLock(true);
      console.log("[handleSubmit] Lock acquired successfully");

      notification.showLoadingOverlay(
        `Memproses ${formData.jumlahNomor} nomor surat...\nMohon tunggu, jangan tutup halaman ini.`
      );
      notification.updateProgressBar(0);
      notification.updateProgressBar(30);

      const reserveFunction = formData.mode === "berurutan" ? reserveNomorBerurutan : reserveNomorAcak;
      notification.updateProgressBar(60);

      const result = await reserveFunction(profile.id, formData, formData.jumlahNomor);
      notification.updateProgressBar(90);
      notification.hideLoadingOverlay();

      if (!result.success) {
        // Handle SYSTEM_BUSY error dengan pesan yang jelas dan profesional
        if (result.error === "SYSTEM_BUSY") {
          notification.showWarningToast(
            "Sistem Sedang Sibuk",
            `Maaf, sistem sedang digunakan oleh user lain untuk memesan nomor dalam jumlah besar.\n\n` +
              `Saat ini hanya tersedia ${result.availableCount} nomor dari ${result.requestedCount} yang Anda minta.\n\n` +
              `Silakan tunggu beberapa saat (30-60 detik) dan coba lagi.`,
            8000
          );
          return;
        }

        // Handle duplicate key error dengan auto-refresh
        if (result.error && result.error.includes("duplicate key")) {
          console.log("[handleSubmit] Duplicate key detected, auto-recovering...");

          notification.showInfoToast(
            "Memproses ulang...",
            "Sistem mendeteksi conflict, sedang memproses ulang permintaan Anda."
          );

          await new Promise((resolve) => setTimeout(resolve, 1500));
          window.location.reload();
          return;
        }

        // Handle error lainnya
        notification.showErrorToast("Gagal Memesan Nomor", result.error);
        return;
      }

      // Berhasil - set reserved numbers
      setReservedNumbers(result.data);

      notification.showSuccessToast(
        "Berhasil Memesan Nomor",
        `${result.data.length} nomor berhasil dipesan. Silakan isi keterangan dan konfirmasi dalam 5 menit.`
      );
    } catch (err) {
      notification.hideLoadingOverlay();
      console.error("[handleSubmit] FATAL ERROR:", err);

      // Auto-recover untuk duplicate key error
      if (err.message && err.message.includes("duplicate key")) {
        console.log("[handleSubmit] Duplicate key in catch, auto-recovering...");

        notification.showInfoToast(
          "Memproses ulang...",
          "Sistem mendeteksi conflict, halaman akan di-refresh otomatis."
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        window.location.reload();
        return;
      }

      notification.showErrorToast("Error", "Gagal mengambil nomor: " + err.message);
    } finally {
      if (lockAcquired) {
        console.log("[handleSubmit] Releasing lock in finally block...");
        try {
          await releaseLock(profile.id);
          setHasLock(false);
          console.log("[handleSubmit] Lock released successfully");
        } catch (releaseErr) {
          console.error("[handleSubmit] Failed to release lock:", releaseErr);
          await forceReleaseLock();
        }
      }
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      kodeKanwil: "WIM.2",
      kodeUPT: "IMI.4",
      kodeMasalah: "UM",
      subMasalah1: "01",
      subMasalah2: "01",
      jumlahNomor: 1,
      mode: "berurutan",
      keterangan: "",
    });
    setFormErrors({});
    setReservedNumbers(null);
  };

  const handleKonfirmasiSemua = async () => {
    const kosong = reservedNumbers.filter((n) => !n.keterangan || n.keterangan.trim() === "");
    if (kosong.length > 0) {
      notification.showWarningToast(
        "Keterangan Belum Lengkap",
        `Ada ${kosong.length} nomor yang belum diisi keterangan!`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const promises = reservedNumbers.map((nomor) => confirmNomorSurat(nomor.id, nomor.keterangan));

      await Promise.all(promises);

      notification.showSuccessToast("Konfirmasi Berhasil", "Semua nomor berhasil dikonfirmasi!");

      setReservedNumbers(null);
      handleReset();
    } catch (error) {
      console.error("Error konfirmasi:", error);
      notification.showErrorToast("Error Konfirmasi", "Gagal konfirmasi nomor: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatalkanSemua = async () => {
    const confirmed = await notification.confirmAction({
      type: "danger",
      title: "Batalkan Semua Nomor?",
      message: `Yakin ingin membatalkan ${reservedNumbers.length} nomor yang dipesan?\n\nNomor yang dibatalkan akan dikembalikan ke pool dan bisa diambil user lain.`,
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
      handleReset();
    } catch (error) {
      console.error("Error batalkan semua:", error);
      notification.showErrorToast("Error Batalkan", "Gagal membatalkan nomor: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanExpired = async () => {
    if (!isAdmin) {
      notification.showWarningToast("Akses Ditolak", "Hanya admin yang bisa clean expired nomor!");
      return;
    }

    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Clean Expired Numbers?",
      message:
        "Yakin ingin membersihkan semua nomor yang sudah expired?\n\nNomor yang expired akan diubah statusnya jadi 'cancelled' dan bisa direuse oleh user lain.",
      confirmText: "Ya, Bersihkan",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const { cleanExpiredNomor } = await import("../services/nomorSuratService");
      const result = await cleanExpiredNomor();

      if (result.success) {
        notification.showSuccessToast("Clean Expired Berhasil", `${result.count} nomor expired berhasil dibersihkan!`);
      } else {
        notification.showErrorToast("Clean Expired Gagal", result.error);
      }
    } catch (error) {
      console.error("Error clean expired:", error);
      notification.showErrorToast("Error", "Gagal clean expired: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmbilNomorEmergency = async () => {
    if (!isAdmin) {
      notification.showWarningToast("Akses Ditolak", "Hanya admin yang bisa ambil nomor emergency!");
      return;
    }

    if (adminPool.length === 0) {
      notification.showWarningToast("Pool Kosong", "Tidak ada nomor emergency tersedia bulan ini!");
      return;
    }

    const keterangan = prompt(
      `Anda akan mengambil nomor ${adminPool[0].nomor_urut} untuk keperluan urgent.\n\n` +
        `Masukkan keterangan penggunaan nomor ini:`
    );

    if (keterangan === null) {
      return;
    }

    if (!keterangan || keterangan.trim() === "") {
      notification.showWarningToast("Keterangan Kosong", "Keterangan wajib diisi!");
      return;
    }

    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Ambil Nomor Emergency?",
      message: `Anda akan mengambil nomor ${adminPool[0].nomor_urut} untuk keperluan urgent.\n\nKeterangan: ${keterangan}\n\nNomor ini akan langsung dikonfirmasi dan tidak bisa dibatalkan.`,
      confirmText: "Ya, Ambil Nomor",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const nomorEmergency = adminPool[0];

      const { error: updateError } = await supabase
        .from("nomor_surat")
        .update({
          user_id: profile.id,
          keterangan: `[EMERGENCY] ${keterangan}`,
          confirmed_at: new Date().toISOString(),
          status: "confirmed",
        })
        .eq("id", nomorEmergency.id);

      if (updateError) throw updateError;

      await supabase.from("history_log").insert({
        nomor_id: nomorEmergency.id,
        user_id: profile.id,
        action: "confirm_emergency",
        timestamp: new Date().toISOString(),
      });

      setAdminPool((prev) => prev.filter((n) => n.id !== nomorEmergency.id));

      notification.showSuccessToast(
        "Berhasil Ambil Nomor Emergency",
        `Nomor ${nomorEmergency.nomor_urut} berhasil diambil.\n\nNomor Lengkap: ${nomorEmergency.nomor_lengkap}\n\nNomor ini sudah confirmed dan siap digunakan.`
      );
    } catch (error) {
      console.error("Error ambil emergency nomor:", error);
      notification.showErrorToast("Error Ambil Emergency", "Gagal ambil nomor emergency: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualGeneratePool = async () => {
    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Generate Emergency Pool Manual?",
      message:
        "Edge function akan dijalankan secara manual untuk generate nomor emergency.\n\n" +
        "Peringatan: Ini akan:\n" +
        "- Generate 3 nomor emergency untuk bulan ini jika belum ada\n" +
        "- Menggunakan kombinasi dari nomor confirmed atau fallback\n\n" +
        "Lanjutkan?",
      confirmText: "Ya, Generate",
      cancelText: "Batal",
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    notification.showLoadingOverlay("Menjalankan edge function...\nMohon tunggu.");

    try {
      console.log("[Manual Generate] Starting edge function call...");

      const { data: result, error: invokeError } = await supabase.functions.invoke("auto-reserve-admin-pool", {
        body: {},
      });

      notification.hideLoadingOverlay();

      console.log("[Manual Generate] Result:", result);

      if (invokeError) {
        console.error("[Manual Generate] Invoke error:", invokeError);
        notification.showErrorToast(
          "Error Edge Function",
          `Gagal menjalankan edge function:\n\n${invokeError.message}`
        );
        return;
      }

      if (result.success) {
        notification.showSuccessToast(
          "Generate Pool Berhasil",
          `${result.reserved} nomor emergency berhasil di-generate!\n\n` +
            `Pool sekarang: ${result.pool_count}/3\n\n` +
            `Halaman akan di-reload dalam 2 detik...`
        );

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        notification.showWarningToast(
          "Generate Gagal",
          result.message || "Gagal generate emergency pool.\n\nCek console untuk detail."
        );
      }
    } catch (error) {
      console.error("[Manual Generate] Fatal error:", error);
      notification.hideLoadingOverlay();
      notification.showErrorToast(
        "Error Tidak Terduga",
        "Gagal menjalankan edge function:\n\n" + (error.message || String(error))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNomorExpired = (nomorId) => {
    setExpiredIds((prev) => new Set([...prev, nomorId]));

    setTimeout(() => {
      setReservedNumbers((prev) => {
        if (!prev) return null;
        const updated = prev.filter((n) => n.id !== nomorId);
        return updated.length > 0 ? updated : null;
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-8">
      {/* HEADER */}
      <header
        className="bg-transparent shadow-lg"
        style={{
          borderBottomLeftRadius: "20px",
          borderBottomRightRadius: "20px",
        }}
      >
        <div className="container mx-auto px-4 md:px-6 py-2 flex justify-between items-center">
          <div className="flex flex-col items-center" style={{ marginTop: "-35px" }}>
            <div className="relative" style={{ marginBottom: "-40px" }}>
              <img
                src={LogoKEKASI}
                alt="Logo KEKASI"
                className="w-32 h-32 object-contain block"
                style={{ margin: 0, padding: 0, display: "block" }}
              />
            </div>
            <p
              className="text-gray-700 font-semibold text-center"
              style={{
                fontSize: "11px",
                margin: 0,
                paddingBottom: 12,
                lineHeight: "1.2",
              }}
            >
              Kantor Imigrasi Kelas II TPI Pematang Siantar
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-gray-800">{profile?.nama_lengkap}</p>
              <p className="text-xs text-gray-600">{profile?.seksi}</p>
              {isAdmin && (
                <span
                  className="inline-block mt-1 px-2 py-1 text-xs rounded-full font-semibold"
                  style={{ backgroundColor: "#efbc62", color: "#00325f" }}
                >
                  Admin
                </span>
              )}
            </div>

            <button
              onClick={() => setShowRekapModal(true)}
              className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition text-xs lg:text-sm"
              disabled={isSubmitting}
            >
              <span className="hidden lg:inline">Rekap</span>
              <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition text-xs lg:text-sm whitespace-nowrap"
              disabled={isSubmitting}
            >
              <span className="hidden xl:inline">Riwayat Nomor</span>
              <span className="hidden lg:inline xl:hidden">Riwayat</span>
              <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>

            {(isAdmin || profile?.role === "superadmin") && (
              <>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition text-xs lg:text-sm whitespace-nowrap"
                  disabled={isSubmitting}
                >
                  <span className="hidden lg:inline">Buat Akun Baru</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => setShowUserListModal(true)}
                  className="bg-purple-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-purple-700 transition text-xs lg:text-sm whitespace-nowrap"
                  disabled={isSubmitting}
                >
                  <span className="hidden lg:inline">Users</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </button>
              </>
            )}

            {isAdmin && (
              <button
                onClick={handleCleanExpired}
                className="bg-yellow-500 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-yellow-600 transition text-xs lg:text-sm whitespace-nowrap"
                disabled={isSubmitting}
              >
                <span className="hidden lg:inline">Clean Expired</span>
                <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </button>
            )}

            <button
              onClick={() => setShowProfileModal(true)}
              className="bg-indigo-600 text-white px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-indigo-700 transition text-xs lg:text-sm"
              disabled={isSubmitting}
            >
              <span className="hidden lg:inline">Profil</span>
              <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            <button
              onClick={() => handleLogout(false)}
              className="bg-gray-200 text-gray-800 px-3 lg:px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition text-xs lg:text-sm"
            >
              <span className="hidden lg:inline">Logout</span>
              <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setShowRekapModal(true)}
              className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            <button
              onClick={() => handleLogout(false)}
              className="bg-gray-200 text-gray-800 p-2 rounded-md hover:bg-gray-300 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="container mx-auto px-4 md:px-6 py-3 md:py-4">
        {/* ========== TAMBAHKAN BAGIAN INI ========== */}
        {showPasswordWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-yellow-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-yellow-800">⚠️ Peringatan Keamanan</p>
                  <p className="text-sm text-yellow-700">
                    Anda masih menggunakan password default. Segera ganti password untuk keamanan akun Anda!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition whitespace-nowrap flex-shrink-0"
              >
                Ganti Sekarang
              </button>
            </div>
          </div>
        )}
        {/* ========== AKHIR TAMBAHAN ========== */}

        {/* STATUS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 md:p-3 text-center">
            <p className="text-xs font-semibold" style={{ color: "#00325f" }}>
              Status
            </p>
            <p className="text-sm md:text-base font-bold text-green-700">Aktif</p>
          </div>
          <div
            className="rounded-lg p-2 md:p-3 text-center border"
            style={{ backgroundColor: "#00325f20", borderColor: "#00325f40" }}
          >
            <p className="text-xs font-semibold" style={{ color: "#00325f" }}>
              Role
            </p>
            <p className="text-sm md:text-base font-bold" style={{ color: "#00325f" }}>
              {profile?.role}
            </p>
          </div>
          <div
            className="rounded-lg p-2 md:p-3 text-center border"
            style={{ backgroundColor: "#efbc6220", borderColor: "#efbc6240" }}
          >
            <p className="text-xs font-semibold" style={{ color: "#00325f" }}>
              Seksi
            </p>
            <p className="text-sm md:text-base font-bold" style={{ color: "#00325f" }}>
              {profile?.seksi}
            </p>
          </div>
        </div>

        {/* Edge Function Status */}
        {isAdmin && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold mb-3 text-blue-900">Status Edge Function (Auto Reserve Pool)</h3>
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
                    <p
                      className={`text-sm font-bold ${edgeFunctionLogs[0].success ? "text-green-600" : "text-red-600"}`}
                    >
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
                        <span className="font-semibold">{idx + 1}.</span>{" "}
                        {new Date(log.created_at).toLocaleString("id-ID")} - Reserved: {log.reserved_count} -{" "}
                        <span className={log.success ? "text-green-600" : "text-red-600"}>
                          {log.success ? "Success" : "Failed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Belum ada log edge function</p>
            )}
          </div>
        )}

        {/* ADMIN EMERGENCY POOL INFO */}
        {isAdmin && (
          <div className="mb-8 bg-purple-50 border-2 border-purple-300 rounded-lg p-4 md:p-6">
            <h3 className="text-base md:text-lg font-bold mb-3" style={{ color: "#00325f" }}>
              Nomor Emergency Bulan Ini ({new Date().toLocaleString("id-ID", { month: "long", year: "numeric" })})
            </h3>

            <p className="text-sm text-gray-700 mb-3">Nomor yang disisihkan untuk keperluan urgent admin:</p>

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
              <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg mb-4">
                <p className="text-sm text-gray-600">Belum ada nomor emergency bulan ini.</p>
                <p className="text-xs text-gray-500 mt-2">
                  Klik tombol "Generate Pool Manual" untuk membuat nomor emergency.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
              <button
                onClick={handleAmbilNomorEmergency}
                disabled={isSubmitting || adminPool.length === 0}
                className="w-full sm:w-auto bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base"
              >
                Ambil Nomor Emergency
              </button>

              <button
                onClick={handleManualGeneratePool}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base"
              >
                Generate Pool Manual
              </button>
            </div>
          </div>
        )}

        {/* FORM + RESERVED NUMBERS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* LEFT: FORM */}
          <div className="lg:col-span-6 bg-white p-6 rounded-xl shadow-md border border-gray-200 lg:ml-2">
            <h2 style={{ color: "#00325f" }} className="text-lg font-bold mb-4">
              Pesan Nomor Surat
            </h2>

            {reservedNumbers && reservedNumbers.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <p className="text-sm font-semibold" style={{ color: "#00325f" }}>
                  Perhatian: Anda memiliki {reservedNumbers.length} nomor yang belum dikonfirmasi.
                </p>
                <p className="text-xs text-gray-700 mt-1">
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
                      Tombol "Ambil Nomor" akan aktif kembali setelah {lockStatus.lockedBy} selesai memesan nomor
                      (maksimal 5 menit).
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { key: "kodeKanwil", label: "Kode Kanwil", placeholder: "WIM.2" },
                  { key: "kodeUPT", label: "Kode UPT", placeholder: "IMI.4" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {label} <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg box-border uppercase 
                      focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150
                      ${formErrors[key] ? "border-red-500" : ""}`}
                      value={formData[key]}
                      onChange={(e) => handleInputChange(key, e.target.value.toUpperCase())}
                      placeholder={placeholder}
                      disabled={isSubmitting || reservedNumbers !== null}
                    />
                    {formErrors[key] && <p className="text-xs text-red-600 mt-1">{formErrors[key]}</p>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {[
                  { key: "kodeMasalah", label: "Kode Masalah", placeholder: "UM" },
                  { key: "subMasalah1", label: "Sub Masalah 1", placeholder: "01" },
                  {
                    key: "subMasalah2",
                    label: "Sub Masalah 2",
                    placeholder: "Kosongkan jika tidak ada",
                    optional: true,
                  },
                ].map(({ key, label, placeholder, optional }) => (
                  <div key={key} className={key === "subMasalah2" ? "col-span-2 sm:col-span-1" : ""}>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      {label} {!optional && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      className={`w-full px-3 py-2 md:py-2 border border-gray-300 rounded-lg box-border uppercase text-sm md:text-base
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
                        handleInputChange(key, value);
                      }}
                      placeholder={placeholder}
                      disabled={isSubmitting || reservedNumbers !== null}
                    />
                    {formErrors[key] && <p className="text-xs text-red-600 mt-1">{formErrors[key]}</p>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Jumlah Nomor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg box-border 
                    focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150
                    ${formErrors.jumlahNomor ? "border-red-500" : ""}`}
                    value={formData.jumlahNomor}
                    min="1"
                    max="50"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || value === null) {
                        handleInputChange("jumlahNomor", "");
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleInputChange("jumlahNomor", numValue);
                        }
                      }
                    }}
                    disabled={isSubmitting || reservedNumbers !== null}
                  />
                  {formErrors.jumlahNomor && <p className="text-xs text-red-600 mt-1">{formErrors.jumlahNomor}</p>}
                </div>
              </div>

              <div className="flex flex-col items-start">
                <label className="text-sm font-semibold text-gray-700 mb-1 w-full text-left" style={{ marginLeft: 0 }}>
                  Keterangan (Opsional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg box-border resize-none 
                  focus:outline-none focus:border-gray-300 focus:shadow-[inset_0_0_0_2px_#efbc62] transition-all duration-150"
                  rows="2"
                  placeholder="Contoh: Surat perjalanan dinas 3 pegawai"
                  value={formData.keterangan}
                  onChange={(e) => handleInputChange("keterangan", e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    reservedNumbers !== null ||
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
                    : reservedNumbers !== null
                    ? "Tuntaskan Pesanan Nomor"
                    : lockStatus.isLocked && lockStatus.lockedByUserId !== profile.id
                    ? "Sistem Sedang Digunakan..."
                    : "Pesan Nomor Surat"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNomorLamaModal(true)}
                  disabled={isSubmitting || reservedNumbers !== null}
                  className="w-full sm:flex-1 bg-purple-600 text-white font-semibold py-2.5 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm"
                >
                  Nomor Lama
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSubmitting || reservedNumbers !== null}
                  className="w-full sm:flex-1 bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 text-sm"
                >
                  Reset Form
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: RESERVED NUMBERS */}
          {reservedNumbers ? (
            <div className="lg:col-span-6 bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <h3 style={{ color: "#00325f" }} className="text-lg font-bold mb-3">
                Nomor yang Dipesan:
              </h3>

              <div className="mb-4 flex justify-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="font-semibold py-2 px-5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "#efbc62",
                    color: "#00325f",
                  }}
                  onClick={handleKonfirmasiSemua}
                >
                  Konfirmasi Semua
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  className="font-semibold py-2 px-5 rounded-lg transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleBatalkanSemua}
                >
                  Batalkan Semua
                </button>
              </div>

              <div className="space-y-3">
                {reservedNumbers.map((nomor) => {
                  const angkaAkhir = nomor.nomor_urut;
                  const isExpired = expiredIds.has(nomor.id);

                  return (
                    <div
                      key={nomor.id}
                      className={`border-b py-3 transition-all duration-300 ${isExpired ? "opacity-50 bg-red-50" : ""}`}
                      style={{ borderColor: "#efbc6240" }}
                    >
                      <div className="block md:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-800">#{angkaAkhir}</span>
                            <CountdownTimer
                              expiredAt={nomor.expired_at}
                              onExpired={() => handleNomorExpired(nomor.id)}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isExpired}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                            onClick={async () => {
                              const result = await cancelNomorSurat(nomor.id, profile.id);
                              if (result.success) {
                                setReservedNumbers((prev) => {
                                  const updated = prev.filter((n) => n.id !== nomor.id);
                                  return updated.length > 0 ? updated : null;
                                });
                                notification.showSuccessToast(
                                  "Nomor Dibatalkan",
                                  `Nomor ${nomor.nomor_urut} berhasil dibatalkan`
                                );

                                if (reservedNumbers.length === 1) {
                                  handleReset();
                                }
                              } else {
                                notification.showErrorToast("Gagal Batalkan", result.error);
                              }
                            }}
                          >
                            Batal
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Keterangan <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            disabled={isExpired}
                            placeholder={isExpired ? "Expired..." : "Isi keterangan"}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#efbc62] focus:ring-2 focus:ring-[#efbc62] disabled:opacity-50"
                            onChange={(e) =>
                              setReservedNumbers((prev) =>
                                prev.map((n) => (n.id === nomor.id ? { ...n, keterangan: e.target.value } : n))
                              )
                            }
                            value={nomor.keterangan || ""}
                          />
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-4">
                        <div className="relative">
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-base font-semibold text-gray-800 whitespace-nowrap">
                            #{angkaAkhir}
                          </span>
                          <CountdownTimer expiredAt={nomor.expired_at} onExpired={() => handleNomorExpired(nomor.id)} />
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
                              placeholder={
                                isExpired ? "Nomor expired, akan dihapus..." : "Isi keterangan nomor ini untuk apa"
                              }
                              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm 
                              focus:outline-none focus:border-[2px] focus:border-[#efbc62] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                              onChange={(e) =>
                                setReservedNumbers((prev) =>
                                  prev.map((n) => (n.id === nomor.id ? { ...n, keterangan: e.target.value } : n))
                                )
                              }
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
                            onClick={async () => {
                              const result = await cancelNomorSurat(nomor.id, profile.id);
                              if (result.success) {
                                setReservedNumbers((prev) => {
                                  const updated = prev.filter((n) => n.id !== nomor.id);
                                  return updated.length > 0 ? updated : null;
                                });
                                notification.showSuccessToast(
                                  "Nomor Dibatalkan",
                                  `Nomor ${nomor.nomor_urut} berhasil dibatalkan`
                                );

                                if (reservedNumbers.length === 1) {
                                  handleReset();
                                }
                              } else {
                                notification.showErrorToast("Gagal Batalkan", result.error);
                              }
                            }}
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
                    onClick={handleKonfirmasiSemua}
                  >
                    Konfirmasi Semua
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="font-semibold py-2 px-6 rounded-lg transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleBatalkanSemua}
                  >
                    Batalkan Semua
                  </button>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        profile={profile}
        isAdmin={isAdmin}
        isSuperAdmin={profile?.role === "superadmin"}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={async (result) => {
          const sendAgain = await notification.confirmAction({
            type: "success",
            title: "Akun Berhasil Dibuat",
            message: result.message + "\n\nApakah pesan WhatsApp sudah terkirim?",
            confirmText: "Sudah Terkirim",
            cancelText: "Kirim Ulang",
          });

          if (!sendAgain && result.waUrl) {
            window.open(result.waUrl, "_blank");
            notification.showInfoToast("WhatsApp Dibuka", "Silakan kirim pesan ke user.");
          }
        }}
        isAdmin={isAdmin}
        isSuperAdmin={profile?.role === "superadmin"}
      />

      {/* ========== TAMBAHKAN MODAL PASSWORD DI SINI ========== */}
      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={profile}
        user={user}
        isAdmin={isAdmin}
      />

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => {
          setShowPasswordWarning(false);
          notification.showSuccessToast("Sukses!", "Password berhasil diubah. Akun Anda kini lebih aman.");
        }}
        currentUser={user}
      />
      {/* Nomor Lama Modal */}
      <NomorLamaModal
        isOpen={showNomorLamaModal}
        onClose={() => setShowNomorLamaModal(false)}
        onReserveSuccess={(nomorData) => {
          // Gabungkan dengan reservedNumbers existing (jika ada)
          setReservedNumbers((prev) => {
            if (prev && prev.length > 0) {
              return [...prev, ...nomorData];
            }
            return nomorData;
          });
        }}
        userId={profile?.id}
        notification={notification}
      />

      {/* Rekap Modal */}
      <RekapModal
        isOpen={showRekapModal}
        onClose={() => setShowRekapModal(false)}
        notification={notification}
        isAdmin={isAdmin}
        userId={profile?.id}
      />

      {/* User List Modal */}
      <UserListModal
        isOpen={showUserListModal}
        onClose={() => setShowUserListModal(false)}
        notification={notification}
      />
    </div>
  );
}
