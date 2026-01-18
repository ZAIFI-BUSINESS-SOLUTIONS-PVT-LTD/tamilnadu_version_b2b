import React, { useState, useEffect } from 'react';
import { fetchStudentReportCard, generateStudentReportCardPdf } from '../../utils/api';
import { 
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Student Report Card Component - Black & White Print-Optimized Version
 * 
 * Redesigned for grayscale/B&W printing with:
 * - SVG patterns instead of colors for subject differentiation
 * - High contrast borders and typography
 * - No reliance on color or icons for meaning
 * - Photocopier-friendly design
 */
const StudentReportCard = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [checkedItems, setCheckedItems] = useState({});
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Pattern definitions for subjects (B&W compatible)
  const subjectPatterns = {
    'Botany': {
      id: 'pattern-botany',
      description: 'Diagonal stripes (/ / /)',
      svg: (
        <pattern id="pattern-botany" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="black" strokeWidth="3" />
        </pattern>
      )
    },
    'Physics': {
      id: 'pattern-physics',
      description: 'Cross-hatch grid',
      svg: (
        <pattern id="pattern-physics" width="8" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="8" y2="0" stroke="black" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="black" strokeWidth="1" />
        </pattern>
      )
    },
    'Zoology': {
      id: 'pattern-zoology',
      description: 'Dotted pattern',
      svg: (
        <pattern id="pattern-zoology" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="black" />
          <circle cx="6" cy="6" r="1.5" fill="black" />
        </pattern>
      )
    },
    'Chemistry': {
      id: 'pattern-chemistry',
      description: 'Horizontal lines',
      svg: (
        <pattern id="pattern-chemistry" width="8" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="8" y2="2" stroke="black" strokeWidth="1.5" />
          <line x1="0" y1="6" x2="8" y2="6" stroke="black" strokeWidth="1.5" />
        </pattern>
      )
    }
  };

  const getSubjectPattern = (subject) => {
    return subjectPatterns[subject] || subjectPatterns['Botany'];
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black"></div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center border-4 border-black p-8">
          <p className="text-black text-lg mb-4 font-bold">{error || 'No data available'}</p>
          <button 
            onClick={loadReportCard}
            className="px-4 py-2 border-2 border-black text-black font-semibold hover:bg-gray-200 rounded-md"
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
      {/* SVG Pattern Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {Object.values(subjectPatterns).map(pattern => pattern.svg)}
        </defs>
      </svg>

      {/* Print-specific styles */}
      <style>{`
        /* Black & White Print Optimization */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
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
          
          /* Ensure patterns print correctly */
          svg pattern line,
          svg pattern circle {
            stroke: black !important;
            fill: black !important;
          }
        }
        
        @media screen {
          /* Hide the print-only dual page view on screen */
          .print-show-all {
            display: none;
          }
        }
      `}</style>

      <div className="min-h-screen bg-white p-4 md:p-8">
        {/* Header with Test Selector - Color theme (screen only) */}
        <div className="max-w-7xl mx-auto mb-6 no-print">
          <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Student Report Card (B&W)</h1>
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
              getSubjectPattern={getSubjectPattern}
              checkedItems={checkedItems}
              toggleCheckbox={toggleCheckbox}
            />
          ) : (
            <Page2 
              data={page2} 
              getSubjectPattern={getSubjectPattern}
            />
          )}
        </div>

        {/* Report Card Content - Print View (Both Pages) */}
        <div className="print-show-all">
          <div className="print-page">
            <Page1 
              data={page1} 
              getSubjectPattern={getSubjectPattern}
              checkedItems={checkedItems}
              toggleCheckbox={toggleCheckbox}
            />
          </div>
          <div className="print-page">
            <Page2 
              data={page2} 
              getSubjectPattern={getSubjectPattern}
            />
          </div>
        </div>

        {/* Page Navigation - Hidden in Print */}
        <div className="max-w-7xl mx-auto mt-6 flex items-center justify-center gap-4 no-print">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-6 py-3 border-2 border-black font-bold transition-all rounded-md ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={20} />
            Page 1
          </button>
          <span className="text-lg font-bold text-black border-2 border-black px-4 py-2 rounded-md">
            Page {currentPage} of 2
          </span>
          <button
            onClick={() => setCurrentPage(2)}
            disabled={currentPage === 2}
            className={`flex items-center gap-2 px-6 py-3 border-2 border-black font-bold transition-all rounded-md ${
              currentPage === 2
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-100'
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

// Page 1 Component: Performance Report (B&W Version)
const Page1 = ({ data, getSubjectPattern, checkedItems, toggleCheckbox }) => {
  const improvementSign = data.improvement_percentage >= 0 ? '↑' : '↓';
  const isPositive = data.improvement_percentage >= 0;
  
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
  
  // performance_trend handling
  const performanceTrend = data.performance_trend || {};
  
  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 space-y-6 rounded-lg print:bg-white">
      {/* Header - Light shaded background with rounded corners */}
      <div className="w-full bg-gray-200 border border-black py-4 rounded-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black">Dr. {data.student_name}</h1>
          <p className="text-sm font-semibold text-black mt-1">Student Performance Report</p>
        </div>
      </div>

      {/* Top Summary Cards - White background with thick borders and pattern strips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BWCard 
          label="Your Marks" 
          value={`${data.total_marks} / 720`}
          patternId="pattern-botany"
        />
        <BWCard 
          label={`Your Improvement ${improvementSign}`}
          value={`${Math.abs(data.improvement_percentage)}%`}
          patternId="pattern-physics"
          highlight={isPositive}
        />
        <BWCard 
          label="Average Marks" 
          value={data.average_marks}
          patternId="pattern-chemistry"
        />
      </div>

      {/* Subject-wise Performance Charts - Pattern-based donuts */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Subject-wise Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {subjectWiseData?.map((subject, index) => (
            <SubjectPieChartBW 
              key={index}
              subject={subject}
              getSubjectPattern={getSubjectPattern}
            />
          ))}
        </div>
      </div>

      {/* Improvement Message */}
      {(() => {
        const imp = Number(data.improvement_percentage) || 0;
        const absImp = Math.abs(imp).toFixed(1);
        let message = '';

        if (imp > 0) {
          if (imp < 5) {
            message = `"Good effort ${data.student_name}! You improved by ${absImp}% since the last test — keep pushing, you're on the right track."`;
          } else if (imp < 10) {
            message = `"Great work ${data.student_name}! You improved by ${absImp}% since the last test — nice progress, keep it up!"`;
          } else {
            message = `"Outstanding ${data.student_name}! You improved by ${absImp}% since the last test — excellent progress!"`;
          }
        } else if (imp < 0) {
          if (absImp < 5) {
            message = `"Heads up ${data.student_name}. Your score dropped by ${absImp}% since the last test — let's focus on a few key topics to bounce back stronger."`;
          } else if (absImp < 10) {
            message = `"Don't worry ${data.student_name}. There's a ${absImp}% dip from the last test — concentrate on targeted practice and you'll recover quickly."`;
          } else {
            message = `"We noticed a ${absImp}% decrease since the last test, ${data.student_name}. Let's prioritize weak areas in your study plan to regain momentum — you can do this!"`;
          }
        } else {
          message = `"You're steady, ${data.student_name}. No change since the last test — keep practicing to push your score higher."`;
        }

        return (
          <div className="border-2 border-black p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-semibold text-black text-center italic">{message}</p>
          </div>
        );
      })()}

      {/* Performance Trend Graph - B&W with solid/dashed lines */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Performance Trend</h2>
        <div className="border-2 border-black p-4 rounded-md">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={formatTotalTrendData(performanceTrend)}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              {/* Grid removed for cleaner B/W presentation; rely on axis lines and labels */}
              <XAxis
                dataKey="test_num"
                label={{ value: 'Test Number', position: 'insideBottom', offset: -5 }}
                padding={{ left: 20, right: 20 }}
                stroke="#000"
                tick={{ fill: '#000' }}
              />
              <YAxis
                label={{ value: 'Total Marks', angle: -90, position: 'insideLeft' }}
                domain={[dataMin => Math.max(0, dataMin - 20), dataMax => dataMax + 20]}
                stroke="#000"
                tick={{ fill: '#000' }}
              />
              <Tooltip formatter={(value) => [value, 'Total Marks']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_marks"
                stroke="#000"
                strokeWidth={3}
                dot={{ r: 6, fill: '#000', stroke: '#000', strokeWidth: 2 }}
              >
                <LabelList dataKey="total_marks" position="top" dy={-10} style={{ fontSize: 11, fontWeight: 'bold', fill: '#000' }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mistakes Table - Pattern-based subject tags */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Mistakes to Focus On</h2>
        <div className="overflow-x-auto border-2 border-black rounded-md">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-2 text-left font-bold border border-black">S.no</th>
                <th className="p-2 text-left font-bold border border-black">Subject</th>
                <th className="p-2 text-left font-bold border border-black">Subtopic</th>
                <th className="p-2 text-left font-bold border border-black">Mistake Detail</th>
                <th className="p-2 text-center font-bold border border-black">✓</th>
              </tr>
            </thead>
            <tbody>
              {mistakesTable?.map((mistake, index) => (
                <tr key={index} className={`border border-black ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}>
                  <td className="p-2 border border-black font-semibold">{index + 1}</td>
                  <td className="p-2 border border-black">
                    <SubjectTagBW subject={mistake.subject} getSubjectPattern={getSubjectPattern} />
                  </td>
                  <td className="p-2 border border-black text-sm">{mistake.subtopic}</td>
                  <td className="p-2 border border-black text-sm">{mistake.checkpoint || mistake.mistake_detail || ''}</td>
                  <td className="p-2 text-center border border-black">
                    <button
                      onClick={() => toggleCheckbox(index)}
                      className={`w-5 h-5 rounded-sm border-2 border-black flex items-center justify-center font-bold ${
                        checkedItems[index] ? 'bg-black text-white' : 'bg-white text-black'
                      }`}
                    >
                      {checkedItems[index] && '✓'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="text-center py-4 border-2 border-black bg-gray-50 rounded-md">
        <p className="text-sm italic text-black">
          "You're doing super good and progressing great – <span className="font-bold">Keep it up!</span>"
        </p>
      </div>
    </div>
  );
};

