import { useEffect, useState } from "react";
import { getStudentDashboardData, fetchStudentSWOT } from "../../utils/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart
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

  // Prepare subject list and attempt to pick the selected test row using the same testId logic
  const SUBJECTS = ["Physics", "Chemistry", "Botany", "Zoology"];
  let mapping = null;
  let foundIndex = -1;
  let selectedRow = null;

  if (dashboard?.subjectWiseDataMapping && dashboard.subjectWiseDataMapping.length > 0) {
    mapping = dashboard.subjectWiseDataMapping;
    // try to find the test matching testId; fallback to latest
    if (testId) {
      foundIndex = mapping.findIndex(r => {
        if (!r.Test) return false;
        if (String(r.Test) === String(testId)) return true;
        if (String(r.Test).toLowerCase() === (`test ${String(testId)}`).toLowerCase()) return true;
        if (String(r.Test).toLowerCase().includes(String(testId).toLowerCase())) return true;
        return false;
      });
      if (foundIndex === -1) {
        const num = Number(testId);
        if (!isNaN(num)) {
          foundIndex = mapping.findIndex(r => {
            const m = String(r.Test || '').match(/\d+/);
            const n = m ? Number(m[0]) : NaN;
            return !isNaN(n) && n === num;
          });
        }
      }
    }
    if (foundIndex === -1) foundIndex = mapping.length - 1;
    selectedRow = mapping[foundIndex];
  }

  // Summary cards -> compute subject-wise correct/incorrect/skipped from the selected row (or fallbacks)
  let summaryData = [];
  if (selectedRow) {
    // If API provides subjectDetails array, prefer that
    if (Array.isArray(selectedRow.subjectDetails) && selectedRow.subjectDetails.length > 0) {
      summaryData = selectedRow.subjectDetails.map(s => ({
        subject: s.name || s.subject || "Subject",
        correct: s.correct ?? 0,
        incorrect: s.incorrect ?? 0,
        skipped: s.unattended ?? 0,
      }));
    } else {
      // flattened keys like Physics__correct / Physics__incorrect / Physics__unattempted
      const hasFlattenedKeys = SUBJECTS.some(sub => `${sub}__correct` in selectedRow || `${sub}__incorrect` in selectedRow || `${sub}__unattempted` in selectedRow || `${sub}__unattended` in selectedRow);
      if (hasFlattenedKeys) {
        summaryData = SUBJECTS.map(sub => ({
          subject: sub,
          correct: Number(selectedRow[`${sub}__correct`] ?? selectedRow[`${sub}__correctAnswers`] ?? 0) || 0,
          incorrect: Number(selectedRow[`${sub}__incorrect`] ?? 0) || 0,
          skipped: Number(selectedRow[`${sub}__unattempted`] ?? selectedRow[`${sub}__unattended`] ?? 0) || 0,
        }));
      }
    }
  }

  // Fallback to zeros if we couldn't extract subject details
  if (!Array.isArray(summaryData) || summaryData.length === 0) {
    summaryData = SUBJECTS.map(sub => ({ subject: sub, correct: 0, incorrect: 0, skipped: 0 }));
  }

  // Subject-wise Performance: derive from the selected row or fall back to dummy data
  let subjectTotals = [];
  if (selectedRow) {
    // prefer numeric top-level fields like Physics, Chemistry etc.
    const hasTotals = SUBJECTS.some(s => typeof selectedRow[s] === 'number');
    if (hasTotals) {
      subjectTotals = SUBJECTS.map(s => ({ subject: s, total: Number(selectedRow[s] ?? 0) || 0 }));
    } else {
      // compute from flattened counts if totals not present
      const hasFlattened = SUBJECTS.some(sub => `${sub}__correct` in selectedRow || `${sub}__incorrect` in selectedRow || `${sub}__unattempted` in selectedRow || `${sub}__unattended` in selectedRow);
      if (hasFlattened) {
        subjectTotals = SUBJECTS.map(sub => {
          const correct = Number(selectedRow[`${sub}__correct`] ?? 0) || 0;
          const incorrect = Number(selectedRow[`${sub}__incorrect`] ?? 0) || 0;
          const unattempted = Number(selectedRow[`${sub}__unattempted`] ?? selectedRow[`${sub}__unattended`] ?? 0) || 0;
          return { subject: sub, total: correct + incorrect + unattempted };
        });
      } else {
        subjectTotals = DUMMY_SUBJECT_TOTALS;
      }
    }
  } else {
    subjectTotals = DUMMY_SUBJECT_TOTALS;
  }

  // Dynamic ticks for Subject-wise Performance (unit: 40)
  const safeSubjectTotals = Array.isArray(subjectTotals) ? subjectTotals : [];
  const rawSubjectMax = Math.max(180, ...safeSubjectTotals.map(s => s.total ?? 0));
  // round up to next multiple of 40 for nicer tick alignment
  const subjectMax = Math.ceil(rawSubjectMax / 40) * 40;
  const subjectTicks = Array.from({ length: Math.ceil(subjectMax / 40) + 1 }, (_, i) => i * 40);

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
    // keep only last 5 tests
    if (trendData.length > 5) trendData = trendData.slice(-5);
  } else {
    trendData = DUMMY_TREND_DATA.map(row => ({ ...row, total: (row.Physics ?? 0) + (row.Chemistry ?? 0) + (row.Botany ?? 0) + (row.Zoology ?? 0) }));
    if (trendData.length > 5) trendData = trendData.slice(-5);
  }

  // Dynamic ticks for Test-wise Subject Performance & Total Trend (50-unit increments)
  const safeTrendData = Array.isArray(trendData) ? trendData : [];
  // Use per-subject maxima (exclude total) and subjectTotals as baseline
  const subjectMaxFromTotals = Math.max(0, ...safeSubjectTotals.map(s => s.total ?? 0));
  const dataTrendMax = Math.max(0, ...safeTrendData.map(d => Math.max(d.Physics ?? 0, d.Chemistry ?? 0, d.Botany ?? 0, d.Zoology ?? 0)));
  const baseTrendMax = Math.max(subjectMaxFromTotals, dataTrendMax);
  // add padding of 100 as requested, then round up to nearest 50
  const paddedTrendMax = baseTrendMax + 100;
  const trendMax = Math.ceil(paddedTrendMax / 50) * 50;
  // ticks: 50,100,150,...,trendMax
  const trendTicks = Array.from({ length: Math.ceil(trendMax / 50) }, (_, i) => (i + 1) * 50);

  // PerformanceTrend: student total vs class average (derive from trendData if available)
  let performanceTrend = [];
  if (safeTrendData.length > 0) {
    // studentTotal from trendData.total
    performanceTrend = safeTrendData.map(d => ({ name: d.name, studentTotal: d.total ?? 0 }));
  }
  const safePerfData = Array.isArray(performanceTrend) ? performanceTrend : [];
  const perfRawMax = Math.max(0, ...safePerfData.map(d => (d.studentTotal ?? 0)));
  // Round up to next 100 and ensure at least 100
  let perfMax = Math.ceil(perfRawMax / 100) * 100;
  if (perfMax < 100) perfMax = 100;
  const perfTicks = Array.from({ length: perfMax / 100 }, (_, i) => (i + 1) * 100);

  // Key Takeaways & Recommendations: use first 2 areasForImprovement + first 2 quickRecommendations
  const keyInsights = dashboard?.keyInsightsData || {};
  const improvements = Array.isArray(keyInsights.areasForImprovement) ? keyInsights.areasForImprovement.slice(0, 2) : [];
  const quickRecs = Array.isArray(keyInsights.quickRecommendations) ? keyInsights.quickRecommendations.slice(0, 2) : [];
  const defaultFallbacks = [
    "Excellent overall performance with strong consistency. Keep up the good work!",
    "Continue to focus on conceptual clarity, especially in areas where 'Conceptual Errors' are noted.",
  ];
  const recommendations = [...improvements, ...quickRecs];
  // if we don't have 4 items, fill from defaults
  while (recommendations.length < 4) {
    const next = defaultFallbacks[recommendations.length - (improvements.length + quickRecs.length)] || defaultFallbacks[0];
    if (!next) break;
    recommendations.push(next);
  }

  // Selected Test Info and improvement rate (derive from subjectWiseDataMapping)
  let selectedTestInfo = null;
  let improvementRate = null;
  if (dashboard?.subjectWiseDataMapping && dashboard.subjectWiseDataMapping.length > 0) {
    const mapping = dashboard.subjectWiseDataMapping;
    // try to find the test matching testId; fallback to latest
    let foundIndex = -1;
    if (testId) {
      foundIndex = mapping.findIndex(r => {
        if (!r.Test) return false;
        if (String(r.Test) === String(testId)) return true;
        if (String(r.Test).toLowerCase() === (`test ${String(testId)}`).toLowerCase()) return true;
        if (String(r.Test).toLowerCase().includes(String(testId).toLowerCase())) return true;
        return false;
      });
      if (foundIndex === -1) {
        const num = Number(testId);
        if (!isNaN(num)) {
          foundIndex = mapping.findIndex(r => {
            const m = String(r.Test || '').match(/\d+/);
            const n = m ? Number(m[0]) : NaN;
            return !isNaN(n) && n === num;
          });
        }
      }
    }
    if (foundIndex === -1) foundIndex = mapping.length - 1;
    const sel = mapping[foundIndex];
    const totalMarks = (sel.Physics ?? 0) + (sel.Chemistry ?? 0) + (sel.Botany ?? 0) + (sel.Zoology ?? 0);
    const testNum = (() => {
      const m = String(sel.Test || '').match(/\d+/);
      return m ? Number(m[0]) : (foundIndex + 1);
    })();
    selectedTestInfo = { totalMarks, testNum };
    if (foundIndex > 0) {
      const prev = mapping[foundIndex - 1];
      const prevTotal = (prev.Physics ?? 0) + (prev.Chemistry ?? 0) + (prev.Botany ?? 0) + (prev.Zoology ?? 0);
      if (prevTotal > 0) {
        improvementRate = (((totalMarks - prevTotal) / prevTotal) * 100).toFixed(2);
      }
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-4xl mx-auto font-sans text-blue-900 bg-white p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-6 border border-blue-200 rounded-xl shadow-md">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Student Report</h1>
            <p className="text-sm text-gray-400">powered by <span className="text-xl font-bold text-gray-800">Inzight</span><span className="text-xl font-bold text-blue-500">Ed</span></p>
          </div>
        </div>
        {/* Selected Test Mark Section */}
        {selectedTestInfo && (
          <div className="w-fit mx-auto text-center text-base text-gray-800 font-regular border border-gray-200 px-6 py-2 rounded-full shadow-sm">
            You have obtained <span className="font-bold text-blue-500">{selectedTestInfo.totalMarks}</span> marks in test {selectedTestInfo.testNum}
            {improvementRate !== null && (
              (() => {
                const num = Number(improvementRate);
                const formatted = isNaN(num) ? improvementRate : `${Number(num).toFixed(2)}`;
                const colorClass = (!isNaN(num) && num < 0) ? 'text-red-600' : 'text-green-600';
                return (
                  <> with an improvement rate of <span className={`font-bold ${colorClass}`}>{formatted}%</span> compared to the last test</>
                );
              })()
            )}
          </div>
        )}
        {/* Subject Summary Cards (Correct / Incorrect / Skipped) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {summaryData.map((card, idx) => (
            <div key={idx} className="border border-blue-200 bg-white p-4 rounded-lg">
              <span className="text-lg font-bold text-blue-900 block mb-2">{card.subject}</span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Correct:</span>
                  <span className="text-sm font-semibold text-green-700">{card.correct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-red-700">Incorrect:</span>
                  <span className="text-sm font-semibold text-red-700">{card.incorrect}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Skipped:</span>
                  <span className="text-sm font-semibold text-gray-700">{card.skipped}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Student vs Class Performance Trend (replaces subject totals + error chart) */}
        <div className="grid grid-cols-1 gap-6 print:grid-cols-1 print:gap-6">
          <div className="border border-blue-200 bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-blue-800">Student vs Class Performance Trend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceTrend} isAnimationActive={false} margin={{ top: 40, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#1e3a8a" isAnimationActive={false} />
                  <YAxis stroke="#1e3a8a" domain={[0, perfMax]} ticks={perfTicks} isAnimationActive={false} />
                  <Tooltip isAnimationActive={false} />
                  <Legend isAnimationActive={false} />
                  <Bar dataKey="studentTotal" fill="#2563eb" radius={[5, 5, 0, 0]} barSize={20} isAnimationActive={false}>
                    <LabelList dataKey="studentTotal" position="top" fill="#2563eb" fontSize={14} fontWeight={700} isAnimationActive={false} />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Trend Line */}
        <div className="border border-blue-200 bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-4">Test-wise Subject Performance & Total Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barCategoryGap={20} barSize={20} isAnimationActive={false} margin={{ top: 40, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" isAnimationActive={false} />
                <YAxis domain={[0, trendMax]} ticks={trendTicks} isAnimationActive={false} />
                <Tooltip isAnimationActive={false} />
                <Legend isAnimationActive={false} />
                <Bar dataKey="Physics" fill={SUBJECT_COLORS.Physics} radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Physics" position="top" fill={SUBJECT_COLORS.Physics} fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar dataKey="Chemistry" fill={SUBJECT_COLORS.Chemistry} radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Chemistry" position="top" fill={SUBJECT_COLORS.Chemistry} fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar dataKey="Botany" fill={SUBJECT_COLORS.Botany} radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Botany" position="top" fill={SUBJECT_COLORS.Botany} fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar dataKey="Zoology" fill={SUBJECT_COLORS.Zoology} radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="Zoology" position="top" fill={SUBJECT_COLORS.Zoology} fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
                {/* Removed total label as requested */}
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
