import { useState, useEffect, useCallback } from "react";
import {
  checkLockStatus,
  subscribeToLockStatus,
  acquireLock as serviceAcquireLock,
  releaseLock as serviceReleaseLock,
  forceReleaseLock as serviceForceReleaseLock,
} from "../services/lockService";
import { useNotification } from "../components/common/Notification";

export function useDashboardLocks(profileId, profileName) {
  const notification = useNotification();
  const [lockStatus, setLockStatus] = useState({
    isLocked: false,
    lockedBy: null,
    lockedByUserId: null,
    lockedAt: null,
  });
  const [hasLock, setHasLock] = useState(false);

  const loadLockStatus = useCallback(async () => {
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
        const diffMinutes = (now - lockTime) / 1000 / 60;

        if (diffMinutes > 2) {
          console.log(`[useDashboardLocks] Lock timeout detected (${diffMinutes.toFixed(1)}m), force releasing...`);
          const forceResult = await serviceForceReleaseLock();
          if (forceResult.success) {
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
  }, [notification]);

  useEffect(() => {
    loadLockStatus();

    const channel = subscribeToLockStatus((newLockData) => {
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

    const interval = setInterval(loadLockStatus, 5000);

    return () => {
      if (channel) channel.unsubscribe();
      clearInterval(interval);
    };
  }, [loadLockStatus]);

  const acquireLock = useCallback(async () => {
    const result = await serviceAcquireLock(profileId, profileName);
    if (result.success) {
      setHasLock(true);
      return { success: true };
    }
    return result;
  }, [profileId, profileName]);

  const releaseLock = useCallback(async () => {
    const result = await serviceReleaseLock(profileId);
    if (result.success) {
      setHasLock(false);
    }
    return result;
  }, [profileId]);

  const forceReleaseLock = useCallback(async () => {
    return await serviceForceReleaseLock();
  }, []);

  return {
    lockStatus,
    hasLock,
    setHasLock,
    acquireLock,
    releaseLock,
    forceReleaseLock,
    refreshLockStatus: loadLockStatus,
  };
}
