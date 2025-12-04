import { useEffect, useState } from "react";
import { getStudentDashboardData, fetchStudentSWOT } from "../../utils/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart, Line
} from "recharts";

// --- Reused SWOT helpers and utilities (from Report.jsx) ---
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

// Print-friendly color palette (matching Report.jsx)
const SUBJECT_COLORS = {
  Physics: "#000000",
  Chemistry: "#000000",
  Biology: "#000000",
  Botany: "#000000",
  Zoology: "#000000"
};

// --- Dummy chart data constants ---
const DUMMY_SUBJECT_TOTALS = [
  { subject: "Physics", total: 160 },
  { subject: "Chemistry", total: 170 },
  { subject: "Biology", total: 175 },
  { subject: "Botany", total: 180 },
  { subject: "Zoology", total: 150 },
];
const DUMMY_ERROR_DATA = [
  { name: "Conceptual", value: 50 },
  { name: "Calculation", value: 35 },
  { name: "Careless", value: 15 },
];
const DUMMY_TREND_DATA = [
  { name: "Test 1", Physics: 60, Chemistry: 120, Biology: 90, Botany: 150, Zoology: 70 },
  { name: "Test 2", Physics: 170, Chemistry: 150, Biology: 140, Botany: 50, Zoology: 170 },
  { name: "Test 3", Physics: 150, Chemistry: 160, Biology: 155, Botany: 150, Zoology: 180 },
  { name: "Test 4", Physics: 180, Chemistry: 180, Biology: 170, Botany: 160, Zoology: 180 },
  { name: "Test 5", Physics: 160, Chemistry: 160, Biology: 180, Botany: 180, Zoology: 180 },
];

