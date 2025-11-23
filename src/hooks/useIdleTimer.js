import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook untuk auto-logout setelah idle
 * @param {number} idleTime - Waktu idle dalam milidetik (default: 30 menit)
 * @param {number} warningTime - Waktu warning sebelum logout dalam milidetik (default: 2 menit)
 * @param {function} onWarning - Callback saat warning muncul
 * @param {function} onLogout - Callback saat auto-logout
 * @param {boolean} hasReservedNumbers - Apakah user punya nomor reserved
 * @param {number} extendedIdleTime - Waktu idle extended saat ada nomor reserved (default: 45 menit)
 */
export function useIdleTimer(
  idleTime = 30 * 60 * 1000,
  warningTime = 2 * 60 * 1000,
  onWarning,
  onLogout,
  hasReservedNumbers = false,
  extendedIdleTime = 45 * 60 * 1000
) {
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningShownRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    warningShownRef.current = false;

    const activeIdleTime = hasReservedNumbers ? extendedIdleTime : idleTime;
    const timeUntilWarning = activeIdleTime - warningTime;

    warningTimerRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        if (onWarning) {
          onWarning();
        }
      }
    }, timeUntilWarning);

    idleTimerRef.current = setTimeout(() => {
      if (onLogout) {
        onLogout();
      }
    }, activeIdleTime);

    const minutes = Math.floor(activeIdleTime / 60000);
    console.log(`[IdleTimer] Timer set to ${minutes} minutes (hasReservedNumbers: ${hasReservedNumbers})`);
  }, [idleTime, warningTime, onWarning, onLogout, hasReservedNumbers, extendedIdleTime]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keypress", "keydown", "scroll", "touchstart", "click"];

    let throttleTimeout = null;
    const throttledReset = () => {
      if (!throttleTimeout) {
        resetTimer();
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 1000);
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledReset);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledReset);
      });

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [resetTimer]);

  return { resetTimer };
}
