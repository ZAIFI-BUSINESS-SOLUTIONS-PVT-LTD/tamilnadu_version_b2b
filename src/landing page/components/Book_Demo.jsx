import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Loader2, BadgeCheck, Mail, Phone } from 'lucide-react';

const BookDemoModal = ({ open, onClose }) => {
  const modalRef = useRef(null);
  const formRef = useRef(null);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const trap = (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      modalRef.current.addEventListener('keydown', trap);
      return () => modalRef.current?.removeEventListener('keydown', trap);
    }
  }, [open]);

  const validate = () => {
    const emailValid = /\S+@\S+\.\S+/.test(email);
    const mobileValid = /^[0-9]{7,15}$/.test(mobile.replace(/\s+/g, ''));
    return emailValid && mobileValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      if (formRef.current) {
        formRef.current.submit();
      }
      setSuccess(true);
      setEmail('');
      setMobile('');
      setTimeout(() => {
        setSuccess(false);
        setSubmitting(false);
        onClose();
      }, 1200);
    } catch (err) {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="w-full max-w-3xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="hidden md:flex flex-col justify-center items-start gap-4 p-6 bg-gradient-to-br from-blue-600 to-blue-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 rounded-full p-2">
                    <Play className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <h4 className="text-xl font-semibold">Book a Demo</h4>
                </div>
                <p className="text-sm text-white/90">A 15 minute walkthrough tailored to your institution — see AI insights, reporting, and integration options.</p>

                <div className="mt-2 w-full">
                  <div className="mb-3 text-sm font-medium">Contact</div>
                  <a href="mailto:contact@zai-fi.com" className="flex items-center gap-3 text-white/95 hover:underline">
                    <Mail className="w-4 h-4" />
                    contact@zai-fi.com
                  </a>
                  <a href="tel:+916385921669" className="flex items-center gap-3 text-white/95 mt-2 hover:underline">
                    <Phone className="w-4 h-4" />
                    +91 63859 21669
                  </a>
                </div>

                <div className="mt-4 text-xs text-white/80">Or submit your details and we'll contact you within one business day.</div>
              </div>

              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Book a Demo</h3>
                    <p className="text-sm text-gray-600">Share your mobile number and email and we'll reach out.</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="ml-4 bg-white text-gray-600 rounded-full p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Close demo form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  ref={formRef}
                  className="mt-5 space-y-4"
                  onSubmit={handleSubmit}
                  action="https://formsubmit.co/contact@zai-fi.com"
                  method="POST"
                  target="_blank"
                >
                  <input type="hidden" name="_subject" value="Demo request from website" />
                  <input type="hidden" name="_captcha" value="false" />
                  <div>
                    <label className="block text-sm text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full mt-2 px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700">Mobile Number</label>
                    <input
                      type="tel"
                      name="mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      className="w-full mt-2 px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="9876543210"
                      inputMode="tel"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="submit"
                      disabled={submitting || !validate()}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Request Demo
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                    {success && (
                      <div className="ml-auto text-sm text-green-600 flex items-center gap-1">
                        <BadgeCheck className="w-4 h-4" /> Sent
                      </div>
                    )}
                  </div>
                </form>

                <div className="md:hidden mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700">
                  <div className="mb-2 font-medium">Prefer to reach us directly?</div>
                  <div className="flex flex-col gap-2">
                    <a href="mailto:contact@zai-fi.com" className="flex items-center gap-2 text-blue-600 hover:underline">
                      <Mail className="w-4 h-4" />
                      contact@zai-fi.com
                    </a>
                    <a href="tel:+916385921669" className="flex items-center gap-2 text-blue-600 hover:underline">
                      <Phone className="w-4 h-4" />
                      +91 63859-21669
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookDemoModal;
