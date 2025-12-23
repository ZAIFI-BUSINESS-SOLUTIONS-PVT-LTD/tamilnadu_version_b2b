import React, { useState, useEffect } from 'react';
import { useInstitution } from './index.jsx';
import { fetchInstitutionTestStudentPerformance } from '../../utils/api';
import { formatQuestionText } from '../../utils/mathFormatter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.jsx';
import { CheckCircle2, XCircle, MinusCircle, Loader2, AlertCircle } from 'lucide-react';
import LoadingPage from '../components/LoadingPage.jsx';

const ITestPerformance = () => {
  const { selectedEducatorId, educators } = useInstitution();
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

  if (!selectedEducatorId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <AlertCircle className="w-12 h-12 text-gray-400" />
              <p className="text-gray-600">Please select an educator from the sidebar to view test performance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Performance Analysis</CardTitle>
          <CardDescription>
            View detailed student-wise and question-wise performance for a specific test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Number
              </label>
              <input
                type="number"
                placeholder="Enter test number (e.g., 1, 2, 3)"
                value={testNum}
                onChange={(e) => setTestNum(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>
            <Button 
              onClick={handleFetchPerformance}
              disabled={isLoading || !testNum || !selectedEducatorId}
              className="px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Fetch Performance'
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
