import React, { useCallback, useRef, useState } from 'react';

import { useDialog } from '../../hooks/useUi';
import { AlertIcon, CloseIcon } from './icons';

/**
 * Promise-based confirmation dialog, replacing `window.confirm`.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete channel?', tone: 'danger' })) { ... }
 *
 * Returning a promise keeps the call sites as readable as the native dialog
 * while giving us full control over copy, focus handling and styling.
 */
export const ConfirmDialog = ({ open, options, onResolve }) => {
  const { title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default' } =
    options || {};

  const handleClose = useCallback(() => onResolve(false), [onResolve]);
  const handleConfirm = useCallback(() => onResolve(true), [onResolve]);
  const containerRef = useDialog(open, handleClose);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div
        className="modal modal--sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-description' : undefined}
        ref={containerRef}
      >
        <div className="modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className="error-boundary__icon"
              style={{ width: 36, height: 36, borderRadius: 10, fontSize: 16 }}
            >
              <AlertIcon size={18} />
            </span>
            <h2 className="modal__title" id="confirm-title">
              {title}
            </h2>
          </div>

          <button type="button" className="modal__close" onClick={handleClose} aria-label="Close dialog">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="modal__body">
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 }} id="confirm-description">
            {description}
          </p>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={handleClose} data-autofocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Imperative wrapper around <ConfirmDialog>. */
export const useConfirm = () => {
  const [state, setState] = useState({ open: false, options: null });
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState({ open: true, options });
      }),
    [],
  );

  const onResolve = useCallback((result) => {
    setState({ open: false, options: null });
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  const dialog = <ConfirmDialog open={state.open} options={state.options} onResolve={onResolve} />;

  return { confirm, dialog };
};

export default ConfirmDialog;
