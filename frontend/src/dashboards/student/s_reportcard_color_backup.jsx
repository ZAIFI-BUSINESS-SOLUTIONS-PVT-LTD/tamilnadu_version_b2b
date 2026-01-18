import React, { useState, useEffect } from 'react';
import { fetchStudentReportCard, generateStudentReportCardPdf } from '../../utils/api';
import { 
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { ChevronLeft, ChevronRight, Check, Download } from 'lucide-react';

/**
 * Student Report Card Component
 * 
 * Displays a comprehensive two-page report card with:
 * - Page 1: Performance metrics, subject-wise analysis, improvement trends, mistakes
 * - Page 2: Study planner, frequent mistakes, class comparison
 */
const StudentReportCard = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [checkedItems, setCheckedItems] = useState({});
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Color scheme for subjects (matching the template)
  const subjectColors = {
    'Physics': ['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'],
    'Chemistry': ['#F97316', '#FB923C', '#FDBA74', '#FED7AA'],
    'Botany': ['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0'],
    'Zoology': ['#A855F7', '#C084FC', '#E9D5FF', '#F3E8FF']
  };

  const getSubjectColor = (subject, index = 0) => {
    return subjectColors[subject]?.[index] || '#94A3B8';
  };

  useEffect(() => {
    loadReportCard();
  }, [selectedTest]);

  // Set PDF ready flag when data is loaded and component is rendered
  useEffect(() => {
    if (!loading && reportData && !error) {
      // Small delay to ensure all rendering is complete
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          console.log('[Report Card] Setting __PDF_READY__ = true');
          window.__PDF_READY__ = true;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, reportData, error]);

  const loadReportCard = async () => {
    try {
      setLoading(true);
      const data = await fetchStudentReportCard(selectedTest);
      setReportData(data);
      
      // Set default test if not set
      if (!selectedTest && data.available_tests?.length > 0) {
        setSelectedTest(data.test_num);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load report card. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestChange = (e) => {
    setSelectedTest(parseInt(e.target.value));
    setCurrentPage(1); // Reset to page 1 on test change
  };

  const toggleCheckbox = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleDownloadPdf = async () => {
    if (!selectedTest) {
      alert('Please select a test first');
      return;
    }
    
    try {
      setDownloadingPdf(true);
      const blob = await generateStudentReportCardPdf(selectedTest);
      
      if (blob && blob.size > 0) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_card_test_${selectedTest}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'No data available'}</p>
          <button 
            onClick={loadReportCard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { page1, page2, available_tests } = reportData;

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide all non-printable UI elements */
          .no-print,
          .print-hidden,
          header,
          nav,
          .dock-container {
            display: none !important;
          }
          
          /* Show both pages in print mode */
          .print-show-all {
            display: block !important;
          }
          
          /* Page setup */
          .print-page {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            margin: 0;
            box-sizing: border-box;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          
          .print-page:not(:last-child) {
            page-break-after: always;
          }
          
          /* Remove screen-only styling in print */
          body {
            background: white !important;
          }
          
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
        }
        
        @media screen {
          /* Hide the print-only dual page view on screen */
          .print-show-all {
            display: none;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
        {/* Header with Test Selector - Hidden in Print */}
        <div className="max-w-7xl mx-auto mb-6 no-print">
          <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Student Report Card</h1>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Select Test:</label>
              <select
                value={selectedTest || ''}
                onChange={handleTestChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {available_tests?.map(test => (
                  <option key={test} value={test}>Test {test}</option>
                ))}
              </select>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || !selectedTest}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {downloadingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Card Content - Screen View (Single Page) */}
        <div className="max-w-7xl mx-auto screen-view">
          {currentPage === 1 ? (
            <Page1 
              data={page1} 
              getSubjectColor={getSubjectColor}
              checkedItems={checkedItems}
              toggleCheckbox={toggleCheckbox}
            />
          ) : (
            <Page2 
              data={page2} 
              getSubjectColor={getSubjectColor}
            />
          )}
        </div>

        {/* Report Card Content - Print View (Both Pages) */}
        <div className="print-show-all">
          <div className="print-page">
            <Page1 
              data={page1} 
              getSubjectColor={getSubjectColor}
              checkedItems={checkedItems}
              toggleCheckbox={toggleCheckbox}
            />
          </div>
          <div className="print-page">
            <Page2 
              data={page2} 
              getSubjectColor={getSubjectColor}
            />
          </div>
        </div>

        {/* Page Navigation - Hidden in Print */}
        <div className="max-w-7xl mx-auto mt-6 flex items-center justify-center gap-4 no-print">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            <ChevronLeft size={20} />
            Page 1
          </button>
          <span className="text-lg font-medium text-gray-700">
            Page {currentPage} of 2
          </span>
          <button
            onClick={() => setCurrentPage(2)}
            disabled={currentPage === 2}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              currentPage === 2
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            Page 2
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

// Page 1 Component: Performance Report
const Page1 = ({ data, getSubjectColor, checkedItems, toggleCheckbox }) => {
  const improvementSign = data.improvement_percentage >= 0 ? '+' : '';
  
  // Debug logging
  console.log('Page1 raw data:', data);
  console.log('performance_trend raw:', data.performance_trend);
  
  // performance_trend comes as { "1": {"Botany": 138, ...}, "2": {...}, ... }
  // No normalization needed - use directly
  const performanceTrend = data.performance_trend || {};
  
  // Normalize subject_wise_data to array
  const subjectWiseData = Array.isArray(data.subject_wise_data)
    ? data.subject_wise_data
    : (data.subject_wise_data ? Object.keys(data.subject_wise_data).map(subject => ({
        subject,
        ...data.subject_wise_data[subject]
      })) : []);
  
  // Normalize mistakes_table to array
  const mistakesTable = Array.isArray(data.mistakes_table)
    ? data.mistakes_table
    : (data.mistakes_table ? Object.values(data.mistakes_table) : []);
  
  return (
    <div className="bg-white rounded-xl shadow-xl p-8 space-y-8">
      {/* Header */}
      <div className="text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 rounded-lg">
        <h1 className="text-3xl font-bold">Dr. {data.student_name}</h1>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
          <p className="text-sm font-medium opacity-90 mb-2">Your Marks</p>
          <p className="text-4xl font-bold">{data.total_marks} / 720</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
          <p className="text-sm font-medium opacity-90 mb-2">Your Improvement</p>
          <p className="text-4xl font-bold">{improvementSign}{data.improvement_percentage}%</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-md">
          <p className="text-sm font-medium opacity-90 mb-2">Average Marks</p>
          <p className="text-4xl font-bold">{data.average_marks}</p>
        </div>
      </div>

      {/* Subject-wise Pie Charts */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Subject-wise Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {subjectWiseData?.map((subject, index) => (
            <SubjectPieChart 
              key={index}
              subject={subject}
              getSubjectColor={getSubjectColor}
            />
          ))}
        </div>
      </div>

      {/* Improvement Message - contextual phrasing based on improvement value */}
      {(() => {
        const imp = Number(data.improvement_percentage) || 0;
        const absImp = Math.abs(imp).toFixed(1);
        let message = '';
        let containerClass = 'bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 p-6 rounded-lg';

        if (imp > 0) {
          if (imp < 5) {
            message = `Good effort ${data.student_name}! You improved by ${absImp}% since the last test — keep pushing, you're on the right track.`;
          } else if (imp < 10) {
            message = `Great work ${data.student_name}! You improved by ${absImp}% since the last test — nice progress, keep it up!`;
          } else {
            message = `Outstanding ${data.student_name}! You improved by ${absImp}% since the last test — excellent progress!`;
          }
        } else if (imp < 0) {
          // Encouraging phrasing for drops
          containerClass = 'bg-gradient-to-r from-red-50 to-yellow-50 border-l-4 border-red-500 p-6 rounded-lg';
          if (absImp < 5) {
            message = `Heads up ${data.student_name}. Your score dropped by ${absImp}% since the last test — let's focus on a few key topics to bounce back stronger.`;
          } else if (absImp < 10) {
            message = `Don't worry ${data.student_name}. There's a ${absImp}% dip from the last test — concentrate on targeted practice and you'll recover quickly.`;
          } else {
            message = `We noticed a ${absImp}% decrease since the last test, ${data.student_name}. Let's prioritize weak areas in your study plan to regain momentum — you can do this!`;
          }
        } else {
          // imp === 0
          message = `You're steady, ${data.student_name}. No change since the last test — keep practicing to push your score higher.`;
        }

        return (
          <div className={containerClass}>
            <p className="text-lg font-semibold text-gray-800 text-center">{message}</p>
          </div>
        );
      })()}

      {/* Performance Trend Graph */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Trend</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={formatTotalTrendData(performanceTrend)}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="test_num"
                label={{ value: 'Test Number', position: 'insideBottom', offset: -5 }}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis
                label={{ value: 'Total Marks', angle: -90, position: 'insideLeft' }}
                domain={[dataMin => Math.max(0, dataMin - 20), dataMax => dataMax + 20]}
              />
              <Tooltip formatter={(value) => [value, 'Total Marks']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_marks"
                stroke="#1E40AF"
                strokeWidth={3}
                dot={{ r: 5 }}
              >
                <LabelList dataKey="total_marks" position="top" dy={-10} style={{ fontSize: 12 }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mistakes Table */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Mistakes to Focus On</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-blue-50 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-3 text-left font-semibold">S.no</th>
                <th className="p-3 text-left font-semibold">Subject</th>
                <th className="p-3 text-left font-semibold">Subtopic</th>
                <th className="p-3 text-left font-semibold">Mistake Detail</th>
                <th className="p-3 text-center font-semibold">✓</th>
              </tr>
            </thead>
            <tbody>
              {mistakesTable?.map((mistake, index) => (
                <tr key={index} className="border-b border-blue-200 hover:bg-blue-100 transition-colors">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3 font-medium">
                    <span 
                      className="inline-block px-3 py-1 rounded text-white text-sm"
                      style={{ backgroundColor: getSubjectColor(mistake.subject, 0) }}
                    >
                      {mistake.subject}
                    </span>
                  </td>
                  <td className="p-3">{mistake.subtopic}</td>
                  <td className="p-3 text-sm">{mistake.checkpoint || mistake.mistake_detail || ''}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleCheckbox(index)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        checkedItems[index]
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {checkedItems[index] && <Check size={16} className="text-white" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="text-center py-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <p className="text-lg italic text-gray-700">
          "You're doing super good and progressing great – <span className="font-bold text-blue-600">Keep it up!</span>"
        </p>
      </div>
    </div>
  );
};

// Page 2 Component: Study Planner & Insights
const Page2 = ({ data, getSubjectColor }) => {
  // Normalize subjects to an array. Backend may return an object keyed by subject names.
  const subjects = Array.isArray(data?.subjects) ? data.subjects : (data?.subjects ? Object.keys(data.subjects) : []);
  
  // Normalize study_planner to array
  const studyPlanner = Array.isArray(data?.study_planner) 
    ? data.study_planner 
    : (data?.study_planner ? Object.values(data.study_planner) : []);
  
  // Normalize frequent_mistakes to array
  const frequentMistakes = Array.isArray(data?.frequent_mistakes)
    ? data.frequent_mistakes
    : (data?.frequent_mistakes ? Object.values(data.frequent_mistakes) : []);
  
  // Normalize class_vs_you to array
  const classVsYou = Array.isArray(data?.class_vs_you)
    ? data.class_vs_you
    : (data?.class_vs_you ? Object.values(data.class_vs_you) : []);

  return (
    <div className="bg-white rounded-xl shadow-xl p-8 space-y-8">
      {/* Header */}
      <div className="text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white py-6 rounded-lg">
        <h1 className="text-3xl font-bold">Study Planner & Insights</h1>
      </div>

      {/* Study Planner Table */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">6-Day Study Plan</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <th className="p-3 text-center font-semibold w-24">Day</th>
                {subjects.map((subject, index) => (
                  <th key={index} className="p-3 text-center font-semibold">{subject}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studyPlanner?.map((day, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-white transition-colors">
                  <td className="p-3 text-center font-bold text-gray-700">Day {day.day}</td>
                  {subjects.map((subject, subIndex) => (
                    <td key={subIndex} className="p-3 text-center">
                      {day[subject] ? (
                        <span className="text-sm text-gray-700">{day[subject]}</span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequent Mistake Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Frequent Mistakes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {frequentMistakes?.map((mistake, index) => (
            <div 
              key={index}
              className="p-6 rounded-lg text-white shadow-lg transform hover:scale-105 transition-transform"
              style={{ backgroundColor: getSubjectColor(mistake.subject, 0) }}
            >
              <h3 className="text-lg font-bold mb-2">{mistake.subject}</h3>
              <p className="text-sm opacity-90 mb-3">{mistake.subtopic}</p>
              <p className="text-3xl font-bold">{mistake.frequency} Times</p>
            </div>
          ))}
        </div>
      </div>

      {/* Class vs You Analysis */}
      {classVsYou && classVsYou.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Class vs You</h2>
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              Questions where most of the class got it right, but you got it wrong:
            </p>
            <div className="space-y-3">
              {classVsYou.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-blue-600">Q{item.question_num}</span>
                    <span className="text-sm text-gray-600">
                      Class Correct: <span className="font-semibold">{item.correct_count}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-red-500">
                      You chose: <span className="font-semibold">{item.student_option}</span>
                    </span>
                    <span className="text-green-600">
                      Correct: <span className="font-semibold">{item.correct_option}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Previous Year Question Cloud */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Previous Year Question Cloud</h2>
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-8 rounded-lg min-h-[200px] flex items-center justify-center">
          <div className="text-center space-y-4">
            {data.previous_year_topics && data.previous_year_topics.length > 0 ? (
              <>
                <div className="flex flex-wrap justify-center" style={{ gap: '0.5rem' }}>
                  {data.previous_year_topics.map((topic, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: `${topic.fontSize || 16}px`,
                        opacity: 0.75 + (topic.neet_weight || 0) * 0.8,
                        margin: '0 0.5rem'
                      }}
                      title={`${topic.subject} - Accuracy: ${(topic.accuracy * 100).toFixed(1)}% - NEET Weight: ${(topic.neet_weight * 100).toFixed(0)}%`}
                    >
                      {topic.chapter}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic">Focus areas based on your performance and NEET weightage</p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 justify-center">
                  {['Genetics', 'Cell Division', 'Organic Chemistry', 'Thermodynamics', 'Ecology'].map((topic, index) => (
                    <span 
                      key={index}
                      style={{ 
                        fontSize: `${0.875 + Math.random() * 0.5}rem`,
                        opacity: 0.7 + Math.random() * 0.3,
                        margin: '0 0.5rem'
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic">Key topics from previous years</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="text-center py-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl">🌟</span>
          <p className="text-lg italic text-gray-700">
            "You're doing super good and progressing great – <span className="font-bold text-purple-600">Keep it up!</span>"
          </p>
          <span className="text-4xl">🎯</span>
        </div>
      </div>
    </div>
  );
};

// Helper Component: Subject Pie Chart
const SubjectPieChart = ({ subject, getSubjectColor }) => {
  const pieData = [
    { name: 'Correct', value: subject.correct_count, color: getSubjectColor(subject.subject, 0) },
    { name: 'Incorrect', value: subject.incorrect_count, color: getSubjectColor(subject.subject, 1) },
    { name: 'Skipped', value: subject.skipped_count, color: getSubjectColor(subject.subject, 2) }
  ].filter(item => item.value > 0);

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 className="text-center font-bold text-gray-800 mb-2">{subject.subject}</h3>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={60}
            dataKey="value"
            label={false}
          >
            {pieData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-1 text-xs">
        {pieData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span>{item.name}</span>
            </div>
            <span className="font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="text-center mt-3 text-sm font-semibold text-gray-700">
        Avg. Marks: {subject.subject_average_marks}
      </p>
    </div>
  );
};

// Helper function to format trend data for LineChart
const formatTrendData = (subWiseMarks) => {
  // subWiseMarks format: { "1": {"Botany": 138, "Physics": 78, ...}, "2": {...}, ... }
  if (!subWiseMarks || typeof subWiseMarks !== 'object' || Object.keys(subWiseMarks).length === 0) {
    return [];
  }
  
  console.log('formatTrendData input:', subWiseMarks);
  
  // Convert to array format for Recharts
  const result = Object.keys(subWiseMarks)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(testNum => {
      return {
        test_num: parseInt(testNum),
        ...subWiseMarks[testNum]
      };
    });
  
  console.log('formatTrendData output:', result);
  return result;
};

// Convert sub-wise marks into total marks per test for a single-line chart
const formatTotalTrendData = (subWiseMarks) => {
  if (!subWiseMarks || typeof subWiseMarks !== 'object' || Object.keys(subWiseMarks).length === 0) {
    return [];
  }

  const keys = Object.keys(subWiseMarks).sort((a, b) => parseInt(a) - parseInt(b));
  const startIndex = Math.max(0, keys.length - 10);
  const lastKeys = keys.slice(startIndex);

  return lastKeys.map(testNum => {
    const subjects = subWiseMarks[testNum] || {};
    const total = Object.values(subjects).reduce((acc, val) => {
      const num = typeof val === 'number' ? val : parseFloat(val) || 0;
      return acc + num;
    }, 0);
    return { test_num: parseInt(testNum), total_marks: total };
  });
};

// Helper to get all subjects from sub_wise_marks
const getSubjectsFromTrendData = (subWiseMarks) => {
  if (!subWiseMarks || typeof subWiseMarks !== 'object') return [];
  const firstTest = Object.values(subWiseMarks)[0];
  return firstTest ? Object.keys(firstTest) : [];
};

export default StudentReportCard;
