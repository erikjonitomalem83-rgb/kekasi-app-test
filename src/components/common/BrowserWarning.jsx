import { useState, useEffect } from "react";
import { detectBrowser } from "../../utils/browserDetection";

export default function BrowserWarning() {
  const [show, setShow] = useState(false);
  const [browser, setBrowser] = useState(null);

  useEffect(() => {
    const detected = detectBrowser();
    if (detected.blocked) {
      setBrowser(detected);
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-6 py-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-bold text-lg">⛔ Browser {browser?.name} Tidak Direkomendasikan</p>
            <p className="text-sm">
              Browser Anda menyebabkan masalah performa dan dapat mengganggu pengguna lain. Silakan gunakan{" "}
              <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Download Chrome
          </a>
          <button onClick={() => setShow(false)} className="text-white hover:text-gray-200 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
