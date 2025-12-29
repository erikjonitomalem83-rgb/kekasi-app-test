import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { useNotification } from "../components/common/Notification";

// Hooks
import { useDashboardLocks } from "../hooks/useDashboardLocks";
import { useSessionMonitor } from "../hooks/useSessionMonitor";
import { useReservedNumbers } from "../hooks/useReservedNumbers";
import { useIdleTimer } from "../hooks/useIdleTimer";

// Components
import DashboardHeader from "../components/dashboard/DashboardHeader";
import AdminEmergencyPool from "../components/dashboard/AdminEmergencyPool";
import NomorSuratForm from "../components/dashboard/NomorSuratForm";
import ReservedNumbersList from "../components/dashboard/ReservedNumbersList";

// Modals
import CreateUserModal from "../components/common/CreateUserModal";
import ChangePasswordModal from "../components/common/ChangePasswordModal";
import ProfileModal from "../components/common/ProfileModal";
import HistoryModal from "../components/common/HistoryModal";
import NomorLamaModal from "../components/common/NomorLamaModal";
import RekapModal from "../components/common/RekapModal";
import UserListModal from "../components/common/UserListModal";
import ConfirmationResumeModal from "../components/common/ConfirmationResumeModal";

// Utils & Services
import { logout as authLogout } from "../services/authService";
import { cleanupOnLogout } from "../services/lockService";
import { cancelNomorSurat } from "../services/nomorSuratService";
import { supabase } from "../services/supabase";

