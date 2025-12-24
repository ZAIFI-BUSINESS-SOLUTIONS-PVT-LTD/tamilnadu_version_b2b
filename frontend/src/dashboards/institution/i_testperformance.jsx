import React, { useState, useEffect } from 'react';
import { useInstitution } from './index.jsx';
import { fetchInstitutionTestStudentPerformance, fetchAvailableSwotTests_InstitutionEducator } from '../../utils/api';
import { formatQuestionText } from '../../utils/mathFormatter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.jsx';
import { CheckCircle2, XCircle, MinusCircle, Loader2, AlertCircle } from 'lucide-react';
import LoadingPage from '../components/LoadingPage.jsx';

const ITestPerformance = () => {
  const { selectedEducatorId, setSelectedEducatorId, educators } = useInstitution();
  const sortedEducators = React.useMemo(() => {
    if (!Array.isArray(educators)) return [];
    return [...educators].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [educators]);
  const [availableTests, setAvailableTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState(null);
  const [testNum, setTestNum] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetchPerformance = async () => {
    if (!selectedEducatorId || !testNum) {
      setError('Please select an educator and enter a test number');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPerformanceData(null);

    try {
      const data = await fetchInstitutionTestStudentPerformance(selectedEducatorId, parseInt(testNum));

      console.log('📊 Performance data received:', data);
      console.log('📝 Questions count:', data?.questions?.length);
      console.log('👥 Students count:', data?.students?.length);
      if (data?.students?.length > 0) {
        console.log('📋 First student responses:', data.students[0].responses?.length);
      }

      if (data.error) {
        setError(data.error);
      } else {
        setPerformanceData(data);
      }
    } catch (err) {
      setError('Failed to fetch test performance data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadTests = async () => {
      if (!selectedEducatorId) {
        setAvailableTests([]);
        setTestNum('');
        return;
      }
      setTestsLoading(true);
      setTestsError(null);
      try {
        const tests = await fetchAvailableSwotTests_InstitutionEducator(selectedEducatorId);
        let tlist = Array.isArray(tests) ? tests.map(t => String(t)) : [];
        // sort descending numerically: most recent / highest test first (test12, test11, ...)
        tlist = tlist
          .filter(x => x !== null && x !== undefined && x !== '')
          .sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
        if (!cancelled) {
          setAvailableTests(tlist);
          // default to the most recent test (first item after descending sort)
          if (tlist.length > 0) setTestNum(prev => prev || tlist[0]);
          else setTestNum('');
        }
      } catch (err) {
        console.error('Failed to load tests', err);
        if (!cancelled) {
          setTestsError('Failed to load available tests');
          setAvailableTests([]);
          setTestNum('');
        }
      } finally {
        if (!cancelled) setTestsLoading(false);
      }
    };

    loadTests();
    return () => { cancelled = true; };
  }, [selectedEducatorId]);

  useEffect(() => {
    // auto-fetch whenever educator and test are selected
    if (selectedEducatorId && testNum) {
      handleFetchPerformance();
    } else {
      setPerformanceData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEducatorId, testNum]);

  const getAnswerIcon = (isCorrect, selectedAnswer) => {
    if (selectedAnswer === null || selectedAnswer === undefined || selectedAnswer === '') {
      return <MinusCircle className="w-5 h-5 text-gray-400" />;
    }

    return isCorrect ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getAnswerClass = (isCorrect, selectedAnswer) => {
    if (selectedAnswer === null || selectedAnswer === undefined || selectedAnswer === '') {
      return 'text-gray-500 bg-gray-50';
    }

    return isCorrect ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  };

  const calculateStudentScore = (responses) => {
    const correct = responses.filter(r => r.is_correct).length;
    const total = responses.length;
    const percentage = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
    return { correct, total, percentage };
  };

  // allow header row to show even when no educator is selected so user can pick a classroom

  return (
    <div className="space-y-6">
      <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between gap-3 mt-12">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Test Performance Analysis</h1>
          <p className="text-sm text-gray-500">View detailed student-wise and question-wise performance for a specific test</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 min-w-max pl-1">Classroom</span>
            <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
              <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-[220px] lg:w-auto text-start">
                <SelectValue placeholder="Select Classroom" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                {sortedEducators.map((edu) => (
                  <SelectItem key={edu.id} value={String(edu.id)}>
                    {edu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 min-w-max pl-1">Test</span>
            <Select value={testNum ? String(testNum) : ''} onValueChange={(v) => setTestNum ? setTestNum(v) : null}>
              <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-28 text-start">
                <SelectValue placeholder={testsLoading ? 'Loading...' : (availableTests.length ? 'Select Test' : 'No tests')} />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                {availableTests.map((t) => (
                  <SelectItem key={String(t)} value={String(t)}>{String(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="lg:hidden mb-2">
        <div className="flex w-full bg-white px-3 border-b justify-between items-center rounded-xl">
          <div className="text-left py-3 w-full flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-800">Test Performance Analysis</h1>
            <div className="flex items-center gap-2">
              <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Classroom" />
                </SelectTrigger>
                <SelectContent>
                  {sortedEducators.map((edu) => (
                    <SelectItem key={edu.id} value={String(edu.id)}>
                      {edu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={testNum ? String(testNum) : ''} onValueChange={(v) => setTestNum ? setTestNum(v) : null}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder={testsLoading ? 'Loading...' : (availableTests.length ? 'Test' : 'No tests')} />
                </SelectTrigger>
                <SelectContent>
                  {availableTests.map((t) => (
                    <SelectItem key={String(t)} value={String(t)}>{String(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      {/** Card area now only shows messages; performance summary and table below will render when data exists **/}
      {testsError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">{testsError}</div>
      )}

      {isLoading && <LoadingPage />}

      {!isLoading && performanceData && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Class ID</p>
                  <p className="text-xl font-semibold text-gray-900">{performanceData.class_id}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Test Number</p>
                  <p className="text-xl font-semibold text-gray-900">{performanceData.test_num}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Questions</p>
                  <p className="text-xl font-semibold text-gray-900">{performanceData.questions.length}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Students Attended</p>
                  <p className="text-xl font-semibold text-gray-900">{performanceData.students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Performance Table */}
          {performanceData.students.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Student-wise Performance</CardTitle>
                <CardDescription>
                  Click on a student to view detailed question-wise responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.students.map((student) => {
                    const score = calculateStudentScore(student.responses);

                    console.log(`Student: ${student.student_name}, Responses:`, student.responses?.length);

                    return (
                      <details key={student.student_id} className="border rounded-lg overflow-hidden">
                        <summary className="cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{student.student_name}</p>
                              <p className="text-sm text-gray-600">ID: {student.student_id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">{score.percentage}%</p>
                              <p className="text-sm text-gray-600">{score.correct} / {score.total}</p>
                            </div>
                          </div>
                        </summary>

                        <div className="p-4">
                          {!student.responses || student.responses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <p>No responses found for this student</p>
                            </div>
                          ) : !performanceData.questions || performanceData.questions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <p>No questions data available</p>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-20">Q. No.</TableHead>
                                  <TableHead>Question</TableHead>
                                  <TableHead className="w-32">Selected</TableHead>
                                  <TableHead className="w-32">Correct</TableHead>
                                  <TableHead className="w-24 text-center">Result</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {student.responses.map((response, idx) => {
                                  const question = performanceData.questions.find(
                                    q => q.question_number === response.question_number
                                  );

                                  return (
                                    <TableRow key={response.question_number} className={getAnswerClass(response.is_correct, response.selected_answer)}>
                                      <TableCell className="font-medium">{response.question_number}</TableCell>
                                      <TableCell className="max-w-md">
                                        <p className="line-clamp-2 text-sm whitespace-pre-wrap">{formatQuestionText(question?.question_text) || 'N/A'}</p>
                                      </TableCell>
                                      <TableCell>
                                        {response.selected_answer || 'Not Answered'}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {question?.correct_option_number || question?.correct_answer || 'N/A'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {getAnswerIcon(response.is_correct, response.selected_answer)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No students attended this test</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ITestPerformance;
