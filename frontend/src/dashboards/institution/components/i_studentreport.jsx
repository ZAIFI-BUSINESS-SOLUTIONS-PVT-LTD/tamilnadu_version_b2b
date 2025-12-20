import React, { useState, useEffect } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../../../components/ui/select.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { generatePdfReport, generateBulkPdfReportsZip, fetchInstitutionEducators, fetchInstitutionEducatorStudents, fetchAvailableSwotTests_InstitutionEducator } from '../../../utils/api.js';

export const StudentPDFReportModal = ({ onClose, students = [], availableTests = [] }) => {
  const [selectedStudent, setSelectedStudent] = useState('ALL');
  const [selectedTest, setSelectedTest] = useState('Overall');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classId, setClassId] = useState(null);
  const [educators, setEducators] = useState([]);
  const [selectedEducatorId, setSelectedEducatorId] = useState('');
  const [localStudents, setLocalStudents] = useState(students);
  const [localTests, setLocalTests] = useState(availableTests);

  // Load institution educators on mount
  useEffect(() => {
    const loadEducators = async () => {
      try {
        const data = await fetchInstitutionEducators();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.educators) ? data.educators : []);
        setEducators(list);
        if (list.length) setSelectedEducatorId(String(list[0].id ?? list[0].educator_id ?? ''));
      } catch (err) {
        console.warn('Failed to load institution educators', err);
        setEducators([]);
      }
    };
    loadEducators();
  }, []);

  // When selected educator changes, load students and tests for that educator
  useEffect(() => {
    const loadForEducator = async () => {
      if (!selectedEducatorId) return;
      setLoading(true);
      try {
        const data = await fetchInstitutionEducatorStudents(selectedEducatorId);
        const studentsList = Array.isArray(data) ? data : (Array.isArray(data?.students) ? data.students : []);
        setLocalStudents(studentsList);
        const tests = await fetchAvailableSwotTests_InstitutionEducator(selectedEducatorId);
        const uniqueTests = [...new Set(tests || [])]
          .map((n) => String(n === 0 ? 'Overall' : `Test ${n}`));
        setLocalTests(uniqueTests.length ? uniqueTests : ['Overall']);
        // set classId from educators list
        const ed = educators.find((e) => String(e.id ?? e.educator_id) === String(selectedEducatorId));
        if (ed) setClassId(ed.class_id ?? ed.classId ?? null);
      } catch (err) {
        setLocalStudents([]);
        setLocalTests(['Overall']);
      } finally {
        setLoading(false);
      }
    };
    loadForEducator();
  }, [selectedEducatorId, educators]);

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
        const allStudentIds = (localStudents || []).map(s => s.student_id);
        blob = await generateBulkPdfReportsZip(allStudentIds, selectedTest, classId);
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
        blob = await generatePdfReport(selectedStudent, selectedTest, classId);
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
  // Add 'All Students' as the first option (use localStudents populated for selected educator)
  const studentOptions = [
    { value: 'ALL', label: 'All Students' },
    ...(localStudents || []).map((s) => ({
      value: s.student_id,
      label: `${s.student_id}: ${s.name}`,
    })),
  ];
  const testOptions = [
    ...(!localTests.includes('Overall') ? [{ value: 'Overall', label: 'Overall' }] : []),
    ...localTests.map((test) => ({
      value: test,
      label: test,
    })),
  ];

  const educatorOptions = educators.map((e) => ({ value: String(e.id ?? e.educator_id), label: e.name || e.email || `Educator ${e.id ?? e.educator_id}` }));

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

              {/* Student & Test Selection - responsive grid to prevent overflow */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">Educator:</span>
                  <Select value={selectedEducatorId} onValueChange={setSelectedEducatorId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Educator" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60" align="end">
                      {educatorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">Student:</span>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger className="w-full">
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

                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">Test:</span>
                  <Select value={selectedTest} onValueChange={setSelectedTest}>
                    <SelectTrigger className="w-full">
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
