import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from './icons';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckIcon size={16} />,
  error: <AlertIcon size={16} />,
  warning: <AlertIcon size={16} />,
  info: <InfoIcon size={16} />,
};

const STATUS_ROLE = {
  success: 'status',
  info: 'status',
  warning: 'alert',
  error: 'alert',
};

const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className={`toast toast--${toast.variant}`} role={STATUS_ROLE[toast.variant]}>
      <span className="toast__icon">{ICONS[toast.variant]}</span>

      <div className="toast__body">
        <span className="toast__title">{toast.title}</span>
        {toast.description && <span className="toast__description">{toast.description}</span>}
      </div>

      {toast.action?.label && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            toast.action.onClick?.();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
};

/**
 * Toast notifications with an optional inline action. Only the newest four
 * are kept so a burst of events cannot bury the interface.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((options) => {
    const toast = typeof options === 'string' ? { title: options } : options || {};
    idRef.current += 1;

    const entry = {
      id: idRef.current,
      // `type`/`message` are accepted as aliases so call sites can use either
      // shape without silently rendering an empty toast.
      variant: toast.variant || toast.type || 'info',
      title: toast.title || toast.message || '',
      description: toast.description || '',
      duration: toast.duration,
      action: toast.action,
    };

    setToasts((current) => [...current.slice(-3), entry]);
    return entry.id;
  }, []);

  const value = useMemo(
    () => ({
      notify,
      dismiss,
      success: (title, description) => notify({ variant: 'success', title, description }),
      error: (title, description) => notify({ variant: 'error', title, description }),
      info: (title, description) => notify({ variant: 'info', title, description }),
      warning: (title, description) => notify({ variant: 'warning', title, description }),
    }),
    [notify, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/** Falls back to a no-op so components can be rendered outside the provider. */
const noop = () => {};

export const useToast = () => {
  const context = useContext(ToastContext);
  return (
    context || {
      notify: noop,
      dismiss: noop,
      success: noop,
      error: noop,
      info: noop,
      warning: noop,
    }
  );
};

export default ToastProvider;
