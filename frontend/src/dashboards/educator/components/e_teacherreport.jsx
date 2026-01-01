  import React, { useState, useEffect } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateTeacherSelfPdfReport, fetchAvailableSwotTests_Educator, getEducatorDetails } from '../../../utils/api.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import Alert from '../../../components/ui/alert.jsx';

// Modal component for downloading the teacher's report
export const TeacherReportModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [classId, setClassId] = useState(null);

  // Fetch educator's class_id on mount
  useEffect(() => {
    const fetchClassId = async () => {
      try {
        const data = await getEducatorDetails();
        if (data && data.class_id) {
          setClassId(data.class_id);
        }
      } catch (err) {
        console.warn('Could not fetch class_id for S3 upload:', err);
      }
    };
    fetchClassId();
  }, []);

  // Fetch available tests for the teacher on mount
  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
          const tests = await fetchAvailableSwotTests_Educator();
          // normalize to numbers, remove falsy/zero, dedupe and sort: Overall (0) first, then descending for others
          const uniqueTests = [...new Set(tests || [])]
            .map((n) => Number(n))
            .filter((num) => !Number.isNaN(num))
            .sort((a, b) => {
              if (a === 0) return -1;
              if (b === 0) return 1;
              return b - a;
            });
          const mapped = uniqueTests.map((num) => num === 0 ? 'Overall' : `Test ${num}`);
        setAvailableTests(mapped);
        // default to first test if none selected yet
        if (mapped.length && !selectedTest) setSelectedTest(mapped[0]);
      } catch (err) {
        setAvailableTests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  // Options for the test selection dropdown
  const testOptions = availableTests.map((test) => ({ value: test, label: test }));

  const handleDownload = async () => {
    if (!selectedTest) {
      setError('Please select a test.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Parse selectedTest to testNum
      let testNum;
      if (selectedTest === 'Overall') {
        testNum = 0;
      } else {
        const parsed = parseInt(selectedTest.split(' ')[1], 10);
        testNum = Number.isNaN(parsed) ? null : parsed;
      }
      if (testNum === null) {
        setError('Invalid test selection.');
        return;
      }
      const blob = await generateTeacherSelfPdfReport(testNum, classId);
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl p-0 sm:p-0 mx-2 sm:mx-0"
          initial={{ scale: 0.8, y: 20, opacity: 0.8 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3 pt-2 pl-4 pr-2 sm:pb-3 sm:pt-4 sm:pl-6 sm:pr-4">
              <div className="flex flex-row justify-between items-center mb-4 gap-2">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800 text-left">Download Your Report</CardTitle>
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
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Alert variant="destructive" className="shadow-sm text-sm">
                      {error}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Test Selection (responsive) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
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

export default TeacherReportModal;