import { useEffect, useState } from "react";
import { fetchStudentReportCard } from "../../utils/api";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";

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

export default function StudentReport() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read testId from query and fetch report card data
  useEffect(() => {
    const loadReportCard = async () => {
      try {
        const q = new URLSearchParams(window.location.search);
        const testIdParam = q.get('testId');
        
        // Parse testId: handle "Test 1", "1", null
        let testNum = null;
        if (testIdParam) {
          const match = String(testIdParam).match(/\d+/);
          if (match) {
            testNum = parseInt(match[0], 10);
          }
        }
        
        setLoading(true);
        const data = await fetchStudentReportCard(testNum);
        setReportData(data);
      } catch (err) {
        setError('Failed to load report card data');
      } finally {
        setLoading(false);
        // Set PDF ready flag after a short delay to ensure rendering is complete
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.__PDF_READY__ = true;
          }
        }, 500);
      }
    };
    loadReportCard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        <div className="font-bold text-lg">Generating student report...</div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="p-8 text-center text-red-600">
        <div className="font-bold text-lg mb-2">Error loading report</div>
        <div>{error || 'No data available'}</div>
      </div>
    );
  }

  const { page1, page2 } = reportData;

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
      `}</style>

      <div className="min-h-screen bg-white p-4 md:p-8">
        <div className="print-page">
          <Page1 
            data={page1} 
            getSubjectPattern={getSubjectPattern}
          />
        </div>
        <div className="print-page">
          <Page2 
            data={page2} 
            getSubjectPattern={getSubjectPattern}
          />
        </div>
      </div>
    </>
  );
}

// Page 1 Component: Performance Report (B&W Version)
const Page1 = ({ data, getSubjectPattern }) => {
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
      {/* Header with Student Name */}
      <div className="w-full bg-gray-200 border border-black py-4 rounded-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black">Dr. {data.student_name}</h1>
          <p className="text-sm font-semibold text-black mt-1">Student Performance Report</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BWCard 
          label="Your Marks" 
          value={`${data.total_marks} / 720`}
          patternId="pattern-botany"
        />
        <BWCard 
          label="Your Improvement"
          value={`${Math.abs(data.improvement_percentage)}%`}
          patternId="pattern-physics"
        />
        <BWCard 
          label="Average Marks" 
          value={data.average_marks}
          patternId="pattern-chemistry"
        />
      </div>

      {/* Subject-wise Performance */}
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
            <p className="text-sm font-semibold text-black text-center italic " style={{ fontSize: '1.1em' }}>{message}</p>
          </div>
        );
      })()}

      {/* Performance Trend */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 pb-2" style={{ borderBottom: '2px solid rgba(0,0,0,0.6)' }}>Performance Trend</h2>
        <div className="p-4 rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)' }}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={formatTotalTrendData(performanceTrend)}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="test_num"
                label={{ value: 'Test Number', position: 'insideBottom', offset: -5 }}
                padding={{ left: 20, right: 20 }}
                stroke="rgba(0,0,0,0.7)"
                tick={{ fill: 'rgba(0,0,0,0.7)' }}
              />
              <YAxis
                label={{ value: 'Total Marks', angle: -90, position: 'insideLeft' }}
                domain={[dataMin => Math.max(0, dataMin - 20), dataMax => dataMax + 20]}
                stroke="rgba(0,0,0,0.7)"
                tick={{ fill: 'rgba(0,0,0,0.7)' }}
              />
              <Tooltip formatter={(value) => [value, 'Total Marks']} contentStyle={{ color: 'rgba(0,0,0,0.7)' }} />
              <Legend wrapperStyle={{ color: 'rgba(0,0,0,0.7)' }} />
              <Line
                type="monotone"
                dataKey="total_marks"
                stroke="rgba(0,0,0,0.7)"
                strokeWidth={3}
                dot={{ r: 6, fill: 'rgba(0,0,0,0.7)', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 1.5 }}
              >
                <LabelList dataKey="total_marks" position="top" dy={-8} style={{ fontSize: 14, fontWeight: 'bold', fill: 'rgba(0,0,0,0.7)' }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mistakes Table */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 pb-2" style={{ borderBottom: '2px solid rgba(0,0,0,0.6)' }}>Mistakes to Focus On</h2>
        <div className="overflow-x-auto rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}>
                <th className="p-2 text-left font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>S.no</th>
                <th className="p-2 text-left font-bold" style={{ minWidth: '120px', border: '1px solid rgba(0,0,0,0.6)' }}>Subject</th>
                <th className="p-2 text-left font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>Subtopic</th>
                <th className="p-2 text-left font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>Mistake Detail</th>
                <th className="p-2 text-center font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>✓</th>
              </tr>
            </thead>
            <tbody>
              {mistakesTable?.map((mistake, index) => (
                <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`} style={{ border: '1px solid rgba(0,0,0,0.6)' }}>
                  <td className="p-2 font-semibold" style={{ fontSize: '1.1em', border: '1px solid rgba(0,0,0,0.6)' }}>{index + 1}</td>
                  <td className="p-2" style={{ fontSize: '1.1em', minWidth: '120px', border: '1px solid rgba(0,0,0,0.6)' }}>
                    <div style={{ display: 'inline-block' }}>
                      <SubjectTagBW subject={mistake.subject} getSubjectPattern={getSubjectPattern} />
                    </div>
                  </td>
                  <td className="p-2 text-sm" style={{ fontSize: '1.1em', border: '1px solid rgba(0,0,0,0.6)' }}>{mistake.subtopic}</td>
                  <td className="p-2 text-sm" style={{ fontSize: '1.1em', border: '1px solid rgba(0,0,0,0.6)' }}>{mistake.checkpoint || mistake.mistake_detail || ''}</td>
                  <td className="p-2 text-center" style={{ fontSize: '1.1em', border: '1px solid rgba(0,0,0,0.6)' }}>
                    <div
                      className="w-5 h-5 rounded-sm flex items-center justify-center font-bold bg-white text-black mx-auto"
                      style={{ border: '2px solid rgba(0,0,0,0.6)' }}
                    >
                      {/* Empty checkbox for PDF */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Encouragement Message */}
      <div className="text-center py-4 border-2 border-black bg-gray-50 rounded-md">
        <p className="text-sm italic text-black " style={{ fontSize: '1.1em' }}>
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
      <div className="w-full bg-gray-200 py-4 rounded-md" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black">Study Planner & Insights</h1>
          <p className="text-sm font-semibold text-black mt-1">Personalized plan and key insights</p>
        </div>
      </div>

      {/* Study Planner Table - Pattern underlines for subjects */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">6-Day Study Plan</h2>
        <div className="overflow-x-auto rounded-md" style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.6)' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}>
                <th className="p-2 text-center font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>Day</th>
                {subjects.map((subject, index) => (
                  <th key={index} className="p-2 text-center font-bold relative" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>
                    <div>{subject}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studyPlanner?.map((day, index) => (
                <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`} style={{ border: '1px solid rgba(0,0,0,0.6)' }}>
                  <td className="p-2 text-center font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>Day {day.day}</td>
                  {subjects.map((subject, subIndex) => (
                    <td key={subIndex} className="p-2 text-center" style={{ border: '1px solid rgba(0,0,0,0.6)' }}>
                      {day[subject] ? (
                        <span className="text-xs text-black" style={{ fontSize: '1.1em' }}>{day[subject]}</span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequent Mistakes */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Frequent Mistakes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {frequentMistakes?.map((mistake, index) => (
            <div 
              key={index}
              className="overflow-hidden rounded-md"
              style={{ border: '2px solid rgba(0,0,0,0.6)' }}
            >
              {/* Pattern header strip */}
              <svg width="100%" height="24">
                <rect width="100%" height="24" fill={`url(#${getSubjectPattern(mistake.subject).id})`} />
              </svg>
              <div className="p-3 bg-white">
                <h3 className="text-sm font-bold mb-1 text-black" style={{ fontSize: '1.1em' }}>{mistake.subject}</h3>
                <p className="text-xs mb-2 text-black" style={{ fontSize: '1.1em' }}>{mistake.subtopic}</p>
                <p className="text-2xl font-bold text-black">{mistake.frequency} Times</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class vs You */}
      <div>
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">Class vs You</h2>
        <div className="p-4 bg-gray-50 rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)' }}>
          <p className="text-xs text-black mb-3 font-semibold" style={{ fontSize: '1.1em' }}>
            Questions where most of the class got it right, but you got it wrong:
          </p>
          <div className="space-y-2">
            {classVsYou?.slice(0, 3).map((item, index) => (
              <div key={index} className="border border-black p-3 bg-white">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-black" style={{ fontSize: '1.1em' }}>Q{item.question_num}</span>
                    <span className="text-xs text-black" style={{ fontSize: '1.1em' }}>
                      Class Correct: <span className="font-bold">{item.correct_count}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold" style={{ fontSize: '1.1em' }}>
                      You: ✖ {item.student_option}
                    </span>
                    <span className="font-bold" style={{ fontSize: '1.1em' }}>
                      Correct: ✔ {item.correct_option}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivational Footer - No emojis */}
      <div className="text-center py-4 bg-gray-50 rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)' }}>
        <p className="text-sm italic text-black " style={{ fontSize: '1.1em' }}>
          "You're doing super good and progressing great – <span className="font-bold">Keep it up!</span>"
        </p>
      </div>
    </div>
  );
};

// Helper Component: Modern B&W Card with Pattern Strip
const BWCard = ({ label, value, patternId }) => (
  <div className="border-2 border-black bg-white flex items-stretch shadow-none rounded-md" style={{ overflow: 'hidden' }}>
    <svg width="14" height="100%" preserveAspectRatio="none" className="hidden sm:block">
      <rect width="14" height="100%" fill={patternId ? `url(#${patternId})` : '#000'} />
    </svg>
    <div className="flex-1 p-4">
      <p className="text-xs uppercase tracking-wide font-semibold text-black mb-2">{label}</p>
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-extrabold text-black leading-tight" style={{ fontSize: '2.0625rem' }}>{value}</p>
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
          <rect width="16" height="16" fill={`url(#${pattern.id})`} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
        </svg>
      <span className="font-bold text-xs text-black">{subject}</span>
    </div>
  );
};

// Helper Component: Subject Pie Chart B&W (Pattern-based)
const SubjectPieChartBW = ({ subject, getSubjectPattern }) => {
  const pattern = getSubjectPattern(subject.subject);
  
  const pieData = [
    { name: 'Correct', value: subject.correct_count, fill: 'rgba(0,0,0,0.6)' }, // Soft black for print
    { name: 'Incorrect', value: subject.incorrect_count, fill: `url(#${pattern.id})` }, // Subject pattern
    { name: 'Skipped', value: subject.skipped_count, fill: '#fff', stroke: 'rgba(0,0,0,0.6)' } // White with softened border
  ].filter(item => item.value > 0);

  return (
    <div className="border-2 border-black p-3 bg-white rounded-md">
      <div className="flex items-center justify-center gap-2 mb-2">
          <svg width="12" height="12">
          <rect width="12" height="12" fill={`url(#${pattern.id})`} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
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
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={1}
          >
            {pieData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} stroke={entry.stroke || 'rgba(0,0,0,0.6)'} strokeWidth={1} />
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
                  <rect width="12" height="12" fill={item.fill} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
                </svg>
              ) : (
                <div className="w-3 h-3 rounded-sm" style={{ background: item.fill, border: '1px solid rgba(0,0,0,0.6)' }}></div>
              )}
              <span className="text-black" style={{ fontSize: '1.1em' }}>{item.name}</span>
            </div>
            <span className="font-bold text-black" style={{ fontSize: '1.1em' }}>{item.value}</span>
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
  if (!subWiseMarks || typeof subWiseMarks !== 'object') return [];
  
  const testNums = Object.keys(subWiseMarks).sort((a, b) => Number(a) - Number(b));
  
  return testNums.map(testNum => {
    const marks = subWiseMarks[testNum];
    let total = 0;
    if (marks && typeof marks === 'object') {
      total = Object.values(marks).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }
    return {
      test_num: `Test ${testNum}`,
      total_marks: total
    };
  });
}

