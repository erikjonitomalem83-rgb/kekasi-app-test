import { useEffect } from "react";
import { validateSession, subscribeToSessionChanges, cleanupSessionChannel } from "../services/sessionService";
import { useNotification } from "../components/common/Notification";

export function useSessionMonitor(profileId, reservedNumbersCount, onForceLogout) {
  const notification = useNotification();

  useEffect(() => {
    if (!profileId) return;

    const checkSession = async () => {
      if (window.isLoggingOut || !profileId) return;

      const kekasiAuth = localStorage.getItem("kekasi-auth");
      if (!kekasiAuth) return;

      const result = await validateSession(profileId);
      if (!result.valid) {
        console.log("[useSessionMonitor] Invalid session detected, forcing logout...");
        if (!window.isLoggingOut) {
          notification.showWarningToast(
            "Sesi Tidak Valid",
            "Akun Anda telah login dari perangkat lain. Anda akan logout otomatis.",
            5000
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        if (onForceLogout) await onForceLogout(true);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 5000);
    window.sessionCheckInterval = interval;

    return () => {
      clearInterval(interval);
      if (window.sessionCheckInterval === interval) {
        window.sessionCheckInterval = null;
      }
    };
  }, [profileId, notification, onForceLogout]);

  useEffect(() => {
    if (!profileId) return;

    console.log("[useSessionMonitor] Setting up realtime session monitor for user:", profileId);
    let forceLogoutTriggered = false;

    const handleForceLogout = async () => {
      if (forceLogoutTriggered || window.isLoggingOut) return;
      forceLogoutTriggered = true;

      console.log("[useSessionMonitor] Force logout detected via Realtime");

      if (reservedNumbersCount > 0) {
        notification.showWarningToast(
          "Login dari Perangkat Lain",
          `Akun Anda telah login dari perangkat lain.\n\n${reservedNumbersCount} nomor yang Anda pesan akan dibatalkan otomatis.\n\nSesi ini akan diakhiri.`,
          6000
        );
      } else {
        notification.showWarningToast(
          "Login dari Perangkat Lain",
          "Akun Anda telah login dari perangkat/browser lain. Sesi ini akan diakhiri.",
          5000
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (onForceLogout) await onForceLogout(true);
    };

    const channel = subscribeToSessionChanges(profileId, handleForceLogout);

    return () => {
      console.log("[useSessionMonitor] Cleaning up realtime session monitor");
      if (channel) channel.unsubscribe();
      cleanupSessionChannel();
    };
  }, [profileId, reservedNumbersCount, notification, onForceLogout]);
}
