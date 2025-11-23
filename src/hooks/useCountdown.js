import { useState, useEffect } from "react";

/**
 * Custom hook untuk countdown timer
 * @param {string} targetDate - ISO string waktu target
 * @returns {object} - { minutes, seconds, isExpired }
 */
export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const difference = new Date(targetDate) - new Date();

      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        minutes,
        seconds,
        isExpired: false,
      });
    };

    // Hitung immediately
    calculateTimeLeft();

    // Update setiap 1 detik
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
