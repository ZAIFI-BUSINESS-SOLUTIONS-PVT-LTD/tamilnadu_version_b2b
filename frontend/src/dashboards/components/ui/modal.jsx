import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

/**
 * Generic Modal component
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * @param {string|React.ReactNode} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {React.ReactNode} footer - Modal footer (buttons, etc)
 * @param {boolean} loading - If true, disables close button
 * @param {string} maxWidth - Tailwind max-w-* class (default: 'max-w-2xl')
 * @param {string} className - Extra classes for modal container
 */
const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  loading = false,
  maxWidth = 'max-w-2xl',
  className = '',
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && !loading && onClose?.()}
      >
        <motion.div
          className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} p-6 ${className}`}
          initial={{ scale: 0.8, y: 20, opacity: 0.8 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="btn btn-circle btn-ghost hover:bg-base-200"
              disabled={loading}
              aria-label="Close"
            >
              <X weight="bold" size={20} />
            </button>
          </div>
          {/* Body */}
          <div>{children}</div>
          {/* Footer */}
          {footer && <div className="flex justify-end gap-2 mt-6">{footer}</div>}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default Modal;
