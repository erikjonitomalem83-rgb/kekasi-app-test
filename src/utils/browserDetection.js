/**
 * Detect browser type
 */
export function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('firefox')) {
    return { name: 'Firefox', blocked: true };
  } else if (userAgent.includes('edg')) {
    return { name: 'Edge', blocked: false };
  } else if (userAgent.includes('chrome')) {
    return { name: 'Chrome', blocked: false };
  } else if (userAgent.includes('safari')) {
    return { name: 'Safari', blocked: true };
  } else if (userAgent.includes('opera') || userAgent.includes('opr')) {
    return { name: 'Opera', blocked: true };
  } else {
    return { name: 'Unknown', blocked: true };
  }
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