import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

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

export default function Report() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadReportCard = async () => {
      try {
        const query = new URLSearchParams(window.location.search);
        const studentId = query.get("studentId");
        const testIdParam = query.get("testId");
        const educatorId = query.get("educatorId");
        
        console.log('[Report] URL Parameters:', { studentId, testIdParam, educatorId });
        
        // Parse testId: handle "Test 1", "1", "Overall", null
        let testNum = null;
        if (testIdParam && testIdParam !== "Overall") {
          const match = String(testIdParam).match(/\d+/);
          if (match) {
            testNum = parseInt(match[0], 10);
          }
        }

        const token = localStorage.getItem('token');
        if (!token) {
          setError("No authentication token found. Please log in again.");
          return;
        }

        setLoading(true);
        
        // Fetch report card data from backend
        // The backend get_student_report_card endpoint will work for both educator and institution contexts
        // because it uses the JWT to determine the user's context
        const response = await axios.post(
          `${API_BASE_URL}/student/report-card/`,
          { 
            test_num: testNum,
            student_id: studentId // Pass student_id for educator/institution context
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        setReportData(response.data);
        setError(null);
        
        // Set PDF ready flag
        console.log('[Report] Data loaded successfully, setting __PDF_READY__');
        if (typeof window !== 'undefined') {
          window.__PDF_READY__ = true;
        }
      } catch (err) {
        console.error('[Report] Error loading report card:', err);
        setError('Failed to load report card data');
      } finally {
        setLoading(false);
      }
    };

    loadReportCard();
  }, []);

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
        <div className="text-center">
          <p className="text-black text-lg mb-4">{error || 'No data available'}</p>
        </div>
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
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
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
          
          body {
            background: white !important;
          }
          
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
          
          svg pattern line,
          svg pattern circle {
            stroke: black !important;
            fill: black !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-white" style={{ padding: '0' }}>
        <div className="print-page" style={{ maxWidth: '210mm', margin: '0 auto' }}>
          <Page1 
            data={page1} 
            getSubjectPattern={getSubjectPattern}
          />
        </div>
        <div className="print-page" style={{ maxWidth: '210mm', margin: '0 auto' }}>
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
    <div className="bg-white" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div className="w-full bg-gray-200 border border-black rounded-md" style={{ padding: '12px 0' }}>
        <div className="text-center">
          <h1 className="font-bold text-black" style={{ fontSize: '20px' }}>Dr. {data.student_name}</h1>
          <p className="font-semibold text-black" style={{ fontSize: '11px', marginTop: '2px' }}>Student Performance Report</p>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
        <h2 className="font-bold text-black border-b-2 border-black pb-1" style={{ fontSize: '14px', marginBottom: '8px' }}>Subject-wise Performance</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {subjectWiseData?.map((subject, index) => (
            <SubjectPieChartBW 
              key={index}
              subject={subject}
              getSubjectPattern={getSubjectPattern}
            />
          ))}
        </div>
      </div>

      {/* Performance Trend */}
      <div>
        <h2 className="font-bold text-black border-b-2 pb-1" style={{ fontSize: '14px', marginBottom: '8px', borderBottomColor: 'rgba(0,0,0,0.6)' }}>Performance Trend</h2>
        <div className="rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)', padding: '8px' }}>
          <ResponsiveContainer width="94%" height={140}>
            <LineChart
              data={formatTotalTrendData(performanceTrend)}
              margin={{ top: 20, right: 45, left: 18, bottom: 10 }}
            >
              <XAxis
                dataKey="test_num"
                stroke="rgba(0,0,0,0.7)"
                tick={{ fill: 'rgba(0,0,0,0.7)', fontSize: 8 }}
                height={30}
                interval={0}
              />
              <YAxis
                domain={[dataMin => Math.max(0, dataMin - 20), dataMax => dataMax + 20]}
                stroke="rgba(0,0,0,0.7)"
                tick={{ fill: 'rgba(0,0,0,0.7)', fontSize: 8 }}
                width={40}
              />
              <Tooltip formatter={(value) => [value, 'Total Marks']} contentStyle={{ color: 'rgba(0,0,0,0.7)', fontSize: 9 }} />
              <Legend wrapperStyle={{ color: 'rgba(0,0,0,0.7)', fontSize: 9 }} />
              <Line
                type="monotone"
                dataKey="total_marks"
                stroke="rgba(0,0,0,0.7)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'rgba(0,0,0,0.7)', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 1 }}
              >
                <LabelList dataKey="total_marks" position="top" dy={-4} style={{ fontSize: 9, fontWeight: 'bold', fill: 'rgba(0,0,0,0.7)' }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mistakes to Focus On */}
      <div>
        <h2 className="font-bold text-black pb-1 border-b-2" style={{ fontSize: '14px', marginBottom: '8px', borderBottomColor: 'rgba(0,0,0,0.6)' }}>Mistakes to Focus On</h2>
        <div className="overflow-x-auto rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}>
                <th className="font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', textAlign: 'left', fontSize: '10px' }}>S.no</th>
                <th className="font-bold" style={{ minWidth: '100px', border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', textAlign: 'left', fontSize: '10px' }}>Subject</th>
                <th className="font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', textAlign: 'left', fontSize: '10px' }}>Subtopic</th>
                <th className="font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', textAlign: 'left', fontSize: '10px' }}>Mistake Detail</th>
                <th className="font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', textAlign: 'center', fontSize: '10px' }}>✓</th>
              </tr>
            </thead>
            <tbody>
              {mistakesTable?.map((mistake, index) => (
                <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`} style={{ border: '1px solid rgba(0,0,0,0.6)' }}>
                  <td className="font-semibold" style={{ fontSize: '10px', border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px' }}>{index + 1}</td>
                  <td style={{ fontSize: '10px', minWidth: '100px', border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px' }}>
                    <div style={{ display: 'inline-block' }}>
                      <SubjectTagBW subject={mistake.subject} getSubjectPattern={getSubjectPattern} />
                    </div>
                  </td>
                  <td style={{ fontSize: '10px', border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px' }}>{mistake.subtopic}</td>
                  <td style={{ fontSize: '10px', border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px' }}>{mistake.checkpoint || mistake.mistake_detail || ''}</td>
                  <td style={{ fontSize: '10px', border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', textAlign: 'center' }}>
                    <div
                      className="rounded-sm flex items-center justify-center font-bold bg-white text-black mx-auto"
                      style={{ border: '2px solid rgba(0,0,0,0.6)', width: '16px', height: '16px' }}
                    >
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    <div className="bg-white" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div className="w-full bg-gray-200 rounded-md" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '12px 0' }}>
        <div className="text-center">
          <h1 className="font-bold text-black" style={{ fontSize: '20px' }}>Study Planner & Insights</h1>
          <p className="font-semibold text-black" style={{ fontSize: '11px', marginTop: '2px' }}>Personalized plan and key insights</p>
        </div>
      </div>

      {/* 6-Day Study Plan */}
      <div>
        <h2 className="font-bold text-black border-b-2 border-black pb-1" style={{ fontSize: '14px', marginBottom: '8px' }}>6-Day Study Plan</h2>
        <div className="overflow-x-auto rounded-md" style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.6)' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}>
                <th className="text-center font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', fontSize: '10px' }}>Day</th>
                {subjects.map((subject, index) => (
                  <th key={index} className="text-center font-bold relative" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', fontSize: '10px' }}>
                    <div>{subject}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studyPlanner?.map((day, index) => (
                <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`} style={{ border: '1px solid rgba(0,0,0,0.6)' }}>
                  <td className="text-center font-bold" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px', fontSize: '10px' }}>Day {day.day}</td>
                  {subjects.map((subject, subIndex) => (
                    <td key={subIndex} className="text-center" style={{ border: '1px solid rgba(0,0,0,0.6)', padding: '6px 8px' }}>
                      {day[subject] ? (
                        <span className="text-black" style={{ fontSize: '9px' }}>{day[subject]}</span>
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
        <h2 className="font-bold text-black border-b-2 border-black pb-1" style={{ fontSize: '14px', marginBottom: '8px' }}>Frequent Mistakes</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {frequentMistakes?.map((mistake, index) => (
            <div 
              key={index}
              className="overflow-hidden rounded-md"
              style={{ border: '2px solid rgba(0,0,0,0.6)' }}
            >
              <svg width="100%" height="18">
                <rect width="100%" height="18" fill={`url(#${getSubjectPattern(mistake.subject).id})`} />
              </svg>
              <div className="bg-white" style={{ padding: '8px' }}>
                <h3 className="font-bold text-black" style={{ fontSize: '10px', marginBottom: '3px' }}>{mistake.subject}</h3>
                <p className="text-black" style={{ fontSize: '9px', marginBottom: '4px' }}>{mistake.subtopic}</p>
                <p className="font-bold text-black" style={{ fontSize: '16px' }}>{mistake.frequency} Times</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class vs You */}
      <div>
        <h2 className="font-bold text-black border-b-2 border-black pb-1" style={{ fontSize: '14px', marginBottom: '8px' }}>Class vs You</h2>
        <div className="bg-gray-50 rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)', padding: '10px' }}>
          <p className="text-black font-semibold" style={{ fontSize: '10px', marginBottom: '8px' }}>
            Questions where most of the class got it right, but you got it wrong:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {classVsYou?.slice(0, 3).map((item, index) => (
              <div key={index} className="border border-black bg-white" style={{ padding: '8px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center" style={{ gap: '10px' }}>
                    <span className="font-bold text-black" style={{ fontSize: '10px' }}>Q{item.question_num}</span>
                    <span className="text-black" style={{ fontSize: '9px' }}>
                      Class Correct: <span className="font-bold">{item.correct_count}</span>
                    </span>
                  </div>
                  <div className="flex items-center" style={{ gap: '10px' }}>
                    <span className="font-bold" style={{ fontSize: '9px' }}>
                      You: X {item.student_option}
                    </span>
                    <span className="font-bold" style={{ fontSize: '9px' }}>
                      Correct: O {item.correct_option}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivational quote */}
      <div className="text-center bg-gray-50 rounded-md" style={{ border: '2px solid rgba(0,0,0,0.6)', padding: '10px' }}>
        <p className="italic text-black" style={{ fontSize: '11px' }}>
          "You're doing super good and progressing great – <span className="font-bold">Keep it up!</span>"
        </p>
      </div>
    </div>
  );
};

// Helper Component: Modern B&W Card with Pattern Strip
const BWCard = ({ label, value, patternId }) => (
  <div className="border-2 border-black bg-white flex items-stretch shadow-none rounded-md" style={{ overflow: 'hidden', maxHeight: '75px' }}>
    <svg width="10" height="100%" preserveAspectRatio="none">
      <rect width="10" height="100%" fill={patternId ? `url(#${patternId})` : '#000'} />
    </svg>
    <div className="flex-1 flex flex-col justify-center" style={{ padding: '6px 10px' }}>
      <p className="uppercase tracking-wide font-semibold text-black" style={{ fontSize: '9px', marginBottom: '2px', lineHeight: '1.1' }}>{label}</p>
      <p className="font-extrabold text-black" style={{ fontSize: '22px', lineHeight: '1' }}>{value}</p>
    </div>
  </div>
);

// Helper Component: Subject Tag with Pattern Block
const SubjectTagBW = ({ subject, getSubjectPattern }) => {
  const pattern = getSubjectPattern(subject);
  return (
    <div className="flex items-center" style={{ gap: '4px' }}>
      <svg width="10" height="10">
        <rect width="10" height="10" fill={`url(#${pattern.id})`} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
      </svg>
      <span className="font-bold text-black" style={{ fontSize: '9px' }}>{subject}</span>
    </div>
  );
};

// Helper Component: Subject Pie Chart B&W (Pattern-based)
const SubjectPieChartBW = ({ subject, getSubjectPattern }) => {
  const pattern = getSubjectPattern(subject.subject);
  
  const pieData = [
    { name: 'Correct', value: subject.correct_count, fill: 'rgba(0,0,0,0.6)' },
    { name: 'Incorrect', value: subject.incorrect_count, fill: `url(#${pattern.id})` },
    { name: 'Skipped', value: subject.skipped_count, fill: '#fff', stroke: 'rgba(0,0,0,0.6)' }
  ].filter(item => item.value > 0);

  const avgMarks = subject.subject_average_marks || 0;

  return (
    <div className="border-2 border-black rounded-md bg-white" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <h3 className="font-bold text-black text-center" style={{ fontSize: '11px', marginBottom: '2px' }}>{subject.subject}</h3>
      <div style={{ width: '100%', height: '80px', display: 'flex', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={15}
              outerRadius={30}
              dataKey="value"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={1}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.stroke || 'rgba(0,0,0,0.6)'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center" style={{ marginTop: '-4px' }}>
        <p className="text-black" style={{ fontSize: '9px', lineHeight: '1.2' }}>Avg: <span className="font-bold">{avgMarks}</span></p>
      </div>
    </div>
  );
};

// Helper function to format trend data for total marks
const formatTotalTrendData = (subWiseMarks) => {
  if (!subWiseMarks || typeof subWiseMarks !== 'object') return [];
  
  const testNums = Object.keys(subWiseMarks).sort((a, b) => parseInt(a) - parseInt(b));
  
  return testNums.map(testNum => {
    const subjects = subWiseMarks[testNum];
    const total = Object.values(subjects || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
    
    return {
      test_num: `Test ${testNum}`,
      total_marks: total
    };
  });
};