// Page 2 Component: Study Planner & Insights (B&W Version)
const Page2 = ({ data, getSubjectPattern }) => {
  // Normalize subjects to an array
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
    <div className="bg-white p-6 space-y-6">
      {/* Header */}
      <div className="w-full bg-gray-200 border border-black py-4 rounded-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black">Study Planner & Insights</h1>
          <p className="text-sm font-semibold text-black mt-1">Personalized plan and key insights</p>
        </div>
      </div>

      {/* Study Planner Table - Pattern underlines for subjects */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">6-Day Study Plan</h2>
        <div className="overflow-x-auto border-2 border-black rounded-md">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-2 text-center font-bold border border-black">Day</th>
                {subjects.map((subject, index) => (
                  <th key={index} className="p-2 text-center font-bold border border-black relative">
                    <div>{subject}</div>
                    <svg width="100%" height="4" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                      <rect width="100%" height="4" fill={`url(#${getSubjectPattern(subject).id})`} />
                    </svg>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studyPlanner?.map((day, index) => (
                <tr key={index} className={`border border-black ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}>
                  <td className="p-2 text-center font-bold border border-black">Day {day.day}</td>
                  {subjects.map((subject, subIndex) => (
                    <td key={subIndex} className="p-2 text-center border border-black">
                      {day[subject] ? (
                        <span className="text-xs text-black">{day[subject]}</span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequent Mistake Cards - Bordered blocks with pattern headers */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Frequent Mistakes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {frequentMistakes?.map((mistake, index) => (
            <div 
              key={index}
              className="border-2 border-black overflow-hidden rounded-md"
            >
              {/* Pattern header strip */}
              <svg width="100%" height="24">
                <rect width="100%" height="24" fill={`url(#${getSubjectPattern(mistake.subject).id})`} />
              </svg>
              <div className="p-3 bg-white">
                <h3 className="text-sm font-bold mb-1 text-black">{mistake.subject}</h3>
                <p className="text-xs mb-2 text-black">{mistake.subtopic}</p>
                <p className="text-2xl font-bold text-black">{mistake.frequency} Times</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class vs You Analysis - Text symbols only */}
      {classVsYou && classVsYou.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Class vs You</h2>
          <div className="border-2 border-black p-4 bg-gray-50 rounded-md">
            <p className="text-xs text-black mb-3 font-semibold">
              Questions where most of the class got it right, but you got it wrong:
            </p>
            <div className="space-y-2">
              {classVsYou.slice(0, 3).map((item, index) => (
                <div key={index} className="border border-black p-3 bg-white">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-black">Q{item.question_num}</span>
                      <span className="text-xs text-black">
                        Class Correct: <span className="font-bold">{item.correct_count}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold">
                        You: ✖ {item.student_option}
                      </span>
                      <span className="font-bold">
                        Correct: ✔ {item.correct_option}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Previous Year Question Cloud - Text only */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Previous Year Question Cloud</h2>
          <div className="border-2 border-black p-6 min-h-[150px] flex items-center justify-center bg-gray-100 rounded-md print:bg-white">
          <div className="text-center space-y-3">
            {data.previous_year_topics && data.previous_year_topics.length > 0 ? (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  {data.previous_year_topics.map((topic, index) => (
                    <span
                      key={index}
                      className="text-black font-semibold"
                      style={{
                        fontSize: `${topic.fontSize || 14}px`,
                        fontWeight: 500 + (topic.neet_weight || 0) * 300,
                      }}
                      title={`${topic.subject} - Accuracy: ${(topic.accuracy * 100).toFixed(1)}% - NEET Weight: ${(topic.neet_weight * 100).toFixed(0)}%`}
                    >
                      {topic.chapter}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-black italic border-t border-black pt-2">Focus areas based on your performance and NEET weightage</p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Genetics', 'Cell Division', 'Organic Chemistry', 'Thermodynamics', 'Ecology'].map((topic, index) => (
                    <span 
                      key={index}
                      className="text-black font-semibold"
                      style={{ fontSize: `${12 + Math.random() * 6}px` }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-black italic border-t border-black pt-2">Key topics from previous years</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Motivational Footer - No emojis */}
      <div className="text-center py-4 border-2 border-black bg-gray-50 rounded-md">
        <p className="text-sm italic text-black">
          "You're doing super good and progressing great – <span className="font-bold">Keep it up!</span>"
        </p>
      </div>
    </div>
  );
};

// Helper Component: Modern B&W Card with Pattern Strip (scoped to metrics)
const BWCard = ({ label, value, patternId, highlight = false }) => (
  <div className="border-2 border-black bg-white flex items-stretch shadow-none rounded-md" style={{ overflow: 'hidden' }}>
    {/* Pattern strip on left edge - uses subject-like pattern when provided */}
    <svg width="14" height="100%" preserveAspectRatio="none" className="hidden sm:block">
      <rect width="14" height="100%" fill={patternId ? `url(#${patternId})` : '#000'} />
    </svg>
    <div className="flex-1 p-4">
      <p className="text-xs uppercase tracking-wide font-semibold text-black mb-2">{label}</p>
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-extrabold text-black leading-tight">{value}</p>
        {typeof highlight === 'boolean' && (
          <span className="text-sm font-semibold" aria-hidden>
            {highlight ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div className="mt-2 border-t border-dashed border-black pt-2">
        <p className="text-xs text-gray-700">&nbsp;</p>
      </div>
    </div>
  </div>
);

// Helper Component: Subject Tag with Pattern Block
const SubjectTagBW = ({ subject, getSubjectPattern }) => {
  const pattern = getSubjectPattern(subject);
  return (
    <div className="flex items-center gap-2">
      <svg width="16" height="16">
        <rect width="16" height="16" fill={`url(#${pattern.id})`} stroke="black" strokeWidth="1" />
      </svg>
      <span className="font-bold text-xs text-black">{subject}</span>
    </div>
  );
};

// Helper Component: Subject Pie Chart B&W (Pattern-based)
const SubjectPieChartBW = ({ subject, getSubjectPattern }) => {
  const pattern = getSubjectPattern(subject.subject);
  
  const pieData = [
    { name: 'Correct', value: subject.correct_count, fill: '#000' }, // Solid black
    { name: 'Incorrect', value: subject.incorrect_count, fill: `url(#${pattern.id})` }, // Subject pattern
    { name: 'Skipped', value: subject.skipped_count, fill: '#fff', stroke: '#000' } // White with border
  ].filter(item => item.value > 0);

  return (
    <div className="border-2 border-black p-3 bg-white rounded-md">
      <div className="flex items-center justify-center gap-2 mb-2">
        <svg width="12" height="12">
          <rect width="12" height="12" fill={`url(#${pattern.id})`} stroke="black" strokeWidth="1" />
        </svg>
        <h3 className="text-center font-bold text-black text-sm">{subject.subject}</h3>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={25}
            outerRadius={50}
            dataKey="value"
            label={false}
            stroke="#000"
            strokeWidth={1}
          >
            {pieData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} stroke={entry.stroke || '#000'} strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-1 text-xs border-t border-black pt-2">
        {pieData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {item.fill && typeof item.fill === 'string' && item.fill.startsWith('url(') ? (
                <svg width="12" height="12">
                  <rect width="12" height="12" fill={item.fill} stroke="black" strokeWidth="1" />
                </svg>
              ) : (
                <div className="w-3 h-3 border border-black rounded-sm" style={{ background: item.fill }}></div>
              )}
              <span className="text-black">{item.name}</span>
            </div>
            <span className="font-bold text-black">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="text-center mt-2 text-xs font-bold text-black border-t border-black pt-2">
        Avg: {subject.subject_average_marks}
      </p>
    </div>
  );
};

// Helper function to format trend data for total marks
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

export default StudentReportCard;
