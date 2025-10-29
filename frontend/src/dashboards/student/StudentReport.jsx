import { useEffect, useState } from "react";
import { getStudentDashboardData, fetchStudentSWOT } from "../../utils/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";

// --- SWOT helpers (reuse from s_swot.jsx/Report.jsx) ---
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
const SUBJECT_COLORS = {
  Physics: "#d1d5db", // gray
  Chemistry: "#60a5fa", // blue
  Botany: "#9ca3af", // gray
  Zoology: "#2563eb" // blue
};

// --- Dummy chart data constants for student reports ---
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

export default function StudentReport() {
  const [dashboard, setDashboard] = useState(null);
  const [swot, setSwot] = useState(null);
  const [error, setError] = useState(null);
  const [testId, setTestId] = useState(null);

  useEffect(() => {
    // Get testId from URL query params
    const query = new URLSearchParams(window.location.search);
    const test = query.get("testId");
    setTestId(test);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dash = await getStudentDashboardData(testId);
        setDashboard(dash);
        setError(null);
      } catch (err) {
        setError("Failed to load student report data");
      } finally {
        // Set PDF_READY after dashboard attempt
        if (typeof window !== 'undefined') window.__PDF_READY__ = true;
      }
    };
    if (testId) fetchData();
  }, [testId]);

  useEffect(() => {
    const fetchSwot = async () => {
      if (!testId) return;
      try {
        const swotData = await fetchStudentSWOT(testId);
        setSwot(swotData.swot ? transformSwotData(swotData.swot) : transformSwotData(swotData));
      } catch {
        setSwot(null);
      }
    };
    if (testId) fetchSwot();
  }, [testId]);

  // Error Data (still using dummy data for now)
  const errorData = DUMMY_ERROR_DATA;

  if (error) {
    if (typeof window !== 'undefined') window.__PDF_READY__ = true;
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }
  if (!dashboard) return <div className="p-8 text-center text-gray-600">Generating student report...</div>;

  // Summary cards
  const summaryCards = dashboard?.summaryCardsData || [];

  // Subject-wise Performance: use latest test's subject scores
  let subjectTotals = [];
  if (dashboard?.subjectWiseDataMapping && dashboard.subjectWiseDataMapping.length > 0) {
    const latestTest = dashboard.subjectWiseDataMapping[dashboard.subjectWiseDataMapping.length - 1];
    subjectTotals = [
      { subject: "Physics", total: latestTest.Physics ?? 0 },
      { subject: "Chemistry", total: latestTest.Chemistry ?? 0 },
      { subject: "Botany", total: latestTest.Botany ?? 0 },
      { subject: "Zoology", total: latestTest.Zoology ?? 0 },
    ];
  } else {
    subjectTotals = DUMMY_SUBJECT_TOTALS;
  }

  // Test-wise Subject Performance & Total Trend: use all tests
  let trendData = [];
  if (dashboard?.subjectWiseDataMapping && dashboard.subjectWiseDataMapping.length > 0) {
    trendData = dashboard.subjectWiseDataMapping.map((row, idx) => ({
      name: row.Test || `Test ${idx + 1}`,
      Physics: row.Physics ?? 0,
      Chemistry: row.Chemistry ?? 0,
      Botany: row.Botany ?? 0,
      Zoology: row.Zoology ?? 0,
      total: (row.Physics ?? 0) + (row.Chemistry ?? 0) + (row.Botany ?? 0) + (row.Zoology ?? 0)
    }));
  } else {
    trendData = DUMMY_TREND_DATA.map(row => ({ ...row, total: (row.Physics ?? 0) + (row.Chemistry ?? 0) + (row.Botany ?? 0) + (row.Zoology ?? 0) }));
  }

  // Key Takeaways & Recommendations: use areasForImprovement
  const recommendations = dashboard?.keyInsightsData?.areasForImprovement || [
    "Excellent overall performance with strong consistency. Keep up the good work!",
    "Continue to focus on conceptual clarity, especially in areas where 'Conceptual Errors' are noted.",
    "Consistent practice of numerical problems can help reduce 'Calculation Errors'.",
    "Review 'Careless Errors' carefully to identify patterns and avoid similar mistakes in future tests."
  ];

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-4xl mx-auto font-sans text-blue-900 bg-white p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-6 border border-blue-200 rounded-xl shadow-md">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Student Report</h1>
            <p className="text-sm text-gray-400">powered by <span className="text-xl font-bold text-gray-800">Inzight</span><span className="text-xl font-bold text-blue-500">Ed</span></p>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summaryCards.map((card, idx) => (
            <div key={idx} className="flex flex-col items-center border border-blue-200 bg-blue-100 p-3 rounded-lg">
              <span className="text-sm text-blue-700">{card.title}</span>
              <span className="text-2xl font-bold text-blue-900">{card.value}</span>
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
          <div className="h-80">
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
        {testId && swot && (
          <div>
            <h2 className="text-xl font-bold text-center mt-10 mb-10">SWOT Analysis</h2>
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
                    {swot[type]?.length ? (
                      swot[type].map((item, idx) => (
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
        )}
        <div className="text-center text-xs text-gray-400 pt-6 mt-6">Generated by InzightEd</div>
      </div>
    </div>
  );
}