export default function Dashboard() {
  const { profile, user, isAdmin } = useAuth();
  const { logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const notification = useNotification();

  // ========== STATES FOR MODALS ==========
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPasswordWarning, setShowPasswordWarning] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNomorLamaModal, setShowNomorLamaModal] = useState(false);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [showConfirmationResumeModal, setShowConfirmationResumeModal] = useState(false);
  const [idleWarningShown, setIdleWarningShown] = useState(false);

  // ========== FORM STATE ==========
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

  // ========== HOOKS ==========
  const { lockStatus, hasLock, setHasLock, acquireLock, releaseLock } = useDashboardLocks(
    profile?.id,
    profile?.nama_lengkap
  );

  const {
    reservedNumbers,
    setReservedNumbers,
    expiredIds,
    adminPool,
    setAdminPool,
    adminPoolSchedule,
    edgeFunctionLogs,
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
  } = useReservedNumbers(profile, isAdmin);

  const handleLogoutRef = useRef();

  const handleLogout = useCallback(
    async (skipConfirm = false) => {
      window.isLoggingOut = true;
      if (window.sessionCheckInterval) {
        clearInterval(window.sessionCheckInterval);
        window.sessionCheckInterval = null;
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

      try {
        if (hasLock || lockStatus.lockedByUserId === profile?.id) {
          await cleanupOnLogout(profile.id);
          setHasLock(false);
        }

        if (reservedNumbers && reservedNumbers.length > 0) {
          const cancelPromises = reservedNumbers.map((n) => cancelNomorSurat(n.id, profile.id));
          await Promise.allSettled(cancelPromises);
        }

        const logoutResult = await authLogout();
        if (logoutResult.success) {
          clearAuth();
          navigate("/login", { replace: true });
        } else {
          clearAuth();
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("[Dashboard] Logout fatal error:", error);
        clearAuth();
        navigate("/login", { replace: true });
      } finally {
        window.isLoggingOut = false;
      }
    },
    [profile, notification, hasLock, lockStatus.lockedByUserId, reservedNumbers, clearAuth, navigate, setHasLock]
  );

  handleLogoutRef.current = handleLogout;

  useSessionMonitor(profile?.id, reservedNumbers?.length || 0, handleLogoutRef.current);

  // ========== EFFECTS ==========
  useEffect(() => {
    if (profile?.password === "Password123!") setShowPasswordWarning(true);
  }, [profile]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminPool(
        formData.kodeKanwil,
        formData.kodeUPT,
        formData.kodeMasalah,
        formData.subMasalah1,
        formData.subMasalah2
      );
      loadEdgeFunctionLogs();
      loadAdminPoolSchedule();
    }
  }, [isAdmin, formData, loadAdminPool, loadEdgeFunctionLogs, loadAdminPoolSchedule]);

  // ========== HANDLERS ==========
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.kodeKanwil.trim()) errors.kodeKanwil = "Wajib diisi";
    if (!formData.kodeUPT.trim()) errors.kodeUPT = "Wajib diisi";
    if (!formData.kodeMasalah.trim() || formData.kodeMasalah.length !== 2) errors.kodeMasalah = "Harus 2 huruf";
    if (!formData.subMasalah1.trim() || formData.subMasalah1.length !== 2) errors.subMasalah1 = "Harus 2 angka";
    if (formData.jumlahNomor < 1 || formData.jumlahNomor > 50) errors.jumlahNomor = "1-50 nomor";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    await reserveNumbers(formData, acquireLock, releaseLock);
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

  const onConfirmAll = async () => {
    const success = await confirmAll();
    if (success) {
      handleReset();
      setShowConfirmationResumeModal(true);
    }
  };

  const onCancelNomor = async (nomor) => {
    const result = await cancelNomorSurat(nomor.id, profile.id);
    if (result.success) {
      setReservedNumbers((prev) => {
        const updated = prev.filter((n) => n.id !== nomor.id);
        return updated.length > 0 ? updated : null;
      });
      notification.showSuccessToast("Dibatalkan", `Nomor ${nomor.nomor_urut} dibatalkan`);
      if (reservedNumbers.length === 1) handleReset();
    } else {
      notification.showErrorToast("Gagal", result.error);
    }
  };

  const onKeteranganChange = (id, value) => {
    setReservedNumbers((prev) => prev.map((n) => (n.id === id ? { ...n, keterangan: value } : n)));
  };

  const handleAmbilEmergency = async () => {
    if (adminPool.length === 0) return notification.showWarningToast("Kosong", "Tidak ada nomor emergency!");
    const keterangan = prompt(`Masukkan keterangan untuk nomor ${adminPool[0].nomor_urut}:`);
    if (!keterangan) return;

    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Ambil Emergency?",
      message: `Nomor: ${adminPool[0].nomor_urut}\nKeterangan: ${keterangan}`,
      confirmText: "Ya, Ambil",
      cancelText: "Batal",
    });

    if (!confirmed) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("nomor_surat")
        .update({
          user_id: profile.id,
          keterangan: `[EMERGENCY] ${keterangan}`,
          confirmed_at: new Date().toISOString(),
          status: "confirmed",
        })
        .eq("id", adminPool[0].id);
      if (error) throw error;

      await supabase.from("history_log").insert({
        nomor_id: adminPool[0].id,
        user_id: profile.id,
        action: "confirm_emergency",
        timestamp: new Date().toISOString(),
      });

      setAdminPool((prev) => prev.filter((n) => n.id !== adminPool[0].id));
      notification.showSuccessToast("Berhasil", `Nomor ${adminPool[0].nomor_urut} berhasil diambil.`);
    } catch (error) {
      notification.showErrorToast("Gagal", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGeneratePoolManual = async () => {
    const confirmed = await notification.confirmAction({
      type: "warning",
      title: "Generate Pool Manual?",
      message: "Jalankan edge function untuk generate nomor emergency?",
      confirmText: "Ya, Generate",
      cancelText: "Batal",
    });
    if (!confirmed) return;
    setIsSubmitting(true);
    notification.showLoadingOverlay("Menjalankan edge function...");
    try {
      const { data, error } = await supabase.functions.invoke("auto-reserve-admin-pool", { body: { force: true } });
      notification.hideLoadingOverlay();
      if (error) throw error;
      if (data.success) {
        notification.showSuccessToast("Berhasil", "Halaman akan direload...");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        notification.showWarningToast("Gagal", data.message);
      }
    } catch (error) {
      notification.hideLoadingOverlay();
      notification.showErrorToast("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== IDLE TIMER ==========
  const handleIdleWarning = useCallback(async () => {
    if (idleWarningShown) return;
    setIdleWarningShown(true);
    const stayLoggedIn = await notification.confirmAction({
      type: "warning",
      title: "Peringatan Idle",
      message: `Anda tidak aktif selama 30-45 menit. Klik 'Tetap Login' untuk melanjutkan.`,
      confirmText: "Tetap Login",
      cancelText: "Logout",
    });
    if (stayLoggedIn) setIdleWarningShown(false);
    else await handleLogout(true);
  }, [idleWarningShown, notification, handleLogout]);

  const handleAutoLogout = useCallback(async () => {
    notification.showWarningToast("Auto Logout", "Anda logout otomatis karena idle.");
    await handleLogout(true);
  }, [notification, handleLogout]);

  useIdleTimer(30 * 60 * 1000, 2 * 60 * 1000, handleIdleWarning, handleAutoLogout, reservedNumbers?.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 -mt-8">
      <DashboardHeader
        profile={profile}
        isAdmin={isAdmin}
        isSuperAdmin={profile?.role === "superadmin"}
        isSubmitting={isSubmitting}
        onShowRekap={() => setShowRekapModal(true)}
        onShowHistory={() => setShowHistoryModal(true)}
        onShowCreateUser={() => setShowCreateUserModal(true)}
        onShowUserList={() => setShowUserListModal(true)}
        onCleanExpired={cleanExpired}
        onShowProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-4 md:px-6 py-4">
        {showPasswordWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-yellow-700 font-medium">
                Password default terdeteksi! Segera ganti password Anda.
              </p>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-bold text-sm"
            >
              Ganti
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-6">
          <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-green-100 text-center">
            <p className="text-[10px] md:text-xs text-gray-500 font-medium mb-0.5">Status</p>
            <p className="text-[12px] md:text-sm font-bold text-green-600">Aktif</p>
          </div>
          <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-blue-100 text-center">
            <p className="text-[10px] md:text-xs text-gray-500 font-medium mb-0.5">Role</p>
            <p className="text-[12px] md:text-sm font-bold text-blue-600">{profile?.role}</p>
          </div>
          <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-indigo-100 text-center">
            <p className="text-[10px] md:text-xs text-gray-500 font-medium mb-0.5">Seksi</p>
            <p className="text-[10px] md:text-xs font-bold text-indigo-600 capitalize break-words">{profile?.seksi}</p>
          </div>
        </div>

        <AdminEmergencyPool
          isAdmin={isAdmin}
          adminPool={adminPool}
          adminPoolSchedule={adminPoolSchedule}
          edgeFunctionLogs={edgeFunctionLogs}
          isSubmitting={isSubmitting}
          onAmbilEmergency={handleAmbilEmergency}
          onGeneratePoolManual={onGeneratePoolManual}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <NomorSuratForm
            formData={formData}
            formErrors={formErrors}
            isSubmitting={isSubmitting}
            reservedNumbers={reservedNumbers}
            lockStatus={lockStatus}
            profile={profile}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onShowNomorLama={() => setShowNomorLamaModal(true)}
            onReset={handleReset}
          />

          <ReservedNumbersList
            reservedNumbers={reservedNumbers}
            expiredIds={expiredIds}
            isSubmitting={isSubmitting}
            onKonfirmasiSemua={onConfirmAll}
            onBatalkanSemua={cancelAll}
            onNomorExpired={handleNomorExpired}
            onCancelNomor={onCancelNomor}
            onKeteranganChange={onKeteranganChange}
          />
        </div>
      </main>

      {/* Modals */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        profile={profile}
        isAdmin={isAdmin}
        isSuperAdmin={profile?.role === "superadmin"}
      />
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={(result) => {
          notification.showSuccessToast("Berhasil", result.message);
        }}
        isSuperAdmin={profile?.role === "superadmin"}
      />
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
        onSuccess={() => setShowPasswordWarning(false)}
        currentUser={user}
      />
      <NomorLamaModal
        isOpen={showNomorLamaModal}
        onClose={() => setShowNomorLamaModal(false)}
        onReserveSuccess={(data) => setReservedNumbers((prev) => (prev ? [...prev, ...data] : data))}
        userId={profile?.id}
        notification={notification}
      />
      <RekapModal
        isOpen={showRekapModal}
        onClose={() => setShowRekapModal(false)}
        notification={notification}
        isAdmin={isAdmin}
        userId={profile?.id}
      />
      <UserListModal
        isOpen={showUserListModal}
        onClose={() => setShowUserListModal(false)}
        notification={notification}
      />
      <ConfirmationResumeModal
        isOpen={showConfirmationResumeModal}
        onClose={() => setShowConfirmationResumeModal(false)}
        confirmedNumbers={confirmedNumbersData}
      />
    </div>
  );
}