export default function StudentReport() {
  // high-level state similar to Report.jsx
  const [dashboard, setDashboard] = useState(null);
  const [swotData, setSwotData] = useState(null);
  const [error, setError] = useState(null);

  // Read testId from query
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('testId');
    // fetch dashboard and swot when mounted
    const fetchAll = async () => {
      try {
        const dash = await getStudentDashboardData(t);
        setDashboard(dash || null);
      } catch (e) {
        setError('Failed to load student dashboard data');
      }
      try {
        const s = await fetchStudentSWOT(t);
        setSwotData(s && s.swot ? transformSwotData(s.swot) : transformSwotData(s));
      } catch (e) {
        setSwotData(null);
      } finally {
        if (typeof window !== 'undefined') window.__PDF_READY__ = true;
      }
    };
    fetchAll();
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <div className="font-bold text-lg mb-2">Error loading report</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!dashboard) return <div className="p-8 text-center text-gray-600">Generating student report...</div>;

  // Reuse the robust parsing from the previous StudentReport to derive metrics
  const SUBJECTS = ["Physics", "Chemistry", "Biology", "Botany", "Zoology"];
  const mapping = Array.isArray(dashboard.subjectWiseDataMapping) ? dashboard.subjectWiseDataMapping : [];

  // Get test selection logic (prefer query param match)
  const query = new URLSearchParams(window.location.search);
  const tparam = query.get('testId');
  let foundIndex = -1;
  if (tparam && mapping.length) {
    foundIndex = mapping.findIndex(r => {
      if (!r.Test) return false;
      if (String(r.Test) === String(tparam)) return true;
      if (String(r.Test).toLowerCase() === (`test ${String(tparam)}`).toLowerCase()) return true;
      if (String(r.Test).toLowerCase().includes(String(tparam).toLowerCase())) return true;
      return false;
    });
    if (foundIndex === -1) {
      const num = Number(tparam);
      if (!isNaN(num)) {
        foundIndex = mapping.findIndex(r => {
          const m = String(r.Test || '').match(/\d+/);
          const n = m ? Number(m[0]) : NaN;
          return !isNaN(n) && n === num;
        });
      }
    }
  }
  if (foundIndex === -1 && mapping.length) foundIndex = mapping.length - 1;
  const selectedRow = foundIndex >= 0 ? mapping[foundIndex] : null;

  // Summary data
  let summaryData = [];
  if (selectedRow) {
    if (Array.isArray(selectedRow.subjectDetails) && selectedRow.subjectDetails.length) {
      summaryData = selectedRow.subjectDetails.map(s => ({
        subject: s.name || s.subject || 'Subject',
        correct: s.correct ?? 0,
        incorrect: s.incorrect ?? 0,
        skipped: s.unattended ?? s.unattempted ?? 0,
      }));
    } else {
      const hasFlattened = SUBJECTS.some(sub => `${sub}__correct` in selectedRow || `${sub}__incorrect` in selectedRow || `${sub}__unattempted` in selectedRow || `${sub}__unattended` in selectedRow);
      if (hasFlattened) {
        summaryData = SUBJECTS.map(sub => ({
          subject: sub,
          correct: Number(selectedRow[`${sub}__correct`] ?? selectedRow[`${sub}__correctAnswers`] ?? 0) || 0,
          incorrect: Number(selectedRow[`${sub}__incorrect`] ?? 0) || 0,
          skipped: Number(selectedRow[`${sub}__unattempted`] ?? selectedRow[`${sub}__unattended`] ?? 0) || 0,
        }));
      }
    }
  }
  if (!summaryData || !summaryData.length) summaryData = SUBJECTS.map(s => ({ subject: s, correct: 0, incorrect: 0, skipped: 0 }));

  // Only show non-empty subjects in top metrics (present if any of correct/incorrect/skipped > 0)
  const visibleSummary = (summaryData || []).filter(e => ((e.correct ?? 0) + (e.incorrect ?? 0) + (e.skipped ?? 0)) > 0);
  // If nothing is present (edge case), fall back to full summaryData to avoid empty UI
  const metricsToShow = visibleSummary.length ? visibleSummary : summaryData;

  // subject totals
  let subjectTotals = [];
  if (selectedRow) {
    const hasTotals = SUBJECTS.some(s => typeof selectedRow[s] === 'number');
    if (hasTotals) {
      subjectTotals = SUBJECTS.map(s => ({ subject: s, total: Number(selectedRow[s] ?? 0) || 0 }));
    } else {
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

  // trendData (last 5 tests)
  let trendData = [];
  if (mapping.length) {
    trendData = mapping.map((row, idx) => ({
      name: row.Test || `Test ${idx + 1}`,
      Physics: row.Physics ?? 0,
      Chemistry: row.Chemistry ?? 0,
      Biology: row.Biology ?? 0,
      Botany: row.Botany ?? 0,
      Zoology: row.Zoology ?? 0,
      total: (row.Physics ?? 0) + (row.Chemistry ?? 0) + (row.Biology ?? 0) + (row.Botany ?? 0) + (row.Zoology ?? 0),
    }));
    if (trendData.length > 5) trendData = trendData.slice(-5);
  } else {
    trendData = DUMMY_TREND_DATA.map(r => ({ ...r, total: (r.Physics ?? 0) + (r.Chemistry ?? 0) + (r.Biology ?? 0) + (r.Botany ?? 0) + (r.Zoology ?? 0) })).slice(-5);
  }

  // ticks for trend
  const safeTrendData = Array.isArray(trendData) ? trendData : [];
  const subjectMaxFromTotals = Math.max(0, ...subjectTotals.map(s => s.total ?? 0));
  const dataTrendMax = Math.max(0, ...safeTrendData.map(d => Math.max(d.Physics ?? 0, d.Chemistry ?? 0, d.Botany ?? 0, d.Zoology ?? 0)));
  const baseTrendMax = Math.max(subjectMaxFromTotals, dataTrendMax);
  const paddedTrendMax = baseTrendMax + 100;
  const trendMax = Math.ceil(paddedTrendMax / 50) * 50;
  const trendTicks = Array.from({ length: Math.ceil(trendMax / 50) }, (_, i) => (i + 1) * 50);

  // performance trend (student total)
  const performanceTrend = safeTrendData.map(d => ({ name: d.name, studentTotal: d.total ?? 0 }));
  const perfRawMax = Math.max(0, ...performanceTrend.map(d => d.studentTotal ?? 0));
  let perfMax = Math.ceil(perfRawMax / 100) * 100;
  if (perfMax < 100) perfMax = 100;
  const perfTicks = Array.from({ length: perfMax / 100 }, (_, i) => (i + 1) * 100);

  // selected test info & improvement
  let selectedTestInfo = null;
  let improvementRate = null;
  if (mapping.length && foundIndex >= 0) {
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
      if (prevTotal > 0) improvementRate = (((totalMarks - prevTotal) / prevTotal) * 100).toFixed(2);
    }
  }

  // key insights / recommendations
  const keyInsights = dashboard?.keyInsightsData || {};
  const improvementPoints = Array.isArray(keyInsights.areasForImprovement) ? keyInsights.areasForImprovement.slice(0, 2) : [];
  const strengthPoints = Array.isArray(keyInsights.quickRecommendations) ? keyInsights.quickRecommendations.slice(0, 2) : [];
  const recommendations = [...improvementPoints, ...strengthPoints];
  while (recommendations.length < 4) recommendations.push("Keep working on concepts and practice regularly.");

  // Prepare SWOT by subject mapping (like Report.jsx)
  const PREFERRED_SUBJECT_ORDER = ["Physics", "Chemistry", "Biology", "Botany", "Zoology"];
  const CATEGORIES = ["Weaknesses", "Opportunities", "Strengths"];
  const CATEGORY_LABELS = {
    Weaknesses: "Focus Zone",
    Opportunities: "Edge Zone",
    Strengths: "Steady Zone"
  };

  let derivedSubjects = [];
  if (swotData && typeof swotData === 'object') {
    const subjectsSet = new Set();
    CATEGORIES.forEach(cat => {
      const arr = swotData[cat] || [];
      if (Array.isArray(arr)) arr.forEach(it => subjectsSet.add(it.subject));
    });
    derivedSubjects = Array.from(subjectsSet);
  }
  if (!derivedSubjects.length) derivedSubjects = ["Physics", "Chemistry", "Botany", "Zoology"];
  else {
    const ordered = PREFERRED_SUBJECT_ORDER.filter(s => derivedSubjects.includes(s));
    const remainder = derivedSubjects.filter(s => !PREFERRED_SUBJECT_ORDER.includes(s));
    derivedSubjects = ordered.concat(remainder);
  }

  const subjectsSwot = {};
  derivedSubjects.forEach(s => subjectsSwot[s] = { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] });
  if (swotData && typeof swotData === 'object') {
    Object.keys(swotData).forEach(cat => {
      const arr = swotData[cat] || [];
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          const subj = item.subject || 'Unknown';
          const topics = Array.isArray(item.topics) ? item.topics : [];
          if (!subjectsSwot[subj]) subjectsSwot[subj] = { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };
          subjectsSwot[subj][cat] = subjectsSwot[subj][cat].concat(topics.length ? topics : ['No data']);
        });
      }
    });
  }

  // Patterns for print-friendly legend (from Report.jsx)
  const PATTERNS = {
    Physics: 'pattern-physics',
    Chemistry: 'pattern-chemistry',
    Biology: 'pattern-biology',
    Botany: 'pattern-botany',
    Zoology: 'pattern-zoology',
    Total: 'pattern-total'
  };

  return (
    <div className="min-h-screen bg-white">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <pattern id="pattern-physics" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <path d="M0,6 L6,0" stroke="#000" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-total" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <path d="M0,5 L5,0" stroke="#000" strokeWidth="0.3" />
            <path d="M1,6 L6,1" stroke="#000" strokeWidth="0.3" />
          </pattern>
          <pattern id="pattern-biology" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <circle cx="2" cy="2" r="0.8" fill="#000" />
            <circle cx="5" cy="5" r="0.8" fill="#000" />
          </pattern>
          <pattern id="pattern-chemistry" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <path d="M0,0 L6,6" stroke="#000" strokeWidth="1" />
            <path d="M0,6 L6,0" stroke="#000" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-botany" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <circle cx="3" cy="3" r="1" fill="#000" />
          </pattern>
          <pattern id="pattern-zoology" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <path d="M0,3 L6,3" stroke="#000" strokeWidth="1" />
          </pattern>
        </defs>
      </svg>

      <div className="max-w-5xl mx-auto font-sans text-black bg-white p-8 space-y-6">
        <div className="flex justify-between items-center px-6 py-6 border border-gray-200 rounded-xl">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Performance Report</h1>
            <p className="text-sm text-black">powered by <span className="text-xl font-bold text-black">Inzight</span><span className="text-xl font-bold text-black">Ed </span> </p>
          </div>
        </div>

        {selectedTestInfo && (
          <div className="w-fit mx-auto text-center text-base text-black font-regular border border-gray-200 px-6 py-2 rounded-full">
            You have obtained <span className="font-bold text-black">{selectedTestInfo.totalMarks}</span> marks in <span className="font-bold text-black">Test {selectedTestInfo.testNum}</span>
            {improvementRate !== null && (
              (() => {
                const num = Number(improvementRate);
                const formatted = isNaN(num) ? improvementRate : `${Number(num).toFixed(2)}`;
                const colorClass = 'text-black';
                return (
                  <> with an improvement rate of <span className={`font-bold ${colorClass}`}>{formatted}%</span> compared to the last test</>
                );
              })()
            )}
          </div>
        )}

        {/* Top Metrics */}
        <div className="grid grid-flow-col auto-cols-fr gap-6 w-full">
          {metricsToShow.map((entry, idx) => (
            <div key={String(entry.subject) + '-' + idx} className="border border-gray-200 bg-white p-4 rounded-lg">
              <span className="text-lg font-bold text-black block mb-2">{entry.subject}</span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-black">Correct:</span>
                  <span className="text-sm font-semibold text-black">{entry.correct ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Incorrect:</span>
                  <span className="text-sm font-semibold text-black">{entry.incorrect ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Skipped:</span>
                  <span className="text-sm font-semibold text-black">{entry.skipped ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Student vs Class Performance Trend */}
        <div className="grid grid-cols-1 gap-6">
          <div className="border border-gray-200 bg-white p-4 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-black">Student vs Class Performance Trend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceTrend} isAnimationActive={false}>
                  <XAxis dataKey="name" stroke="#000000" isAnimationActive={false} />
                  <YAxis stroke="#000000" domain={[0, perfMax]} ticks={perfTicks} isAnimationActive={false} />
                  <Tooltip isAnimationActive={false} />
                  <Legend isAnimationActive={false} payload={[{ value: 'Total Marks', id: 'Total Marks' }]} />
                  <Bar dataKey="studentTotal" fill={`url(#pattern-total)`} stroke="#000000" strokeWidth={1} radius={[5, 5, 0, 0]} barSize={20} isAnimationActive={false} name="Total Marks">
                    <LabelList dataKey="studentTotal" position="top" fill="#000000" fontSize={14} fontWeight={700} isAnimationActive={false} />
                  </Bar>
                  <Line type="monotone" dataKey="classAvg" stroke="#000000" strokeWidth={1} dot={{ r: 1.5, stroke: '#000000', fill: '#000000' }} isAnimationActive={false} name="Class Avg" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Test-wise Subject Performance & Total Trend */}
        <div className="border border-gray-200 bg-white p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-4">Test-wise Subject Performance & Total Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barCategoryGap={20} barSize={20} isAnimationActive={false}>
                <XAxis dataKey="name" isAnimationActive={false} stroke="#000000" />
                <YAxis domain={[0, trendMax]} ticks={trendTicks} isAnimationActive={false} stroke="#000000" />
                <Tooltip isAnimationActive={false} />
                <Legend isAnimationActive={false} content={({ payload }) => {
                  if (!payload) return null;
                  const available = payload.map(p => p.dataKey);
                  const preferredOrder = PREFERRED_SUBJECT_ORDER.filter(s => available.includes(s));
                  const remainder = available.filter(a => !PREFERRED_SUBJECT_ORDER.includes(a));
                  const orderedKeys = preferredOrder.concat(remainder);
                  const ordered = orderedKeys.map(k => payload.find(p => p.dataKey === k)).filter(Boolean);
                  return (
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', justifyContent: 'center', margin: 0 }}>
                      {ordered.map((entry, i) => {
                        const patternId = PATTERNS[entry.dataKey] || '';
                        return (
                          <li key={`lg-${i}`} style={{ display: 'flex', alignItems: 'center', marginRight: 20 }}>
                            <svg width="14" height="14" style={{ marginRight: 8 }}>
                              <rect width="14" height="14" fill={`url(#${patternId})`} stroke="#000000" />
                            </svg>
                            <span style={{ color: '#000000' }}>{entry.dataKey}</span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                }} />

                {(() => {
                  const first = Array.isArray(trendData) && trendData.length ? trendData[0] : null;
                  const barSubjects = first ? Object.keys(first).filter(k => k !== 'name' && k !== 'total') : ['Physics', 'Chemistry', 'Botany', 'Zoology'];
                  return barSubjects.map((subj, i) => (
                    <Bar key={`bar-${subj}-${i}`} dataKey={subj} fill={`url(#${PATTERNS[subj] || ''})`} stroke="#000000" strokeWidth={1} radius={[5, 5, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey={subj} position="top" fill="#000000" fontSize={10} fontWeight={600} isAnimationActive={false} />
                    </Bar>
                  ));
                })()}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notes & Comments */}
        <div className="border p-4 rounded-lg h-[200px]">
          <h2 className="text-lg font-bold mb-6">Notes & Comments:</h2>
          <div className="space-y-6">
            {Array.from({ length: 5 }, (_, i) => (
              <hr key={i} className="border-gray-300" />
            ))}
          </div>
        </div>

        {/* Subject-centric SWOT */}
        <div>
          <h2 className="text-xl font-bold text-center mt-20 mb-10">Test Analysis</h2>
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const testParam = tparam;
              let isOverall = false;
              if (!testParam || testParam === 'Overall' || testParam === '0') isOverall = true;
              else {
                const parsed = parseInt(String(testParam).replace(/^Test\s*/i, ''), 10);
                if (!Number.isNaN(parsed) && parsed === 0) isOverall = true;
              }

              const hasBotany = derivedSubjects.includes('Botany');
              const hasZoology = derivedSubjects.includes('Zoology');
              const hasBiology = derivedSubjects.includes('Biology');

              const shouldPullOutBiology = isOverall && hasBotany && hasZoology && hasBiology;

              const gridSubjects = shouldPullOutBiology ? derivedSubjects.filter(s => s !== 'Biology') : derivedSubjects;

              return (
                <>
                  {gridSubjects.map(subject => (
                    <div key={subject} className="border border-gray-200 bg-white p-3 rounded-lg">
                      <h3 className="font-bold mb-1 text-lg uppercase">{subject}</h3>
                      <div className="space-y-2 text-sm">
                        {CATEGORIES.map(cat => (
                          <div key={cat}>
                            <div className="font-semibold text-sm mb-1">{CATEGORY_LABELS[cat]}</div>
                            {subjectsSwot[subject] && subjectsSwot[subject][cat] && subjectsSwot[subject][cat].length ? (
                              <ul className="list-disc list-inside ml-3 space-y-1">
                                {subjectsSwot[subject][cat].map((topic, idx) => (
                                  <li key={idx} className="whitespace-pre-wrap text-gray-700">{topic}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="italic text-gray-400">No data</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {shouldPullOutBiology && (
                    <div className="col-span-2 border border-gray-200 bg-white p-3 rounded-lg">
                      <h3 className="font-bold mb-1 text-lg uppercase">Biology</h3>
                      <div className="space-y-2 text-sm">
                        {CATEGORIES.map(cat => (
                          <div key={cat}>
                            <div className="font-semibold text-sm mb-1">{CATEGORY_LABELS[cat]}</div>
                            {subjectsSwot['Biology'] && subjectsSwot['Biology'][cat] && subjectsSwot['Biology'][cat].length ? (
                              <ul className="list-disc list-inside ml-3 space-y-1">
                                {subjectsSwot['Biology'][cat].map((topic, idx) => (
                                  <li key={idx} className="whitespace-pre-wrap text-gray-700">{topic}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="italic text-gray-400">No data</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className="text-center text-sm italic text-black pt-4">Keep going — progress, not perfection.</div>
        <div className="text-center text-xs text-gray-400 pt-3">Generated by InzightEd</div>
      </div>
    </div>
  );
}
