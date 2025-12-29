/**
 * Detect browser type
 */
export function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  const hostname = window.location.hostname;

  // Whitelist localhost for development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { name: "Localhost", blocked: false };
  }

  // Priority check to avoid overlap (most browsers include 'safari' in UA)
  // Check Edge first
  if (userAgent.includes("edg/")) {
    return { name: "Edge", blocked: false };
  }

  // Check Chrome (including mobile Chrome 'crios')
  if (userAgent.includes("chrome") || userAgent.includes("crios")) {
    return { name: "Chrome", blocked: false };
  }

  // Check Firefox
  if (userAgent.includes("firefox") || userAgent.includes("fxios")) {
    return { name: "Firefox", blocked: false };
  }

  // Pure Safari check
  if (
    userAgent.includes("safari") &&
    !userAgent.includes("chrome") &&
    !userAgent.includes("crios") &&
    !userAgent.includes("edg")
  ) {
    return { name: "Safari", blocked: false };
  }

  if (userAgent.includes("opera") || userAgent.includes("opr")) {
    return { name: "Opera", blocked: false };
  }

  return { name: "Unknown", blocked: false };
}

/**
 * Check if current browser is allowed
 */
export function isAllowedBrowser() {
  const browser = detectBrowser();
  return !browser.blocked;
}

/**
 * Get browser info message
 */
export function getBrowserMessage() {
  const browser = detectBrowser();

  if (browser.blocked) {
    return {
      title: `Browser ${browser.name} Tidak Didukung`,
      message: `Sistem KEKASI tidak mendukung ${browser.name}.\n\nSilakan gunakan:\n✅ Google Chrome (Recommended)\n✅ Microsoft Edge\n\nBrowser ${browser.name} menyebabkan masalah performa yang mengganggu pengguna lain.`,
    };
  }

  return null;
}
