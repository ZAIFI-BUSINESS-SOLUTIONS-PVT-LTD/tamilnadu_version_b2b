import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList
} from "recharts";
import { fetchEducatorStudentInsights, fetcheducatorstudent, fetchEducatorAllStudentResults } from "../../utils/api";

// --- Dummy chart data constants for educator reports ---
const DUMMY_SUBJECT_TOTALS = [
  { subject: "Physics", total: 160 },
  { subject: "Chemistry", total: 170 },
  { subject: "Botany", total: 180 },
  { subject: "Zoology", total: 150 },
];
const DUMMY_ERROR_DATA = [
  { name: "Conceptual", value: 50 },
  { name: "Calculation", value: 35 },
  { name: "Careless", value: 15 },
];
const DUMMY_TREND_DATA = [
  { name: "Test 1", Physics: 60, Chemistry: 120, Botany: 150, Zoology: 70 },
  { name: "Test 2", Physics: 170, Chemistry: 150, Botany: 50, Zoology: 170 },
  { name: "Test 3", Physics: 150, Chemistry: 160, Botany: 150, Zoology: 180 },
  { name: "Test 4", Physics: 180, Chemistry: 180, Botany: 160, Zoology: 180 },
  { name: "Test 5", Physics: 160, Chemistry: 160, Botany: 180, Zoology: 180 },
];

// --- SWOT helpers ---
const metricToCategoryMap = {
  TS_BPT: { category: 'Strengths', subtitle: 'Best Performing Topics' },
  TW_MCT: { category: 'Weaknesses', subtitle: 'Most Challenging Topics' },
  TO_RLT: { category: 'Opportunities', subtitle: 'Rapid Learning Topics' },
  TT_WHIT: { category: 'Threats', subtitle: 'Weakness on High Impact Topics' },
};

function formatTopics(topics) {
  return Array.isArray(topics) && topics.length ? topics.join('\n') : 'No data available';
}

function transformSwotData(rawData) {
  if (!rawData || typeof rawData !== 'object') return { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };
  const organized = { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };
  const primaryMetrics = {
    Strengths: 'TS_BPT',
    Weaknesses: 'TW_MCT',
    Opportunities: 'TO_RLT',
    Threats: 'TT_WHIT',
  };
  for (const [category, metric] of Object.entries(primaryMetrics)) {
    const subjectMap = rawData[metric];
    if (subjectMap && typeof subjectMap === 'object') {
      for (const [subject, topics] of Object.entries(subjectMap)) {
        organized[category].push({
          subject,
          topics: Array.isArray(topics) ? topics : [],
          subtitle: metricToCategoryMap[metric]?.subtitle,
        });
      }
    }
  }
  return organized;
}

function getSwotSubtitle(category) {
  switch (category) {
    case 'Strengths': return 'Best Performing Topics';
    case 'Weaknesses': return 'Most Challenging Topics';
    case 'Opportunities': return 'Rapid Learning Topics';
    case 'Threats': return 'Weakness on High Impact Topics';
    default: return '';
  }
}

