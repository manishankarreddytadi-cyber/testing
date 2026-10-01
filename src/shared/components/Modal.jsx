// src/shared/components/Modal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Generic modal wrapper.
 * Usage:
 *   <Modal isOpen={isOpen} onClose={close} title="Start Cycle" maxWidth={600}>
 *     <YourContent />
 *   </Modal>
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 500, nested = false, headerExtra }) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`modal-overlay${nested ? ' nested' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content" style={{ maxWidth }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {headerExtra}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">&times;</button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
