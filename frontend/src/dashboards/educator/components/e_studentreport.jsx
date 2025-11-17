import React, { useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../../../components/ui/select.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { generatePdfReport, generateBulkPdfReportsZip } from '../../../utils/api.js';

export const StudentPDFReportModal = ({ onClose, students = [], availableTests = [] }) => {
  const [selectedStudent, setSelectedStudent] = useState('ALL');
  const [selectedTest, setSelectedTest] = useState('Overall');
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
  const testOptions = [
    ...(!availableTests.includes('Overall') ? [{ value: 'Overall', label: 'Overall' }] : []),
    ...availableTests.map((test) => ({
      value: test,
      label: test,
    })),
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl p-0 sm:p-0 mx-2 sm:mx-0"
          initial={{ scale: 0.8, y: 20, opacity: 0.8 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3 pt-2 pl-4 pr-2 sm:pb-3 sm:pt-4 sm:pl-6 sm:pr-4">
              <div className="flex flex-row justify-between items-center mb-4 gap-2">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800 text-left">Download Student Report</CardTitle>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  disabled={loading}
                  className="rounded-full"
                >
                  <X size={20} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="alert alert-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Student & Test Selection Inline (stacked on mobile) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <span className="text-sm text-gray-500">Student:</span>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger className="w-full sm:w-fit text-start">
                      <SelectValue placeholder="Choose Student" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60" align="end">
                      {studentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <span className="text-sm text-gray-500">Test:</span>
                  <Select value={selectedTest} onValueChange={setSelectedTest}>
                    <SelectTrigger className="w-full sm:w-fit text-start">
                      <SelectValue placeholder="Choose Test" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60" align="end">
                      {testOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-row justify-between sm:justify-end gap-2 pt-4">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  className="w-1/2 sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="default"
                  size="sm"
                  disabled={loading}
                  className="w-1/2 sm:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-1" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-1" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StudentPDFReportModal;
