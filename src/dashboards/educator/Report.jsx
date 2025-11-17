// ...existing code...
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart, Line
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
  // ...existing code...

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
        console.log('fetchEducatorStudentInsights data:', dashboard);
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
        // Calculate class averages per test
        const testAverages = {};
        if (Array.isArray(allResults?.results)) {
          allResults.results.forEach(result => {
            const testNum = result.test_num;
            if (!testAverages[testNum]) {
              testAverages[testNum] = { total: 0, count: 0 };
            }
            // Sum all subject scores dynamically
            const total = (result.phy_score ?? 0) + (result.chem_score ?? 0) + 
                         (result.bot_score ?? 0) + (result.zoo_score ?? 0) + (result.bio_score ?? 0);
            testAverages[testNum].total += total;
            testAverages[testNum].count += 1;
          });
        }
        // Subject marks (latest or selected test)
        let subjectMarks = {};
        let subjectStats = {};
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
            // Build subjectMarks dynamically based on which subjects have data
            subjectMarks = {
              Physics: testData.phy_score,
              Chemistry: testData.chem_score
            };
            // Add Biology OR Botany/Zoology based on what's present
            if ((testData.bio_score ?? 0) > 0 || (testData.bio_total ?? 0) > 0) {
              subjectMarks.Biology = testData.bio_score;
            }
            if ((testData.bot_score ?? 0) > 0 || (testData.bot_total ?? 0) > 0) {
              subjectMarks.Botany = testData.bot_score;
            }
            if ((testData.zoo_score ?? 0) > 0 || (testData.zoo_total ?? 0) > 0) {
              subjectMarks.Zoology = testData.zoo_score;
            }
            subjectStats = {
              Physics: {
                correct: testData.phy_correct || 0,
                attended: testData.phy_attended || 0,
                total: testData.phy_total || 0,
                incorrect: (testData.phy_attended || 0) - (testData.phy_correct || 0),
                skipped: (testData.phy_total || 0) - (testData.phy_attended || 0)
              },
              Chemistry: {
                correct: testData.chem_correct || 0,
                attended: testData.chem_attended || 0,
                total: testData.chem_total || 0,
                incorrect: (testData.chem_attended || 0) - (testData.chem_correct || 0),
                skipped: (testData.chem_total || 0) - (testData.chem_attended || 0)
              },
              Botany: {
                correct: testData.bot_correct || 0,
                attended: testData.bot_attended || 0,
                total: testData.bot_total || 0,
                incorrect: (testData.bot_attended || 0) - (testData.bot_correct || 0),
                skipped: (testData.bot_total || 0) - (testData.bot_attended || 0)
              },
              Zoology: {
                correct: testData.zoo_correct || 0,
                attended: testData.zoo_attended || 0,
                total: testData.zoo_total || 0,
                incorrect: (testData.zoo_attended || 0) - (testData.zoo_correct || 0),
                skipped: (testData.zoo_total || 0) - (testData.zoo_attended || 0)
              }
            };
            // Add Biology stats if present
            if ((testData.bio_score ?? 0) > 0 || (testData.bio_total ?? 0) > 0) {
              subjectStats.Biology = {
                correct: testData.bio_correct || 0,
                attended: testData.bio_attended || 0,
                total: testData.bio_total || 0,
                incorrect: (testData.bio_attended || 0) - (testData.bio_correct || 0),
                skipped: (testData.bio_total || 0) - (testData.bio_attended || 0)
              };
            }
            selectedTestInfo = {
              totalMarks: (testData.phy_score ?? 0) + (testData.chem_score ?? 0) + 
                         (testData.bot_score ?? 0) + (testData.zoo_score ?? 0) + (testData.bio_score ?? 0),
              testNum: testData.test_num
            };
          }
        }

        // Create summary data for subject-wise correct/incorrect/skipped
        let summaryData = [
          { subject: "Physics", ...subjectStats.Physics },
          { subject: "Chemistry", ...subjectStats.Chemistry },
          { subject: "Botany", ...subjectStats.Botany },
          { subject: "Zoology", ...subjectStats.Zoology }
        ];
        // Add Biology if present
        if (subjectStats.Biology) {
          summaryData.push({ subject: "Biology", ...subjectStats.Biology });
        }
        // Filter out subjects with no data
        summaryData = summaryData.filter(s => s.total > 0);
        // If testId is 'Overall', use last test's values for Top Metrics
        if (test === "Overall" && studentResultsArr.length > 0) {
          const lastTest = studentResultsArr.reduce((a, b) => (a.test_num > b.test_num ? a : b));
          const lastStats = {
            Physics: {
              correct: lastTest.phy_correct || 0,
              attended: lastTest.phy_attended || 0,
              total: lastTest.phy_total || 0,
              incorrect: (lastTest.phy_attended || 0) - (lastTest.phy_correct || 0),
              skipped: (lastTest.phy_total || 0) - (lastTest.phy_attended || 0)
            },
            Chemistry: {
              correct: lastTest.chem_correct || 0,
              attended: lastTest.chem_attended || 0,
              total: lastTest.chem_total || 0,
              incorrect: (lastTest.chem_attended || 0) - (lastTest.chem_correct || 0),
              skipped: (lastTest.chem_total || 0) - (lastTest.chem_attended || 0)
            },
            Botany: {
              correct: lastTest.bot_correct || 0,
              attended: lastTest.bot_attended || 0,
              total: lastTest.bot_total || 0,
              incorrect: (lastTest.bot_attended || 0) - (lastTest.bot_correct || 0),
              skipped: (lastTest.bot_total || 0) - (lastTest.bot_attended || 0)
            },
            Zoology: {
              correct: lastTest.zoo_correct || 0,
              attended: lastTest.zoo_attended || 0,
              total: lastTest.zoo_total || 0,
              incorrect: (lastTest.zoo_attended || 0) - (lastTest.zoo_correct || 0),
              skipped: (lastTest.zoo_total || 0) - (lastTest.zoo_attended || 0)
            }
          };
          // Add Biology if present
          if ((lastTest.bio_score ?? 0) > 0 || (lastTest.bio_total ?? 0) > 0) {
            lastStats.Biology = {
              correct: lastTest.bio_correct || 0,
              attended: lastTest.bio_attended || 0,
              total: lastTest.bio_total || 0,
              incorrect: (lastTest.bio_attended || 0) - (lastTest.bio_correct || 0),
              skipped: (lastTest.bio_total || 0) - (lastTest.bio_attended || 0)
            };
          }
          summaryData = [
            { subject: "Physics", ...lastStats.Physics },
            { subject: "Chemistry", ...lastStats.Chemistry },
            { subject: "Botany", ...lastStats.Botany },
            { subject: "Zoology", ...lastStats.Zoology }
          ];
          if (lastStats.Biology) {
            summaryData.push({ subject: "Biology", ...lastStats.Biology });
          }
          summaryData = summaryData.filter(s => s.total > 0);
        }
        // Keep a copy of the raw dashboard on window for debugging/fallback
        try { window.__lastDashboard = dashboard; } catch (e) { /* ignore */ }

        setReportData({
          student: {
            name: studentDetails?.name || "Student",
            student_id: studentDetails?.student_id || studentId,
            inst: studentDetails?.institution || studentDetails?.inst || "-"
          },
          summaryData,
          swotData,
          overview: dashboard.overview || {}, // include overview so recommendations can read from it
          subjectMarks, // add subject marks for use in UI
          selectedTestInfo, // add selected test info for UI
          studentResultsArr, // pass for improvement calculation
        });
        // --- Transform dashboard data for charts (same as dashboard hook) ---
        // Subject Totals (aggregate per subject)
        let subjectTotals = [];
        if (Object.keys(subjectMarks).length > 0) {
          // Use subjectMarks from latest/selected test for the bar chart - dynamically build from available subjects
          subjectTotals = Object.entries(subjectMarks)
            .filter(([_, score]) => score != null && score > 0)
            .map(([subject, total]) => ({ subject, total }));
        } else if (Array.isArray(dashboard.subjectWiseDataMapping)) {
          const totals = { Physics: 0, Chemistry: 0, Botany: 0, Zoology: 0, Biology: 0 };
          dashboard.subjectWiseDataMapping.forEach(row => {
            totals.Physics += row.Physics || 0;
            totals.Chemistry += row.Chemistry || 0;
            totals.Botany += row.Botany || 0;
            totals.Zoology += row.Zoology || 0;
            totals.Biology += row.Biology || 0;
          });
          subjectTotals = Object.entries(totals)
            .filter(([_, total]) => total > 0)
            .map(([subject, total]) => ({ subject, total }));
        } else {
          subjectTotals = DUMMY_SUBJECT_TOTALS;
        }
        // Error Data (if available, else fallback)
        const errorData = dashboard.errorDistribution || dashboard.errorData || DUMMY_ERROR_DATA;
        // Trend Data (last 5 tests, grouped bar per test, with all subjects)
        let trendData = [];
        if (studentResultsArr.length > 0) {
          // Sort by test_num ascending
          const sortedTests = [...studentResultsArr].sort((a, b) => a.test_num - b.test_num);
          // Take last 5
          const last5 = sortedTests.slice(-5);
          trendData = last5.map(test => {
            const dataPoint = {
              name: `Test ${test.test_num}`,
              Physics: test.phy_score ?? 0,
              Chemistry: test.chem_score ?? 0
            };
            // Add Biology OR Botany/Zoology based on presence
            if ((test.bio_score ?? 0) > 0 || (test.bio_total ?? 0) > 0) {
              dataPoint.Biology = test.bio_score ?? 0;
            }
            if ((test.bot_score ?? 0) > 0 || (test.bot_total ?? 0) > 0) {
              dataPoint.Botany = test.bot_score ?? 0;
            }
            if ((test.zoo_score ?? 0) > 0 || (test.zoo_total ?? 0) > 0) {
              dataPoint.Zoology = test.zoo_score ?? 0;
            }
            // Calculate total from all present subjects
            dataPoint.total = (test.phy_score ?? 0) + (test.chem_score ?? 0) + 
                             (test.bot_score ?? 0) + (test.zoo_score ?? 0) + (test.bio_score ?? 0);
            return dataPoint;
          });
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
            // Calculate total from all present subjects
            entry.total = (entry.Physics ?? 0) + (entry.Chemistry ?? 0) + 
                         (entry.Botany ?? 0) + (entry.Zoology ?? 0) + (entry.Biology ?? 0);
            return entry;
          });
        } else {
          trendData = DUMMY_TREND_DATA.slice(-5).map(row => ({
            ...row,
            total: (row.Physics ?? 0) + (row.Chemistry ?? 0) + (row.Botany ?? 0) + 
                   (row.Zoology ?? 0) + (row.Biology ?? 0)
          }));
        }
        // Add total marks to each trendData entry
        const trendDataWithTotal = trendData.map(entry => ({
          ...entry,
          total: (entry.Physics ?? 0) + (entry.Chemistry ?? 0) + (entry.Botany ?? 0) + 
                 (entry.Zoology ?? 0) + (entry.Biology ?? 0)
        }));
        // Performance Trend: last 5 tests, student total vs class average
        let performanceTrend = [];
        if (studentResultsArr.length > 0) {
          const sortedStudentTests = [...studentResultsArr].sort((a, b) => a.test_num - b.test_num);
          const last5 = sortedStudentTests.slice(-5);
          performanceTrend = last5.map(test => {
            const total = (test.phy_score ?? 0) + (test.chem_score ?? 0) + 
                         (test.bot_score ?? 0) + (test.zoo_score ?? 0) + (test.bio_score ?? 0);
            const avg = testAverages[test.test_num] ? testAverages[test.test_num].total / testAverages[test.test_num].count : 0;
            return {
              name: `Test ${test.test_num}`,
              studentTotal: total,
              classAvg: avg
            };
          });
        } else {
          // Dummy data for last 5 tests
          performanceTrend = [
            { name: "Test 1", studentTotal: 450, classAvg: 400 },
            { name: "Test 2", studentTotal: 500, classAvg: 420 },
            { name: "Test 3", studentTotal: 480, classAvg: 410 },
            { name: "Test 4", studentTotal: 520, classAvg: 430 },
            { name: "Test 5", studentTotal: 490, classAvg: 415 },
          ];
        }
        setStudentChartData({ subjectTotals, errorData, trendData: trendDataWithTotal, performanceTrend });
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

  // All colors forced to black for on-screen preview and printing
  const ERROR_COLORS = ["#000000", "#000000", "#000000"];
  const SUBJECT_COLORS = {
    Physics: "#000000",
    Chemistry: "#000000",
    Botany: "#000000",
    Zoology: "#000000"
  };
  const SWOT_COLORS = {
    Strengths: {
      border: "border-black",
      title: "text-black",
    },
    Weaknesses: {
      border: "border-black",
      title: "text-black",
    },
    Opportunities: {
      border: "border-black",
      title: "text-black",
    },
    Threats: {
      border: "border-black",
      title: "text-black",
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
  const { student = {}, summaryData = [], swotData = {}, subjectMarks = {}, selectedTestInfo = null, studentResultsArr = [] } = reportData || {};
  const { subjectTotals = [], errorData = [], trendData = [], performanceTrend = [] } = studentChartData || {};

  // Patterns ids used for print-friendly (black) fills
  const PATTERNS = {
    Physics: 'pattern-physics',
    Chemistry: 'pattern-chemistry',
    Botany: 'pattern-botany',
    Zoology: 'pattern-zoology',
    Total: 'pattern-total'
  };

  // Compute "nice" tick interval and axis max based on the actual highest value in the dataset.
  // This avoids large empty spaces when hardcoded mins/steps (like 180) are used.
  function computeNiceTicks(maxValue, desiredTicks = 4) {
    if (!isFinite(maxValue) || maxValue <= 0) return { max: 0, ticks: [0] };
    // Raw step
    const rawStep = maxValue / desiredTicks;
    // Magnitude of the step (10^n)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    let niceFraction;
    if (residual <= 1) niceFraction = 1;
    else if (residual <= 2) niceFraction = 2;
    else if (residual <= 5) niceFraction = 5;
    else niceFraction = 10;
    const step = niceFraction * magnitude;
    const niceMax = Math.ceil(maxValue / step) * step;
    const ticks = [];
    for (let v = 0; v <= niceMax; v += step) ticks.push(v);
    // Ensure at least two ticks (0 and max)
    if (ticks.length === 1) ticks.push(niceMax);
    return { max: niceMax, ticks };
  }

  // Trend chart ticks
  const safeTrendData = Array.isArray(trendData) ? trendData : [];
  // Use the maximum available marks for any subject from summaryData as a baseline
  // (e.g., if Physics has 50 marks available, ensure Y axis at least covers 50)
  const subjectMaxFromSummary = Math.max(0, ...summaryData.map(s => s.total ?? 0));
  // Only consider per-subject marks (exclude the summed `total` which can be much larger)
  const dataTrendMax = Math.max(0, ...safeTrendData.map(d => Math.max(d.Physics ?? 0, d.Chemistry ?? 0, d.Botany ?? 0, d.Zoology ?? 0, d.Biology ?? 0)));
  // Base on the largest available marks for a subject (from summaryData) or observed subject values
  const baseTrendMax = Math.max(subjectMaxFromSummary, dataTrendMax);
  // Add padding so axis isn't tight to the bars (user requested subject max + 100)
  const paddedTrendMax = baseTrendMax + 100;
  // Round padded max up to nearest 50 and create ticks in increments of 50
  const trendMax = Math.ceil(paddedTrendMax / 50) * 50;
  const trendTicks = Array.from({ length: Math.ceil(trendMax / 50) }, (_, i) => (i + 1) * 50);

  // Performance chart ticks (student total vs class avg)
  const safePerfData = Array.isArray(performanceTrend) ? performanceTrend : [];
  const perfRawMax = Math.max(0, ...safePerfData.map(d => Math.max(d.studentTotal ?? 0, d.classAvg ?? 0)));
  // Round up to next 100 and create ticks at 100-unit intervals (100,200,300...)
  let perfMax = Math.ceil(perfRawMax / 100) * 100;
  if (perfMax < 100) perfMax = 100; // ensure at least one tick of 100
  const perfTicks = Array.from({ length: perfMax / 100 }, (_, i) => (i + 1) * 100);

  // Calculate improvement rate for last test compared to previous test
  let improvementRate = null;
  if (selectedTestInfo && Array.isArray(studentResultsArr) && studentResultsArr.length > 1) {
    const sortedTests = [...studentResultsArr].sort((a, b) => a.test_num - b.test_num);
    const lastTest = sortedTests[sortedTests.length - 1];
    const prevTest = sortedTests[sortedTests.length - 2];
    if (lastTest && prevTest) {
      const lastTotal = (lastTest.phy_score ?? 0) + (lastTest.chem_score ?? 0) + (lastTest.bot_score ?? 0) + (lastTest.zoo_score ?? 0) + (lastTest.bio_score ?? 0);
      const prevTotal = (prevTest.phy_score ?? 0) + (prevTest.chem_score ?? 0) + (prevTest.bot_score ?? 0) + (prevTest.zoo_score ?? 0) + (prevTest.bio_score ?? 0);
      if (prevTotal > 0) {
        improvementRate = (((lastTotal - prevTotal) / prevTotal) * 100).toFixed(2);
      }
    }
  }

  // Read recommendations from reportData.overview.keyInsightsData (set during fetch)
  const keyInsights = reportData?.overview?.keyInsightsData || window.__lastDashboard?.overview?.keyInsightsData || {};
  const improvementPoints = Array.isArray(keyInsights.areasForImprovement) ? keyInsights.areasForImprovement.slice(0, 2) : [];
  const strengthPoints = Array.isArray(keyInsights.keyStrengths) ? keyInsights.keyStrengths.slice(0, 2) : [];
  const recommendations = [...improvementPoints, ...strengthPoints];

  // Re-organize SWOT by subject so UI can render subject-centric cards
  const SUBJECTS = ["Physics", "Chemistry", "Botany", "Zoology"];
  const CATEGORIES = ["Weaknesses", "Opportunities", "Strengths"];
  const CATEGORY_LABELS = {
    Weaknesses: "Focus Zone",
    Opportunities: "Edge Zone",
    Strengths: "Steady Zone"
  };
  const subjectsSwot = SUBJECTS.reduce((acc, s) => {
    acc[s] = { Strengths: [], Weaknesses: [], Opportunities: [] };
    return acc;
  }, {});
  if (swotData && typeof swotData === 'object') {
    CATEGORIES.forEach(cat => {
      const arr = swotData[cat] || [];
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          const subj = item.subject || item.subject_name || null;
          const topics = Array.isArray(item.topics) ? item.topics : [];
          if (subj) {
            if (!subjectsSwot[subj]) subjectsSwot[subj] = { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };
            subjectsSwot[subj][cat] = (subjectsSwot[subj][cat] || []).concat(topics);
          }
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* SVG patterns for printing with black ink */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <pattern id="pattern-physics" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <path d="M0,6 L6,0" stroke="#000" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-total" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            {/* Dense diagonal hatch for total bars */}
            <path d="M0,5 L5,0" stroke="#000" strokeWidth="0.3" />
            <path d="M1,6 L6,1" stroke="#000" strokeWidth="0.3" />
          </pattern>
          <pattern id="pattern-chemistry" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            {/* Crosshatch: two diagonal lines for stronger texture */}
            <path d="M0,0 L6,6" stroke="#000" strokeWidth="1" />
            <path d="M0,6 L6,0" stroke="#000" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-botany" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <circle cx="3" cy="3" r="1" fill="#000" />
          </pattern>
          <pattern id="pattern-zoology" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            {/* Horizontal stripes for zoology to distinguish from vertical/diagonal patterns */}
            <path d="M0,3 L6,3" stroke="#000" strokeWidth="1" />
          </pattern>
        </defs>
      </svg>

      <div className="max-w-5xl mx-auto font-sans text-black bg-white p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-6 border border-gray-200 rounded-xl">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              Student Performance Report
            </h1>
            <p className="text-sm text-black">powered by <span className="text-xl font-bold text-black">Inzight</span><span className="text-xl font-bold text-black">Ed </span> </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-lg text-black">{student.name}</p>
            <p className="text-sm text-black">ID: {student.student_id}</p>
          </div>
        </div>

        {/* Selected Test Mark Section */}
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {summaryData.map(({ subject, correct, incorrect, skipped }, idx) => (
            <div key={idx} className="border border-gray-200 bg-white p-4 rounded-lg">
              <span className="text-lg font-bold text-black block mb-2">{subject}</span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-black">Correct:</span>
                  <span className="text-sm font-semibold text-black">{correct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Incorrect:</span>
                  <span className="text-sm font-semibold text-black">{incorrect}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Skipped:</span>
                  <span className="text-sm font-semibold text-black">{skipped}</span>
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
                  {/* Legend kept, but ensure text is black for print. For composed chart (Total vs ClassAvg) use black colors */}
                  <Legend isAnimationActive={false} payload={[{ value: 'Total Marks', id: 'Total Marks' }, { value: 'Class Avg', id: 'Class Avg' }]} />
                  {/* Render class average line first so bars and their labels are painted on top */}
                  <Bar dataKey="studentTotal" fill={`url(#pattern-total)`} stroke="#000000" strokeWidth={1} radius={[5, 5, 0, 0]} barSize={20} isAnimationActive={false} name="Total Marks">
                    <LabelList dataKey="studentTotal" position="top" fill="#000000" fontSize={14} fontWeight={700} isAnimationActive={false} />
                  </Bar>
                  {/* Draw the class average line after the bars so it sits above them (black stroke) */}
                  <Line
                    type="monotone"
                    dataKey="classAvg"
                    stroke="#000000" /* black for print */
                    strokeWidth={1}
                    dot={{ r: 1.5, stroke: '#000000', fill: '#000000' }}
                    isAnimationActive={false}
                    name="Class Avg"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Test-wise Subject Performance & Total Trend*/}
        <div className="border border-gray-200 bg-white p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-4">Test-wise Subject Performance & Total Trend</h2>
          <div className="h-80"> {/* Increased height from h-64 to h-80 */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barCategoryGap={20} barSize={20} isAnimationActive={false}>
                <XAxis dataKey="name" isAnimationActive={false} stroke="#000000" />
                <YAxis domain={[0, trendMax]} ticks={trendTicks} isAnimationActive={false} stroke="#000000" />
                <Tooltip isAnimationActive={false} />
                {/* Custom legend that uses SVG patterns for print-friendly swatches */}
                <Legend isAnimationActive={false} content={({ payload }) => {
                  if (!payload) return null;
                  const order = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
                  const ordered = [...payload].sort((a, b) => order.indexOf(a.dataKey) - order.indexOf(b.dataKey));
                  return (
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', justifyContent: 'center', margin: 0 }}>
                      {ordered.map((entry, i) => {
                        // map dataKey to pattern id
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
                <Bar
                  dataKey="Physics"
                  fill={`url(#${PATTERNS.Physics})`}
                  stroke="#000000"
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="Physics" position="top" fill="#000000" fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar
                  dataKey="Chemistry"
                  fill={`url(#${PATTERNS.Chemistry})`}
                  stroke="#000000"
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="Chemistry" position="top" fill="#000000" fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar
                  dataKey="Botany"
                  fill={`url(#${PATTERNS.Botany})`}
                  stroke="#000000"
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="Botany" position="top" fill="#000000" fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
                <Bar
                  dataKey="Zoology"
                  fill={`url(#${PATTERNS.Zoology})`}
                  stroke="#000000"
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="Zoology" position="top" fill="#000000" fontSize={10} fontWeight={600} isAnimationActive={false} />
                </Bar>
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

        {/* Subject-centric SWOT (Physics / Chemistry / Botany / Zoology) */}
        <div>
          <h2 className="text-xl font-bold text-center mt-20 mb-10">Test Analysis</h2>
          <div className="grid grid-cols-2 gap-4">
            {SUBJECTS.map(subject => (
              <div key={subject} className="border border-gray-200 bg-white p-4 rounded-lg">
                <h3 className="font-bold mb-2 text-lg uppercase">{subject}</h3>
                <div className="space-y-3 text-sm">
                  {CATEGORIES.map(cat => (
                    <div key={cat}>
                      <div className="font-semibold text-sm mb-1">{CATEGORY_LABELS[cat]}</div>
                      {subjectsSwot[subject] && subjectsSwot[subject][cat] && subjectsSwot[subject][cat].length ? (
                        <ul className="list-disc list-inside ml-4 space-y-1">
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
          </div>
        </div>

        <div className="text-center text-sm italic text-black pt-4">
          Keep going — progress, not perfection.
        </div>
        <div className="text-center text-xs text-gray-400 pt-3">
          Generated by InzightEd
        </div>
      </div>
    </div>
  );
}