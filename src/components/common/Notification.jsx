import React, { createContext, useContext, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import "./Notification.css";

// Icons SVG (sama seperti vanilla JS)
const icons = {
  success: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  error: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  ),
  warning: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  info: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  ),
  close: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
};

// Context untuk Notification
// Context untuk Notification
const NotificationContext = createContext();

const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

// Toast Component
const Toast = ({ id, type, title, message, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div className={`notification-toast ${type} ${isExiting ? "exiting" : ""}`}>
      <div className="notification-toast-icon">{icons[type]}</div>
      <div className="notification-toast-content">
        <h4 className="notification-toast-title">{title}</h4>
        {message && <p className="notification-toast-message">{message}</p>}
      </div>
      <button className="notification-toast-close" onClick={handleClose} aria-label="Tutup notifikasi">
        {icons.close}
      </button>
    </div>
  );
};

// Modal Component
const Modal = ({
  type,
  title,
  message,
  confirmText,
  cancelText,
  alternateText,
  onConfirm,
  onCancel,
  onAlternate,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Map "danger" type ke "error" untuk icon consistency
  const iconType = type === "danger" ? "error" : type;

  const handleCancel = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onCancel) onCancel();
      onClose();
    }, 200);
  };

  const handleAlternate = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onAlternate) onAlternate();
      onClose();
    }, 200);
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsProcessing(true);
      try {
        await onConfirm();
        setIsExiting(true);
        setTimeout(() => {
          onClose();
        }, 200);
      } catch (error) {
        console.error("Error in modal confirmation:", error);
        setIsProcessing(false);
      }
    } else {
      handleCancel();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return ReactDOM.createPortal(
    <div className={`notification-modal-backdrop ${isExiting ? "exiting" : ""}`} onClick={handleBackdropClick}>
      <div className="notification-modal">
        <div className={`notification-modal-header ${type}`}>
          <div className="notification-modal-header-icon">{icons[iconType]}</div>
          <h3 className="notification-modal-header-title">{title}</h3>
        </div>
        <div className="notification-modal-body">
          <div className={`notification-modal-body-icon-wrapper ${type === "danger" ? "error" : type}`}>
            <div className="notification-modal-body-icon">{icons[iconType]}</div>
          </div>
          <div className="notification-modal-body-content">
            <p className="notification-modal-message">{message}</p>
          </div>
        </div>
        <div className="notification-modal-footer">
          <button
            className={`notification-modal-button notification-modal-button-confirm ${type}`}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? "Memproses..." : confirmText}
          </button>

          {alternateText && (
            <button
              className="notification-modal-button notification-modal-button-alternate"
              onClick={handleAlternate}
              disabled={isProcessing}
            >
              {alternateText}
            </button>
          )}

          <button
            className="notification-modal-button notification-modal-button-cancel"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Loading Component
const LoadingOverlay = ({ message, progress }) => {
  return ReactDOM.createPortal(
    <div className="notification-loading-backdrop">
      <div className="notification-loading-modal">
        <div className="notification-loading-spinner"></div>
        <h3 className="notification-loading-title">Mohon Tunggu</h3>
        <p className="notification-loading-message">{message}</p>
        <div className="notification-progress-bar-container">
          <div className="notification-progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Provider Component
const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(null);
  // ... dst

  // removeToast
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Toast functions
  const showToast = useCallback(
    (options) => {
      const { type = "info", title, message, duration = 5000 } = options;

      // ✅ CRITICAL: Check duplicate toast dengan message yang sama
      setToasts((prev) => {
        // Cek apakah sudah ada toast dengan message yang persis sama
        const isDuplicate = prev.some(
          (toast) => toast.message === message && toast.title === title && toast.type === type
        );

        if (isDuplicate) {
          console.log("[Notification] Duplicate toast prevented:", { title, message });
          return prev; // ← Skip, tidak tambah toast baru
        }

        const id = Date.now() + Math.random(); // ← Tambah random untuk prevent collision

        // Tambah toast baru
        const newToast = { id, type, title, message };

        // Schedule removal
        if (duration > 0) {
          setTimeout(() => {
            removeToast(id);
          }, duration);
        }

        console.log("[Notification] Toast added:", { id, title, message });
        return [...prev, newToast];
      });

      return Date.now(); // Return timestamp sebagai ID
    },
    [removeToast]
  );

  const showSuccessToast = useCallback(
    (title, message, duration = 5000) => {
      return showToast({ type: "success", title, message, duration });
    },
    [showToast]
  );

  const showErrorToast = useCallback(
    (title, message, duration = 5000) => {
      return showToast({ type: "error", title, message, duration });
    },
    [showToast]
  );

  const showWarningToast = useCallback(
    (title, message, duration = 5000) => {
      return showToast({ type: "warning", title, message, duration });
    },
    [showToast]
  );

  const showInfoToast = useCallback(
    (title, message, duration = 5000) => {
      return showToast({ type: "info", title, message, duration });
    },
    [showToast]
  );

  // Modal functions
  const showModal = useCallback((options) => {
    const {
      type = "info",
      title,
      message,
      confirmText = "Konfirmasi",
      cancelText = "Batal",
      alternateText,
      onConfirm,
      onCancel,
      onAlternate,
    } = options;

    setModal({
      type,
      title,
      message,
      confirmText,
      cancelText,
      alternateText,
      onConfirm,
      onCancel,
      onAlternate,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const confirmAction = useCallback(
    (options) => {
      return new Promise((resolve) => {
        showModal({
          ...options,
          onConfirm: async () => {
            if (options.onConfirm) {
              await options.onConfirm();
            }
            resolve(true); // Backward compatible
          },
          onCancel: () => {
            if (options.onCancel) {
              options.onCancel();
            }
            resolve(false); // Backward compatible
          },
          onAlternate: () => {
            if (options.onAlternate) {
              options.onAlternate();
            }
            resolve(false);
          },
        });
      });
    },
    [showModal]
  );

  const confirmChoice = useCallback(
    (options) => {
      return new Promise((resolve) => {
        showModal({
          ...options,
          onConfirm: async () => {
            if (options.onConfirm) {
              await options.onConfirm();
            }
            resolve("confirmed");
          },
          onCancel: () => {
            if (options.onCancel) {
              options.onCancel();
            }
            resolve("cancelled");
          },
          onAlternate: () => {
            if (options.onAlternate) {
              options.onAlternate();
            }
            resolve("alternate");
          },
        });
      });
    },
    [showModal]
  );

  // Loading functions
  const showLoadingOverlay = useCallback((message = "Memproses...") => {
    setLoading({ message, progress: 0 });
  }, []);

  const hideLoadingOverlay = useCallback(() => {
    setLoading(null);
  }, []);

  const updateProgressBar = useCallback((percentage) => {
    setLoading((prev) => (prev ? { ...prev, progress: Math.min(Math.max(percentage, 0), 100) } : null));
  }, []);

  const value = {
    showToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    showModal,
    confirmAction,
    confirmChoice,
    showLoadingOverlay,
    hideLoadingOverlay,
    updateProgressBar,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="notification-toast-container">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={removeToast} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && <Modal {...modal} onClose={closeModal} />}

      {/* Loading Overlay */}
      {loading && <LoadingOverlay {...loading} />}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { NotificationProvider, useNotification };
