// src/shared/hooks/useModal.js
import { useState, useCallback } from 'react';

/**
 * Replaces the global openModal(id) / closeModal(id) pattern.
 * Usage:
 *   const { isOpen, open, close } = useModal();
 *   <button onClick={open}>Open</button>
 *   <Modal isOpen={isOpen} onClose={close} ... />
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const open  = useCallback(() => setIsOpen(true),  []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, open, close };
}