export default function Report() {
  const [reportData, setReportData] = useState(null);
  const [studentChartData, setStudentChartData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const studentId = query.get("studentId");
    const test = query.get("testId");
    let testNum = 0;
    if (test && test !== "Overall") {
      testNum = Number(test);
      if (isNaN(testNum)) {
        const parts = test.split(" ");
        testNum = Number(parts[1]) || 0;
      }
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError("No authentication token found. Please log in again.");
      setReportData(null);
      setStudentChartData(null);
      return;
    }

    // Fetch all report data in parallel (educator endpoints)
    const fetchAllData = async () => {
      try {
        // Fetch student details (educator endpoint)
        const studentsList = await fetcheducatorstudent();
        const studentDetails = (studentsList.students || []).find(s => String(s.student_id) === String(studentId)) || {};
        if (!studentDetails.student_id) throw new Error("Student not found in educator's list");

        // Fetch dashboard/insights (educator endpoint)
        const dashboard = await fetchEducatorStudentInsights(studentId, testNum);
        if (dashboard?.error) throw new Error(dashboard.error);

        // Use SWOT from EducatorStudentInsights (dashboard)
        const swotRaw = dashboard.swot || {};
        const swotData = transformSwotData(swotRaw);

        // Fetch all student results for educator (for number of tests attended & subject marks)
        const allResults = await fetchEducatorAllStudentResults();
        // Filter results for this student
        let studentResultsArr = [];
        if (Array.isArray(allResults?.results)) {
          studentResultsArr = allResults.results.filter(r => String(r.student_id) === String(studentId));
        }
        // Number of tests attended
        const testsAttended = studentResultsArr.length;
        // Subject marks (latest or selected test)
        let subjectMarks = {};
        let testData = null;
        let selectedTestInfo = null;
        if (studentResultsArr.length > 0) {
          if (testNum > 0) {
            testData = studentResultsArr.find(t => String(t.test_num) === String(testNum));
          }
          if (!testData) {
            // Use latest test (highest test_num)
            testData = studentResultsArr.reduce((a, b) => (a.test_num > b.test_num ? a : b));
          }
          if (testData) {
            subjectMarks = {
              Physics: testData.phy_score,
              Chemistry: testData.chem_score,
              Botany: testData.bot_score,
              Zoology: testData.zoo_score
            };
            selectedTestInfo = {
              totalMarks: (testData.phy_score ?? 0) + (testData.chem_score ?? 0) + (testData.bot_score ?? 0) + (testData.zoo_score ?? 0),
              testNum: testData.test_num
            };
          }
        }

        const summaryOrder = [
          "Overall Performance",
          "Improvement Rate",
          "Consistency Score",
          "Tests Taken"
        ];
        const summaryData = summaryOrder.map((title) => {
          const found = (dashboard.overview?.summaryCardsData || []).find(card => card.title === title);
          let value = found ? found.value : "-";
          if (value !== "-" && typeof value === "string" && value.match(/^-?\d*\.?\d+%?$/)) {
            // If value is a number or percent string, format to 1 decimal
            const isPercent = value.includes("%");
            const num = parseFloat(value);
            if (!isNaN(num)) {
              value = isPercent ? num.toFixed(1) + "%" : num.toFixed(1);
            }
          }
          return { title, value };
        });
        setReportData({
          student: {
            name: studentDetails?.name || "Student",
            student_id: studentDetails?.student_id || studentId,
            inst: studentDetails?.institution || studentDetails?.inst || "-"
          },
          summaryData,
          swotData,
          subjectMarks, // add subject marks for use in UI
          selectedTestInfo, // add selected test info for UI
        });
        // --- Transform dashboard data for charts (same as dashboard hook) ---
        // Subject Totals (aggregate per subject)
        let subjectTotals = [];
        if (Object.keys(subjectMarks).length > 0) {
          // Use subjectMarks from latest/selected test for the bar chart
          subjectTotals = [
            { subject: "Physics", total: subjectMarks.Physics ?? 0 },
            { subject: "Chemistry", total: subjectMarks.Chemistry ?? 0 },
            { subject: "Botany", total: subjectMarks.Botany ?? 0 },
            { subject: "Zoology", total: subjectMarks.Zoology ?? 0 },
          ];
        } else if (Array.isArray(dashboard.subjectWiseDataMapping)) {
          const totals = { Physics: 0, Chemistry: 0, Botany: 0, Zoology: 0 };
          dashboard.subjectWiseDataMapping.forEach(row => {
            totals.Physics += row.Physics || 0;
            totals.Chemistry += row.Chemistry || 0;
            totals.Botany += row.Botany || 0;
            totals.Zoology += row.Zoology || 0;
          });
          subjectTotals = Object.entries(totals).map(([subject, total]) => ({ subject, total }));
        } else {
          subjectTotals = DUMMY_SUBJECT_TOTALS;
        }
        // Error Data (if available, else fallback)
        const errorData = dashboard.errorDistribution || dashboard.errorData || DUMMY_ERROR_DATA;
        // Trend Data (last 5 tests, stacked bar per test, 4 subjects)
        let trendData = [];
        if (studentResultsArr.length > 0) {
          // Sort by test_num ascending
          const sortedTests = [...studentResultsArr].sort((a, b) => a.test_num - b.test_num);
          // Take last 5
          const last5 = sortedTests.slice(-5);
          trendData = last5.map(test => ({
            name: `Test ${test.test_num}`,
            Physics: test.phy_score ?? 0,
            Chemistry: test.chem_score ?? 0,
            Botany: test.bot_score ?? 0,
            Zoology: test.zoo_score ?? 0,
            total: (test.phy_score ?? 0) + (test.chem_score ?? 0) + (test.bot_score ?? 0) + (test.zoo_score ?? 0)
          }));
        } else if (dashboard.performanceTrendDataMapping?.subjects) {
          // fallback to old logic if needed
          const testNames = new Set();
          dashboard.performanceTrendDataMapping.subjects.forEach(subj => {
            (subj.tests || []).forEach(t => testNames.add(t.name));
          });
          trendData = Array.from(testNames).map(testName => {
            const entry = { name: testName };
            dashboard.performanceTrendDataMapping.subjects.forEach(subj => {
              const test = (subj.tests || []).find(t => t.name === testName);
              entry[subj.name] = test ? test.value : 0;
            });
            entry.total = (entry.Physics ?? 0) + (entry.Chemistry ?? 0) + (entry.Botany ?? 0) + (entry.Zoology ?? 0);
            return entry;
          });
        } else {
          trendData = DUMMY_TREND_DATA.map(row => ({ ...row, total: (row.Physics ?? 0) + (row.Chemistry ?? 0) + (row.Botany ?? 0) + (row.Zoology ?? 0) }));
        }
        // Add total marks to each trendData entry
        const trendDataWithTotal = trendData.map(entry => ({
          ...entry,
          total: (entry.Physics ?? 0) + (entry.Chemistry ?? 0) + (entry.Botany ?? 0) + (entry.Zoology ?? 0)
        }));
        setStudentChartData({ subjectTotals, errorData, trendData: trendDataWithTotal });
        setError(null);
      } catch (err) {
        // Debug: Log error object
        console.error("[Report] Error loading report data (educator endpoints):", err);
        setError(err.message || "Failed to load report data");
        setReportData(null);
        setStudentChartData(null);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (reportData && studentChartData) {
      window.__PDF_READY__ = true;
    }
  }, [reportData, studentChartData]);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <div className="font-bold text-lg mb-2">Error loading report</div>
        <div>{error}</div>
        {/* Debug: Show token and query params for troubleshooting */}
        <div className="mt-4 text-xs text-gray-500">
          <div>Token: {String(localStorage.getItem('token'))}</div>
          <div>studentId: {String(new URLSearchParams(window.location.search).get('studentId'))}</div>
          <div>testId: {String(new URLSearchParams(window.location.search).get('testId'))}</div>
        </div>
      </div>
    );
  }

  if (!reportData || !studentChartData)
    return <div className="p-8 text-center text-gray-600">Generating report...</div>;

  const ERROR_COLORS = ["#6366F1", "#EC4899", "#F59E0B"];
  const SUBJECT_COLORS = {
    Physics: "#d1d5db", // blue
    Chemistry: "#60a5fa", // gray-500
    Botany: "#9ca3af", // blue-400
    Zoology: "#2563eb" // gray-400
  };
  const SWOT_COLORS = {
    Strengths: {
      border: "border-green-300",
      title: "text-green-700",
    },
    Weaknesses: {
      border: "border-red-300",
      title: "text-red-700",
    },
    Opportunities: {
      border: "border-yellow-300",
      title: "text-yellow-700",
    },
    Threats: {
      border: "border-purple-300",
      title: "text-purple-700",
    },
  };
  // Helper to get teacher-specific SWOT category subtitles
  function getTeacherCategorySubtitle(category) {
    switch (category) {
      case 'Strengths': return 'Best Performing Topics';
      case 'Weaknesses': return 'Most Challenging Topics';
      case 'Opportunities': return 'Rapid Learning Topics';
      case 'Threats': return 'Weakness on High Impact Topics';
      default: return '';
    }
  }
  const { student, summaryData, swotData, subjectMarks = {}, selectedTestInfo } = reportData;
  const { subjectTotals, errorData, trendData } = studentChartData;

  const recommendations = [
    "Excellent overall performance with strong consistency. Keep up the good work!",
    "Continue to focus on conceptual clarity, especially in areas where 'Conceptual Errors' are noted.",
    "Consistent practice of numerical problems can help reduce 'Calculation Errors'.",
    "Review 'Careless Errors' carefully to identify patterns and avoid similar mistakes in future tests."
  ];

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-5xl mx-auto font-sans text-blue-900 bg-white p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-6 border border-blue-200 rounded-xl shadow-md">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              Student Performance Report
            </h1>
            <p className="text-sm text-gray-400">powered by <span className="text-xl font-bold text-gray-800">Inzight</span><span className="text-xl font-bold text-blue-500">Ed </span> </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-lg">{student.name}</p>
            <p className="text-sm text-blue-700">ID: {student.student_id}</p>
          </div>
        </div>

        {/* Selected Test Mark Section */}
        {selectedTestInfo && (
          <div className="w-fit mx-auto text-center text-base text-gray-800 font-regular border border-gray-200 px-6 py-2 rounded-full shadow-sm">
            You have obtained <span className="font-bold text-blue-500">{selectedTestInfo.totalMarks}</span> marks in test {selectedTestInfo.testNum}
          </div>
        )}

        {/* Top Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summaryData.map(({ title, value }, idx) => (
            <div key={idx} className="flex flex-col items-center border border-blue-200 bg-blue-100 p-3 rounded-lg">
              <span className="text-sm text-blue-700">{title}</span>
              <span className="text-2xl font-bold text-blue-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Subject Totals + Error Chart (Single Row, Two Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-6">
          <div className="border border-blue-200 bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-blue-800">Subject-wise Performance</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectTotals} isAnimationActive={false}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="subject" stroke="#1e3a8a" isAnimationActive={false} />
                  <YAxis stroke="#1e3a8a" domain={[0, 180]} isAnimationActive={false} />
                  <Tooltip isAnimationActive={false} />
                  <Legend isAnimationActive={false} />
                  <Bar dataKey="total" fill="#2563eb" maxBarSize={40} radius={[10, 10, 0, 0]} isAnimationActive={false}>
                    {subjectTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#2563eb" isAnimationActive={false} />
                    ))}
                    <LabelList dataKey="total" position="top" fill="#2563eb" fontSize={16} fontWeight={700} isAnimationActive={false} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-blue-200 bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-blue-800">Error Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart isAnimationActive={false}>
                  <Pie
                    data={errorData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    isAnimationActive={false}
                  >
                    {errorData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={['#2563eb', '#60a5fa', '#9ca3af'][idx % 3]} isAnimationActive={false} />
                    ))}
                  </Pie>
                  <Tooltip isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Trend Line */}
        <div className="border border-blue-200 bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-4">Test-wise Subject Performance & Total Trend</h2>
          <div className="h-80"> {/* Increased height from h-64 to h-80 */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barCategoryGap={20} barSize={45} isAnimationActive={false}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" isAnimationActive={false} />
                <YAxis domain={[0, 720]} tickCount={19} ticks={[0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560, 600, 640, 680, 720]} isAnimationActive={false} />
                <Tooltip isAnimationActive={false} />
                <Legend isAnimationActive={false} />
                <Bar dataKey="Physics" stackId="a" fill={SUBJECT_COLORS.Physics} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Physics" position="right" fill={SUBJECT_COLORS.Physics} fontSize={14} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar dataKey="Chemistry" stackId="a" fill={SUBJECT_COLORS.Chemistry} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Chemistry" position="right" fill={SUBJECT_COLORS.Chemistry} fontSize={14} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar dataKey="Botany" stackId="a" fill={SUBJECT_COLORS.Botany} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Botany" position="right" fill={SUBJECT_COLORS.Botany} fontSize={14} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar dataKey="Zoology" stackId="a" fill={SUBJECT_COLORS.Zoology} radius={[10, 10, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Zoology" position="right" fill={SUBJECT_COLORS.Zoology} fontSize={14} fontWeight={600} isAnimationActive={false} />
                  <LabelList dataKey="total" position="top" fill="#2563eb" fontSize={16} fontWeight={700} isAnimationActive={false} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="border p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-4">Key Takeaways & Recommendations</h2>
          <ul className="list-disc pl-5 space-y-2">
            {recommendations.map((item, idx) => (
              <li key={idx} className="text-gray-700">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* SWOT Analysis */}
        <div>
          <h2 className="text-xl font-bold text-center mt-20 mb-10">SWOT Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['Strengths', 'Weaknesses', 'Opportunities', 'Threats'].map((type) => (
              <div
                key={type}
                className={`border ${SWOT_COLORS[type].border} bg-white p-4 rounded-lg shadow-md`}
              >
                <h3 className={`font-bold mb-2 text-sm uppercase ${SWOT_COLORS[type].title}`}>
                  {type} ({getSwotSubtitle(type)})
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {swotData[type]?.length ? (
                    swotData[type].map((item, idx) => (
                      <li key={idx} className="text-gray-700">
                        <strong>{item.subject}:</strong>
                        <span className="whitespace-pre-wrap block ml-2">{formatTopics(item.topics)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="italic text-gray-400">No data</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pt-6 mt-6">
          Generated by InzightEd
        </div>
      </div>
    </div>
  );
}