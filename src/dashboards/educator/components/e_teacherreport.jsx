import React, { useState, useEffect } from 'react';
import { DownloadSimple, X, Spinner } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateTeacherSelfPdfReport, fetchAvailableSwotTests_Educator } from '../../../utils/api.js';
import SelectDropdown from '../../components/ui/dropdown.jsx';

// Modal component for downloading the teacher's report
export const TeacherReportModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);

  // Fetch available tests for the teacher on mount
  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
        const tests = await fetchAvailableSwotTests_Educator();
        const uniqueTests = [...new Set(tests)].filter((num) => num !== 0);
        setAvailableTests(['Overall', ...uniqueTests.map((num) => `Test ${num}`)]);
      } catch (err) {
        setAvailableTests(['Overall']);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  // Options for the test selection dropdown
  const testOptions = availableTests.map((test) => ({
    value: test,
    label: test,
  }));

  const handleDownload = async () => {
    if (!selectedTest) {
      setError('Please select a test.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const blob = await generateTeacherSelfPdfReport(selectedTest);
      if (blob && blob.size > 0) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inzighted_teacher_report_${selectedTest}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError('Failed to generate or download PDF.');
      }
    } catch (err) {
      setError('Failed to generate or download PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
          initial={{ scale: 0.8, y: 20, opacity: 0.8 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h3 className="text-xl font-semibold text-gray-800">Download Your Report</h3>
            <button
              onClick={onClose}
              className="btn btn-circle btn-ghost hover:bg-base-200"
              disabled={loading}
            >
              <X weight="bold" size={20} />
            </button>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="alert alert-error mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Test Selection */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Test:</span>
              <SelectDropdown
                options={testOptions}
                selectedValue={selectedTest}
                onSelect={setSelectedTest}
                buttonClassName="btn btn-sm truncate"
                placeholder="Choose Test"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size={16} className="animate-spin mr-1" />
                  Generating...
                </>
              ) : (
                <>
                  <DownloadSimple size={16} className="mr-1" />
                  Download
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TeacherReportModal;