import { useCountdown } from "../../hooks/useCountdown";
import { useEffect, useRef, useState } from "react";
import { playAlertSound, playTenSecondSound, playThreeSecondSound, vibrateAlert } from "../../utils/soundAlert";

export default function CountdownTimer({ expiredAt, onExpired }) {
  const { minutes, seconds, isExpired } = useCountdown(expiredAt);
  const hasPlayed1Min = useRef(false);
  const hasPlayed30Sec = useRef(false);
  const hasPlayed10Sec = useRef(false);
  const hasPlayedExpired = useRef(false);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    // Beep saat 1 menit
    if (minutes === 1 && seconds === 0 && !hasPlayed1Min.current) {
      playAlertSound();
      vibrateAlert();
      hasPlayed1Min.current = true;

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 500);

      console.log("1 minute warning!");
    }

    // Beep saat 30 detik
    if (minutes === 0 && seconds === 30 && !hasPlayed30Sec.current) {
      playAlertSound();
      vibrateAlert();
      hasPlayed30Sec.current = true;

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 500);

      console.log("30 seconds warning!");
    }

    // Play 10 second countdown sound
    if (minutes === 0 && seconds === 10 && !hasPlayed10Sec.current) {
      playTenSecondSound();
      vibrateAlert();
      hasPlayed10Sec.current = true;

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 500);

      console.log("10 second countdown started!");
    }

    // Play 3 second sound saat expired
    if (isExpired && !hasPlayedExpired.current) {
      playThreeSecondSound(); // Play audio 3 detik
      vibrateAlert();
      hasPlayedExpired.current = true;

      setIsFlashing(true);

      console.log("EXPIRED!");

      if (onExpired) {
        onExpired();
      }
    }

    // Cleanup
    return () => {
      console.log("CountdownTimer cleanup");
    };
  }, [minutes, seconds, isExpired, onExpired]);

  // Tentukan warna berdasarkan sisa waktu
  const getColorClass = () => {
    if (isExpired) return "text-red-600 bg-red-50 border-red-300";
    if (minutes < 2) return "text-orange-600 bg-orange-50 border-orange-300";
    return "text-blue-600 bg-blue-50 border-blue-300";
  };

  // Format angka dengan leading zero
  const pad = (num) => String(num).padStart(2, "0");

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono text-xs font-bold transition-all duration-200 ${getColorClass()} ${
        isFlashing ? "scale-105 shadow-md" : ""
      }`}
    >
      {isExpired ? (
        <>
          <span className="text-base">⏰</span>
          <span>EXPIRED</span>
        </>
      ) : (
        <>
          <span className="text-base">⏱️</span>
          <span>
            {pad(minutes)}:{pad(seconds)}
          </span>
        </>
      )}
    </div>
  );
}
