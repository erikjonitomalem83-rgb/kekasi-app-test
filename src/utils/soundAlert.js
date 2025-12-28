// ============================================
// AUDIO SYSTEM - File Based (More Reliable)
// ============================================

class AudioManager {
  constructor() {
    this.sounds = {
      alert: null,
      oneMinute: null,
      tenSecond: null,
      threeSecond: null,
    };
    this.isUnlocked = false;
  }

  /**
   * Preload semua audio files
   */
  preloadSounds() {
    try {
      const loadSound = (path, name) => {
        const audio = new Audio(path);
        audio.volume = 0.5;
        audio.loop = false; // FORCE disable loop
        audio.preload = "auto";

        // Error handler
        audio.addEventListener("error", (e) => {
          console.warn(`Failed to load ${path}:`, e);
        });

        // Auto stop setelah selesai play
        audio.addEventListener("ended", () => {
          console.log(`${name} finished playing`);
          audio.currentTime = 0;
        });

        // Debug loaded
        audio.addEventListener("loadeddata", () => {
          console.log(`${name} loaded successfully (${audio.duration.toFixed(2)}s)`);
        });

        return audio;
      };

      this.sounds.alert = loadSound("/sounds/beep.mp3", "Alert");
      this.sounds.tenSecond = loadSound("/sounds/10second.mp3", "TenSecond");
      this.sounds.threeSecond = loadSound("/sounds/3second.mp3", "ThreeSecond");

      console.log("Audio files preloaded successfully");
    } catch (error) {
      console.error("Failed to preload sounds:", error);
    }
  }

  /**
   * Unlock audio (panggil saat user click)
   */
  unlock() {
    if (this.isUnlocked) return;

    // Preload sounds jika belum
    if (!this.sounds.alert) {
      this.preloadSounds();
    }

    // Play silent sound untuk unlock browser audio
    if (this.sounds.alert) {
      const originalVolume = this.sounds.alert.volume;
      this.sounds.alert.volume = 0.01;
      this.sounds.alert
        .play()
        .then(() => {
          this.sounds.alert.pause();
          this.sounds.alert.currentTime = 0;
          this.sounds.alert.volume = originalVolume;
          this.isUnlocked = true;
          console.log("Audio unlocked successfully!");
        })
        .catch((error) => {
          console.warn("Audio unlock failed:", error);
        });
    }
  }

  /**
   * Play alert beep (1 menit & 30 detik)
   */
  playAlert() {
    if (!this.isUnlocked || !this.sounds.alert) {
      console.warn("Audio not ready");
      return;
    }

    try {
      // PENTING: Stop audio jika masih playing
      this.sounds.alert.pause();
      this.sounds.alert.currentTime = 0;

      // Disable loop (just in case)
      this.sounds.alert.loop = false;

      // Play once
      const playPromise = this.sounds.alert.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Alert beep played");
          })
          .catch((error) => {
            console.error("Failed to play alert:", error);
          });
      }
    } catch (error) {
      console.error("Error playing alert:", error);
    }
  }

  /**
   * Play urgent beep (10 detik terakhir)
   */
  playUrgent() {
    if (!this.isUnlocked || !this.sounds.urgent) {
      console.warn("Audio not ready");
      return;
    }

    try {
      // Stop audio jika masih playing
      this.sounds.urgent.pause();
      this.sounds.urgent.currentTime = 0;
      this.sounds.urgent.loop = false;

      const playPromise = this.sounds.urgent.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Urgent beep played");
          })
          .catch((error) => {
            console.error("Failed to play urgent:", error);
          });
      }
    } catch (error) {
      console.error("Error playing urgent:", error);
    }
  }

  /**
   * Play expired beep (triple beep)
   */
  playExpired() {
    if (!this.isUnlocked || !this.sounds.expired) {
      console.warn("Audio not ready");
      return;
    }

    try {
      // Stop audio jika masih playing
      this.sounds.expired.pause();
      this.sounds.expired.currentTime = 0;
      this.sounds.expired.loop = false;

      const playPromise = this.sounds.expired.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Expired beep played");
          })
          .catch((error) => {
            console.error("Failed to play expired:", error);
          });
      }
    } catch (error) {
      console.error("Error playing expired:", error);
    }
  }

  /**
   * Play 10 second countdown sound
   */
  playTenSecond() {
    if (!this.isUnlocked || !this.sounds.tenSecond) {
      console.warn("TenSecond audio not ready");
      return;
    }

    try {
      this.sounds.tenSecond.pause();
      this.sounds.tenSecond.currentTime = 0;
      this.sounds.tenSecond.loop = false;

      const playPromise = this.sounds.tenSecond.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("10 second countdown sound started");
          })
          .catch((error) => {
            console.error("Failed to play 10second sound:", error);
          });
      }
    } catch (error) {
      console.error("Error playing 10second:", error);
    }
  }

  /**
   * Play 3 second expired sound
   */
  playThreeSecond() {
    if (!this.isUnlocked || !this.sounds.threeSecond) {
      console.warn("ThreeSecond audio not ready");
      return;
    }

    try {
      this.sounds.threeSecond.pause();
      this.sounds.threeSecond.currentTime = 0;
      this.sounds.threeSecond.loop = false;

      const playPromise = this.sounds.threeSecond.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("3 second expired sound started");
          })
          .catch((error) => {
            console.error("Failed to play 3second sound:", error);
          });
      }
    } catch (error) {
      console.error("Error playing 3second:", error);
    }
  }

  /**
   * Stop all playing sounds (emergency)
   */
  stopAll() {
    try {
      Object.values(this.sounds).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      console.log("All sounds stopped");
    } catch (error) {
      console.error("Error stopping sounds:", error);
    }
  }
}

// Singleton instance
const audioManager = new AudioManager();

// Export functions
export function unlockAudio() {
  audioManager.unlock();
}

export function playAlertSound() {
  audioManager.playAlert();
}

export function playTenSecondSound() {
  audioManager.playTenSecond();
}

export function playThreeSecondSound() {
  audioManager.playThreeSecond();
}

export function stopAllSounds() {
  audioManager.stopAll();
}

/**
 * Vibrate phone (mobile only)
 */
export function vibrateAlert() {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}
