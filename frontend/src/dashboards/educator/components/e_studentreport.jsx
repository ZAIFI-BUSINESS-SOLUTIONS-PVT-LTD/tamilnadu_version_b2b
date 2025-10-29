import React, { useState } from 'react';
import { DownloadSimple, X, Spinner } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import SelectDropdown from '../../components/ui/dropdown.jsx';
import { generatePdfReport, generateBulkPdfReportsZip } from '../../../utils/api.js';

export const StudentPDFReportModal = ({ onClose, students = [], availableTests = [] }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    if (!selectedStudent || !selectedTest) {
      setError("Please select both student and test.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let blob;
      if (selectedStudent === 'ALL') {
        // Download all students as zip
        const allStudentIds = students.map(s => s.student_id);
        blob = await generateBulkPdfReportsZip(allStudentIds, selectedTest);
        if (blob && blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inzighted_reports_${selectedTest}.zip`;
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
          setError('Failed to generate or download ZIP.');
        }
      } else {
        blob = await generatePdfReport(selectedStudent, selectedTest);
        if (blob && blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inzighted_report_${selectedStudent}_${selectedTest}.pdf`;
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
      }
    } catch (err) {
      setError("Failed to generate or download PDF/ZIP.");
    } finally {
      setLoading(false);
    }
  };

  // Add 'All Students' as the first option
  const studentOptions = [
    { value: 'ALL', label: 'All Students' },
    ...students.map((s) => ({
      value: s.student_id,
      label: `${s.student_id}: ${s.name}`,
    })),
  ];
  const testOptions = availableTests.map((test) => ({
    value: test,
    label: test,
  }));

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
            <h3 className="text-xl font-semibold text-gray-800">Download Student Report</h3>
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

          {/* Student & Test Selection Inline */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Student:</span>
              <SelectDropdown
                options={studentOptions}
                selectedValue={selectedStudent}
                onSelect={setSelectedStudent}
                buttonClassName="btn btn-sm truncate"
                placeholder="Choose Student"
              />
            </div>
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

export default StudentPDFReportModal;
