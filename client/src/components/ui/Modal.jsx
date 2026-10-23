import React from 'react';

import { useDialog } from '../../hooks/useUi';
import { CloseIcon } from './icons';

/**
 * Generic modal shell used by the create/edit channel flows.
 * Handles backdrop click, Escape, scroll lock and focus management.
 */
const Modal = ({ open, onClose, title, subtitle, children, footer, size = '' }) => {
  const containerRef = useDialog(open, onClose);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div
        className={`modal ${size}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={containerRef}
      >
        <div className="modal__header">
          <div>
            <h2 className="modal__title" id="modal-title">
              {title}
            </h2>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>

          <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
