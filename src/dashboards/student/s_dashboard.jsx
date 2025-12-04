import React, { useState, useEffect } from 'react';
import { getStudentDashboardData } from '../../utils/api.js';
import { X, BarChart2, TrendingUp, Archive, Clipboard, HelpCircle, CheckCircle, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../components/ui/select.jsx';
import Stat from '../components/ui/stat.jsx';
import Carousel from '../components/ui/carousel.jsx';
import { Card } from '../../components/ui/card.jsx';
import SDashboardMobile from './s_dashboard_mobile.jsx';
import PageLoader from '../components/LoadingPage';

function SDashboard() {
  // State to hold the student dashboard data and loading/error status
  const [dashboardData, setDashboardData] = useState({
    keyInsightsData: {},
    subjectWiseData: {},
    subjectWiseDataMapping: [],
    performanceTrendDataMapping: {},
    lastTestImprovement: 0,
    lastTestPercentage: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student dashboard data from the API
        const data = await getStudentDashboardData();

        // Print all the data available in getStudentDashboardData to the console
        console.log('Raw data from getStudentDashboardData:', data);

        // Handle potential errors from the API
        if (!data || data.error) {
          throw new Error(data?.error || 'Failed to fetch data');
        }

        // Keep raw mappings for charts that need details
        const subjectWiseDataMapping = Array.isArray(data.subjectWiseDataMapping) ? data.subjectWiseDataMapping : [];

        // Build a normalized subjectWiseData object keyed by test name where each value is
        // an array of subject totals ordered by the global subjects discovered in the mapping.
        const globalSubjects = getSubjectsFromMapping(subjectWiseDataMapping || []);
        let subjectWiseData = {};
        subjectWiseDataMapping.forEach((row) => {
          const testName = row.Test || 'Unknown Test';
          subjectWiseData[testName] = (globalSubjects || []).map(s => {
            if (typeof row[s] !== 'undefined' && row[s] !== null) return Number(row[s]) || 0;
            const c = Number(row[`${s}__correct`] || 0);
            const i = Number(row[`${s}__incorrect`] || 0);
            const u = Number(row[`${s}__unattempted`] || row[`${s}__skipped`] || 0);
            return c + i + u;
          });
        });

        // Compute per-test totals and percentages from the detailed mapping (handles variable subject sets)
        const perTestStats = (subjectWiseDataMapping || []).map(row => {
          const testName = row.Test || 'Unknown Test';
          const details = buildSubjectDetailsFromRow(row, getSubjectsFromMapping([row]));
          const present = Array.isArray(details) ? details.filter(d => {
            const c = Number(d?.correct || 0);
            const i = Number(d?.incorrect || 0);
            const u = Number(d?.unattended ?? d?.skipped ?? d?.unattempted ?? 0);
            return (c + i + u) > 0;
          }) : [];

          // Compute total questions and total score using scoring: +4 for correct, -1 for incorrect, 0 for unattempted
          const subjectsToUse = (present.length ? present : (Array.isArray(details) ? details : []));
          let totalQuestions = 0;
          let totalScore = 0;
          subjectsToUse.forEach(d => {
            const c = Number(d?.correct || 0);
            const i = Number(d?.incorrect || 0);
            const u = Number(d?.unattended ?? d?.skipped ?? d?.unattempted ?? 0);
            const q = c + i + u;
            totalQuestions += q;
            totalScore += (c * 4) + (i * -1) + (u * 0);
          });

          const percentage = totalQuestions > 0 ? (totalScore / (totalQuestions * 4)) * 100 : 0;
          return { testName, totalScore, totalQuestions, percentage };
        });

        const testKeys = perTestStats.map(p => p.testName);
        let lastTestPercentage = 0;
        let lastTestImprovement = 0;

        if (perTestStats.length > 0) {
          const last = perTestStats[perTestStats.length - 1];
          lastTestPercentage = Number(last.percentage || 0);
          if (perTestStats.length > 1) {
            const prev = perTestStats[perTestStats.length - 2];
            const prevPct = Number(prev.percentage || 0);
            lastTestImprovement = prevPct > 0 ? ((lastTestPercentage - prevPct) / prevPct) * 100 : 0;
          }
        }

        // Update the dashboard data state with the fetched and transformed data
        setDashboardData({
          keyInsightsData: data.keyInsightsData || {},
          subjectWiseData,
          subjectWiseDataMapping,
          performanceTrendDataMapping: data.performanceTrendDataMapping || {},
          perTestStats,
          lastTestImprovement,
          lastTestPercentage,
          isLoading: false,
          error: null,
        });

        // Set default selections
        if (testKeys.length > 0) {
          setSelectedTest(testKeys[testKeys.length - 1]);
        }
      } catch (error) {
        // Update the dashboard data state with the error message
        setDashboardData((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
      }
    };

    // Call the fetchData function when the component mounts
    fetchData();
  }, []); // Empty dependency array ensures this effect runs only once

  // Destructure data, loading state, and error from the dashboardData state.
  const {
    keyInsightsData,
    subjectWiseData,
    lastTestImprovement,
    lastTestPercentage,
    isLoading,
    error
  } = dashboardData;

  console.log('dashboardData:', {
    keyInsightsData,
    subjectWiseData,
    lastTestImprovement,
    lastTestPercentage,
    isLoading,
    error
  });

  // State to manage the currently selected subject for the Performance Trend Chart.
  // Initialized as an empty string, default will be set when rendering the chart.
  const [selectedSubjectTrend, setSelectedSubjectTrend] = useState('Overall');

  // State to manage the currently selected test for the Subject-Wise Analysis Chart.
  // Initialized as an empty string, default will be set when rendering the chart.
  const [selectedTest, setSelectedTest] = useState('');

  // --- Conditional Rendering for Loading and Error States ---

  // Display a loading indicator while dashboard data is being fetched.
  if (isLoading) {
    return <PageLoader />;
  }

  // Display an error message if data fetching failed.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-4 bg-base-100 rounded-lg shadow-md">
        <div className="alert alert-error max-w-md shadow-lg">
          <AlertTriangle className="stroke-current shrink-0 h-6 w-6" />
          <div>
            <h3 className="font-bold">Error loading dashboard!</h3>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Dashboard Content ---
  // Create summary cards directly from subjectWiseData
  // Compute average percentage across all tests using per-test stats derived from mapping
  const perTestStats = dashboardData.perTestStats || [];
  const _nTests = perTestStats.length;
  const averagePercentage = _nTests ? (perTestStats.reduce((s, p) => s + (Number(p.percentage || 0)), 0) / _nTests) : 0;
  // Compute average improvement for the average-percentage badge (compare avg of first n-1 tests vs avg of all n tests)
  let averageMarkImprovement = 0;
  if (_nTests > 1) {
    const prevAvg = perTestStats.slice(0, -1).reduce((s, p) => s + (Number(p.percentage || 0)), 0) / (_nTests - 1);
    const newAvg = averagePercentage;
    averageMarkImprovement = prevAvg > 0 ? ((newAvg - prevAvg) / prevAvg) * 100 : (newAvg - prevAvg);
  }
  const summaryCards = [
    {
      title: 'Recent Test Performance',
      value: lastTestPercentage,
      icon: 'ChartLine',
      id: 'last-test-performance',
      description: 'Percentage score from the most recent test'
    },
    {
      title: 'Average Percentage',
      value: Number(averagePercentage.toFixed(1)),
      icon: 'TrendUp',
      id: 'average-percentage',
      description: 'Average percentage across all tests'
    },
    {
      title: 'Tests Taken',
      value: Object.keys(subjectWiseData).length,
      icon: 'ClipboardText',
      id: 'tests-taken',
      description: 'Total number of tests completed'
    }
  ];

  // derive subjects list once for children that need it
  // Make subjects responsive to the currently selected test: compute per-test subjects
  const _mapping = dashboardData.subjectWiseDataMapping || [];
  const _tests = Array.isArray(_mapping) ? _mapping.map(r => r.Test || 'Unknown Test') : [];
  const _selectedTestKey = selectedTest || (_tests.length ? _tests[_tests.length - 1] : undefined);
  const _selectedTestRow = _mapping.find(r => (r.Test || '') === _selectedTestKey) || {};
  // Build subject details for the selected test and derive subject names. Fall back to global mapping-derived list.
  const subjectsForSelectedTest = (function () {
    const details = buildSubjectDetailsFromRow(_selectedTestRow, getSubjectsFromMapping([_selectedTestRow]));
    // Filter out subjects that did not appear in this test: all breakdown fields zero
    const present = Array.isArray(details) ? details.filter(d => {
      const c = Number(d?.correct || 0);
      const i = Number(d?.incorrect || 0);
      const u = Number(d?.unattended ?? d?.skipped ?? d?.unattempted ?? 0);
      return (c + i + u) > 0;
    }) : [];
    const names = present.map(d => d?.name).filter(Boolean);
    if (names.length) return names;

    // If no subject breakdowns indicate presence, fall back to global mapping-derived subjects
    const global = getSubjectsFromMapping(_mapping || []);
    return (global && global.length) ? global : SUBJECTS;
  })();

  // Global derived subjects (used by SubjectWiseAnalysisChart and other components)
  const derivedSubjects = getSubjectsFromMapping(_mapping || []) || SUBJECTS;

  return (
    <>
      {/* Mobile version */}
      <div className="block md:hidden">
        <SDashboardMobile />
      </div>

      {/* Desktop version */}
      <div className="hidden md:block">
        <div className="space-y-6 sm:space-y-8 pt-6 sm:pt-12 mx-none sm:mx-4 lg:m-4">
          {/* Row 1: Left column = Summary cards (top) + Carousel (bottom). Right column = PerformanceTrendChart */}
          <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-2">
            {/* Left stacked column: Summary on top, Carousel below */}
            <div className="flex flex-col gap-3 sm:gap-8">
              <div className="hidden sm:grid sm:grid-cols-3 gap-3 sm:gap-6">
                {summaryCards.length ? (
                  summaryCards.map((card, idx) => {
                    const { icon: iconName = 'Default', title = 'Untitled Stat', value, id, description } = card;
                    const iconMap = {
                      ChartLine: <BarChart2 />,
                      ClipboardText: <Clipboard />,
                      TrendUp: <TrendingUp />,
                      Archive: <Archive />,
                      Default: <HelpCircle />
                    };

                    // same badge generation as before
                    const badgeForThis = (() => {
                      if (title === 'Recent Test Performance') {
                        const isPositive = lastTestImprovement > 0;
                        const isNegative = lastTestImprovement < 0;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold ml-1 sm:ml-2 ${isPositive ? 'bg-green-50 text-green-700' : isNegative ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                            {isPositive ? '+' : ''}{lastTestImprovement.toFixed(1)}%
                            {isPositive ? (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : isNegative ? (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 8h8M8 8H0" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" /></svg>
                            )}
                          </span>
                        );
                      }

                      if (title === 'Average Percentage') {
                        const isPositive = averageMarkImprovement > 0;
                        const isNegative = averageMarkImprovement < 0;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold ml-1 sm:ml-2 ${isPositive ? 'bg-green-50 text-green-700' : isNegative ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                            {isPositive ? '+' : ''}{averageMarkImprovement.toFixed(1)}%
                            {isPositive ? (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : isNegative ? (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 8h8M8 8H0" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" /></svg>
                            )}
                          </span>
                        );
                      }

                      return null;
                    })();

                    return (
                      <Stat
                        key={id || `stat-${idx}`}
                        icon={iconMap[iconName] || iconMap.Default}
                        label={title}
                        value={formatStatValue(value)}
                        info={description}
                        badge={badgeForThis}
                        compact={true}
                      />
                    );
                  })
                ) : (
                  <div>
                    <div role="alert" className="alert alert-info shadow-lg my-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>No Summary Data Available.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop: keep Carousel (visible on sm and up) */}
              <div className="hidden sm:block w-full">
                <Carousel
                  sections={[
                    {
                      key: 'keyStrengths',
                      title: 'Key Strengths',
                      items: keyInsightsData?.keyStrengths || [],
                      icon: <CheckCircle size={18} className="text-green-500" />,
                      tag: (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Sparkles size={12} />
                          AI Generated
                        </span>
                      ),
                      tagTooltip: 'AI-generated strengths identified for the student.'
                    },
                    {
                      key: 'areasForImprovement',
                      title: 'Areas for Improvement',
                      items: keyInsightsData?.areasForImprovement || [],
                      icon: <AlertTriangle size={18} className="text-amber-500" />,
                      tag: (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Sparkles size={12} />
                          AI Generated
                        </span>
                      ),
                      tagTooltip: 'AI-generated suggestions for improvement.'
                    },
                    {
                      key: 'yetToDecide',
                      title: 'Consistency Vulnerability',
                      items: keyInsightsData?.yetToDecide || [],
                      icon: <Clock size={18} className="text-purple-500" />,
                      tag: (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Sparkles size={12} />
                          AI Generated
                        </span>
                      ),
                      tagTooltip: 'Potential vulnerabilities in consistency, identified by AI.'
                    }
                  ]}
                  emptyMessage="No insights available"
                />
              </div>
            </div>

            {/* Right column: Donut (question breakdown) at top, summary card below */}
            <div className="flex flex-col gap-3">
              <Card className="h-full rounded-2xl border border-gray-250 bg-gray-100 flex flex-col items-start justify-start sm:p-0 p-2">
                <div className="w-full flex flex-col h-full bg-white p-3 sm:p-6 rounded-2xl">
                  <div className="w-full flex flex-col sm:flex-row justify-between items-start mb-0.5 sm:mb-1">
                    <div className="flex flex-col items-start justify-start gap-0">
                      <h3 className="text-primary text-lg font-semibold">Question Breakdown</h3>
                      <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-6">Correct / Incorrect / Skipped for selected test & subject</p>
                    </div>

                    {/* Desktop selects */}
                    <div className="hidden sm:block w-full">
                      <div className="flex justify-end">
                        <div className="w-fit">
                          <Select onValueChange={(val) => { setSelectedTest(val); setSelectedSubjectTrend('Overall'); }} value={selectedTest}>
                            <SelectTrigger className="btn btn-sm justify-between w-full max-w-full truncate text-start">
                              <SelectValue placeholder="Select Test" />
                            </SelectTrigger>
                            <SelectContent side="bottom" align="start">
                              {_mapping.map(r => (
                                <SelectItem key={r.Test || String(r)} value={r.Test || ''}>{r.Test || 'Unknown'}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-fit ml-2">
                          <Select onValueChange={(val) => setSelectedSubjectTrend(val)} value={selectedSubjectTrend}>
                            <SelectTrigger className="btn btn-sm justify-between w-full max-w-full truncate text-start">
                              <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent side="bottom" align="start">
                              {['Overall', ...subjectsForSelectedTest].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full border border-bg-primary rounded-lg p-2 bg-white flex-1 min-h-[160px] sm:min-h-[220px] flex items-center justify-center">
                    <DonutChart
                      subjectWiseDataMapping={dashboardData.subjectWiseDataMapping}
                      selectedTest={selectedTest}
                      setSelectedTest={setSelectedTest}
                      selectedSubject={selectedSubjectTrend}
                      setSelectedSubject={setSelectedSubjectTrend}
                    />
                  </div>
                  {/* Three small stat cards placed outside the donut container */}
                  <div className="w-full mt-3 grid grid-cols-3 gap-2">
                    {
                      // derive counts from the mapping and current selections using the normalization helper
                      (() => {
                        const mapping = dashboardData.subjectWiseDataMapping || [];
                        const tests = Array.isArray(mapping) ? mapping.map(r => r.Test || 'Unknown Test') : [];
                        const testKey = selectedTest || (tests.length ? tests[tests.length - 1] : undefined);
                        const testRow = mapping.find(r => (r.Test || '') === testKey) || {};

                        const subjectsList = getSubjectsFromMapping(mapping);
                        const subjects = buildSubjectDetailsFromRow(testRow, subjectsList);
                        const selectedSubName = selectedSubjectTrend || (subjects[0] && subjects[0].name) || (subjectsList[0] || 'Physics');

                        let correct = 0;
                        let incorrect = 0;
                        let skipped = 0;

                        if (selectedSubName === 'Overall') {
                          subjects.forEach(d => {
                            if (!d) return;
                            correct += Number(d.correct || 0);
                            incorrect += Number(d.incorrect || 0);
                            skipped += Number(d.unattended ?? d.skipped ?? 0);
                          });
                        } else {
                          const subjectRow = subjects.find(d => d && (d.name === selectedSubName || d.name?.toLowerCase() === selectedSubName?.toLowerCase())) || {};
                          correct = Number(subjectRow.correct || 0);
                          incorrect = Number(subjectRow.incorrect || 0);
                          skipped = Number(subjectRow.unattended ?? subjectRow.skipped ?? 0);
                        }

                        return [
                          (<div key="c" className="p-2"><div className="p-3 bg-white rounded-lg border border-green-600 text-center"><div className="text-xs text-gray-500">Correct Answers</div><div className="mt-1 text-lg font-semibold text-green-600">{correct}</div></div></div>),
                          (<div key="i" className="p-2"><div className="p-3 bg-white rounded-lg border border-orange-500 text-center"><div className="text-xs text-gray-500">Incorrect Answers</div><div className="mt-1 text-lg font-semibold text-orange-500">{incorrect}</div></div></div>),
                          (<div key="s" className="p-2"><div className="p-3 bg-white rounded-lg border border-gray-600 text-center"><div className="text-xs text-gray-500">Skipped Questions</div><div className="mt-1 text-lg font-semibold text-gray-600">{skipped}</div></div></div>)
                        ];
                      })()
                    }
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Row 2: Subject wise analysis on left, empty right cell for now */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <PerformanceTrendChart
                subjectWiseData={subjectWiseData}
                subjectWiseDataMapping={dashboardData.subjectWiseDataMapping}
              />
            </div>
            <div>
              <SubjectWiseAnalysisChart
                testData={subjectWiseData}
                subjectWiseDataMapping={dashboardData.subjectWiseDataMapping}
                selectedTest={selectedTest}
                setSelectedTest={setSelectedTest}
                subjectLabels={subjectsForSelectedTest}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SDashboard;

// -------------------------- Inlined Components --------------------------

// Register ChartJS components (safe to call even if imported elsewhere)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

/** DonutChart component: shows correct/incorrect/unattended counts for a selected test and subject */
// Helper: normalize a mapping row into an array of subjectDetails with { name, correct, incorrect, unattended, total }
// Helper: derive subjects dynamically from subjectWiseDataMapping. Prefer a sensible canonical order when possible.
const getSubjectsFromMapping = (mapping = []) => {
  if (!Array.isArray(mapping) || mapping.length === 0) return [];
  const set = new Set();
  mapping.forEach(row => {
    Object.keys(row || {}).forEach(k => {
      if (!k) return;
      if (k === 'Test') return;
      const base = k.includes('__') ? k.split('__')[0] : k;
      if (base) set.add(base);
    });
  });
  // prefer this display order when present, append any others deterministically
  const preferred = ['Physics', 'Chemistry', 'Botany', 'Zoology', 'Biology'];
  const rest = Array.from(set).filter(s => !preferred.includes(s)).sort();
  return [...preferred.filter(p => set.has(p)), ...rest];
};

// Backward-compatible fallback constant. New code prefers dynamic derivation via `getSubjectsFromMapping`.
const SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

const buildSubjectDetailsFromRow = (row = {}, subjects = []) => {
  // If subjects not provided, attempt to derive from row keys
  if (!subjects || !subjects.length) {
    subjects = Object.keys(row || {}).filter(k => k && k !== 'Test').map(k => (k.includes('__') ? k.split('__')[0] : k));
    subjects = Array.from(new Set(subjects));
  }

  // If the row already provides subjectDetails array, normalize each entry
  if (Array.isArray(row.subjectDetails)) {
    return row.subjectDetails.map(d => ({
      name: d?.name ?? null,
      correct: Number(d?.correct ?? d?.correct_count ?? 0),
      incorrect: Number(d?.incorrect ?? d?.incorrect_count ?? 0),
      unattended: Number(d?.unattended ?? d?.skipped ?? d?.unattempted ?? 0),
      total: Number(d?.total ?? 0)
    }));
  }

  // Detect flattened shape using provided subjects
  const looksLikeFlattened = subjects.some(s => Object.prototype.hasOwnProperty.call(row, `${s}__correct`));
  if (looksLikeFlattened) {
    return subjects.map(s => ({
      name: s,
      correct: Number(row[`${s}__correct`] || 0),
      incorrect: Number(row[`${s}__incorrect`] || 0),
      unattended: Number(row[`${s}__unattempted`] || row[`${s}__skipped`] || 0),
      total: Number(row[s] || 0)
    }));
  }

  // Fallback: if row has per-subject totals like row.Botany etc., return totals with zeroed breakdown
  return subjects.map(s => ({
    name: s,
    correct: Number(row[`${s}__correct`] || 0),
    incorrect: Number(row[`${s}__incorrect`] || 0),
    unattended: Number(row[`${s}__unattempted`] || row[`${s}__skipped`] || 0),
    total: Number(row[s] || 0)
  }));
};

const DonutChart = ({ subjectWiseDataMapping = [], selectedTest, setSelectedTest, selectedSubject, setSelectedSubject }) => {
  const tests = Array.isArray(subjectWiseDataMapping) ? subjectWiseDataMapping.map(r => r.Test || 'Unknown Test') : [];

  // derive subjects for this mapping and use them to normalize rows
  const subjectsList = getSubjectsFromMapping(subjectWiseDataMapping);

  // find details for selectedTest (if not provided, pick last test)
  const testKey = selectedTest || (tests.length ? tests[tests.length - 1] : undefined);
  const testRow = subjectWiseDataMapping.find(r => (r.Test || '') === testKey) || {};

  // Build normalized subjectDetails from whatever shape the API returned
  const subjectDetails = buildSubjectDetailsFromRow(testRow, subjectsList);

  // Selected subject row. Support 'Overall' which aggregates across all subjectDetails
  const selectedSubName = selectedSubject || (subjectDetails[0] && subjectDetails[0].name) || (subjectsList[0] || 'Physics');

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  if (selectedSubName === 'Overall') {
    // Sum across all subjects available in subjectDetails
    subjectDetails.forEach(d => {
      if (!d) return;
      correct += Number(d.correct || 0);
      incorrect += Number(d.incorrect || 0);
      skipped += Number(d.unattended ?? d.skipped ?? 0);
    });
  } else {
    const subjectRow = subjectDetails.find(d => d && (d.name === selectedSubName || d.name?.toLowerCase() === selectedSubName?.toLowerCase())) || {};
    correct = Number(subjectRow.correct || 0);
    incorrect = Number(subjectRow.incorrect || 0);
    skipped = Number(subjectRow.unattended ?? subjectRow.skipped ?? 0);
  }

  const hasData = correct || incorrect || skipped;

  const data = {
    labels: ['Correct', 'Incorrect', 'Skipped'],
    // Use semantic colors: green for Correct, orange for Incorrect, gray for Skipped
    datasets: [{ data: [correct, incorrect, skipped], backgroundColor: ['#10B981', '#f97316', '#9CA3AF'] }]
  };

  // Make the donut appear larger and thinner by increasing the cutout percentage
  const options = { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } };
  // Plugin to draw total in the center of the donut and a label beneath it
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      // derive total from the chart dataset so it updates reactively
      const ds = chart.data && chart.data.datasets && chart.data.datasets[0];
      const values = Array.isArray(ds && ds.data) ? ds.data : [];
      const total = values.reduce((s, v) => s + (Number(v) || 0), 0);

      ctx.save();
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      // responsive font sizes based on chart height
      const baseHeight = (chartArea.bottom - chartArea.top);
      const numberFontSize = Math.max(12, Math.round(baseHeight / 6));
      const labelFontSize = Math.max(10, Math.round(baseHeight / 12));

      // Draw the total number (prominent)
      ctx.font = `600 ${numberFontSize}px Tenorite, sans-serif`;
      ctx.fillStyle = '#374151'; // neutral dark gray for number
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(total), centerX, centerY - (labelFontSize * 0.6));

      // Draw the label beneath the number
      ctx.font = `500 ${labelFontSize}px Tenorite, sans-serif`;
      ctx.fillStyle = '#6b7280'; // lighter gray for label
      ctx.textBaseline = 'top';
      ctx.fillText('Total Questions', centerX, centerY + (numberFontSize * 0.25));

      ctx.restore();
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="h-48 w-48 sm:h-56 sm:w-56">
        {hasData ? <Doughnut data={data} options={options} plugins={[centerTextPlugin]} /> : <p className="text-xs text-gray-500 text-center">No question breakdown</p>}
      </div>
    </div>
  );
};

// Small SelectDropdown fallback: if the project already has one at the path
// we imported above, the import will be used. If not, ensure file exists.

/** SummaryCards (inlined from SummaryCard.jsx) */
const ICON_MAPPING = {
  ChartLine: <BarChart2 aria-hidden="true" />,
  ClipboardText: <Clipboard aria-hidden="true" />,
  TrendUp: <TrendingUp aria-hidden="true" />,
  Archive: <Archive aria-hidden="true" />,
  Default: <HelpCircle aria-hidden="true" />
};

const formatStatValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return 'N/A';
  const valueStr = String(value);
  const isPercentage = valueStr.includes('%');
  const numericString = valueStr.replace(/[^0-9.-]+/g, '');
  const rawValue = parseFloat(numericString);
  if (!isNaN(rawValue)) {
    // Check if this is likely a percentage value (between 0-100 with decimals)
    const isLikelyPercentage = rawValue >= 0 && rawValue <= 100 && valueStr.includes('.');
    const wasIntendedAsInteger = Number.isInteger(rawValue) && !valueStr.includes('.');
    const formattedValue = wasIntendedAsInteger ? rawValue : rawValue.toFixed(1);
    return isPercentage || isLikelyPercentage ? `${formattedValue}%` : formattedValue;
  }
  return valueStr;
};


/** PerformanceTrendChart (inlined from s_performancetrend.jsx) */
const PerformanceTrendChart = ({ selectedSubject, setSelectedSubject, subjectWiseData = {}, subjectWiseDataMapping = [], title = 'Performance Trend' }) => {
  // if parent doesn't control selectedSubject, manage it locally
  const [localSelectedSubject, setLocalSelectedSubject] = React.useState('Overall');
  const effectiveSelectedSubject = selectedSubject ?? localSelectedSubject;
  const effectiveSetSelectedSubject = setSelectedSubject ?? setLocalSelectedSubject;
  // Normalize performanceData so each subject becomes an array of { name, value }
  const normalize = (arr) => (Array.isArray(arr) ? arr.map(item => {
    if (item === null || item === undefined) return { name: null, value: 0 };
    if (typeof item === 'number') return { name: null, value: item };
    if (typeof item === 'object') {
      // common shapes: { name, value } or { name, val } or { test_num, value }
      if ('value' in item && 'name' in item) return { name: item.name, value: item.value ?? 0 };
      if ('val' in item && 'name' in item) return { name: item.name, value: item.val ?? 0 };
      if ('test_num' in item || 'testNum' in item) return { name: item.name || `Test ${item.test_num || item.testNum}`, value: item.value ?? item.val ?? 0 };
      // fallback: look for any numeric property as value
      const numeric = Object.values(item).find(v => typeof v === 'number');
      return { name: item.name ?? null, value: numeric ?? 0 };
    }
    return { name: null, value: 0 };
  }) : []);

  // Determine subject names solely from subjectWiseDataMapping (do NOT use performanceTrendDataMapping)
  let subjectNames = getSubjectsFromMapping(subjectWiseDataMapping || []);
  if (!subjectNames || subjectNames.length === 0) subjectNames = SUBJECTS;

  // Prefer test ordering from the mapping when available, otherwise fall back to subjectWiseData keys
  const testKeys = (Array.isArray(subjectWiseDataMapping) && subjectWiseDataMapping.length)
    ? subjectWiseDataMapping.map((r, i) => r.Test || `Test ${i + 1}`)
    : Object.keys(subjectWiseData || {});

  // Create performanceData using the mapping rows when available (safer for dynamic subject lists).
  const performanceData = {};
  subjectNames.forEach((subject) => {
    if (Array.isArray(subjectWiseDataMapping) && subjectWiseDataMapping.length) {
      // Build series directly from mapping in order (fast and reliable)
      performanceData[subject] = subjectWiseDataMapping.map(row => {
        if (typeof row[subject] !== 'undefined' && row[subject] !== null) return Number(row[subject]) || 0;
        // fallback: sum parts if totals not provided
        const c = Number(row[`${subject}__correct`] || 0);
        const i = Number(row[`${subject}__incorrect`] || 0);
        const u = Number(row[`${subject}__unattempted`] || row[`${subject}__skipped`] || 0);
        const total = Number(row[subject] || 0);
        return total || (c + i + u);
      });
    } else {
      // fallback: use array-based subjectWiseData and align by index using subjectNames
      performanceData[subject] = testKeys.map(test => {
        const arr = subjectWiseData[test] || [];
        const idx = subjectNames.indexOf(subject);
        const val = typeof arr[idx] !== 'undefined' ? arr[idx] : 0;
        return typeof val === 'number' ? val : Number(val || 0);
      });
    }
  });

  const subjectKeys = Object.keys(performanceData || {});
  const subjects = ['Overall', ...subjectKeys];

  const normalizedPerfs = Object.fromEntries(Object.entries(performanceData || {}).map(([k, v]) => [k, normalize(v)]));

  // Prefer test labels coming from subjectWiseData (e.g. Test1..TestN) when available.
  // subjectWiseData gives a per-test array where each index corresponds to a subject in the same order
  // as Object.keys(performanceData). We'll use that ordering to align values correctly (this fixes
  // cases where a subject has values only for later tests, e.g. Zoology having values for Test5/Test6).
  const testsFromSubjectWise = Object.keys(subjectWiseData || {});

  let masterLabels;
  if (testsFromSubjectWise.length) {
    masterLabels = testsFromSubjectWise;
  } else {
    // fallback to previous index/name based approach
    let maxLen = 0;
    const allArrays = Object.values(normalizedPerfs).filter(Array.isArray);
    allArrays.forEach(arr => { maxLen = Math.max(maxLen, arr.length); });

    masterLabels = Array.from({ length: maxLen }).map((_, idx) => {
      for (let i = 0; i < allArrays.length; i++) {
        const entry = allArrays[i][idx];
        if (entry && entry.name) return entry.name;
      }
      return `Test ${idx + 1}`;
    });
  }

  // Align each subject's data to masterLabels. Try to use subjectWiseData (by subject index) first
  // so that subjects with data only for later tests land correctly. Fallback to normalizedPerfs entries
  // or named-match when subjectWiseData isn't available for a label.
  const alignedSubjectData = (subjectKey) => {
    const arr = normalizedPerfs[subjectKey] || [];
    // Determine the correct index for this subject within the per-test arrays.
    // Use subjectKeys (which does NOT include 'Overall') so the index matches the
    // ordering used when building subjectWiseData (Physics, Chemistry, Botany, ...).
    const subjectIndex = subjectKeys.indexOf(subjectKey);

    return masterLabels.map((label, idx) => {
      // 1) If subjectWiseData is available for this test and contains an entry at subjectIndex, use it
      if (subjectIndex !== -1 && subjectWiseData && Array.isArray(subjectWiseData[label])) {
        const val = subjectWiseData[label][subjectIndex];
        if (typeof val === 'number') return val;
        // sometimes values might be numeric strings or formatted like '119/720' -- skip those here
      }

      // 2) fallback to normalized array index
      if (arr[idx] && typeof arr[idx].value === 'number') return arr[idx].value;
      if (typeof arr[idx] === 'number') return arr[idx];

      // 3) try name-match
      const found = arr.find(e => e && e.name === label);
      if (found && typeof found.value === 'number') return found.value;

      // 4) final fallback: 0
      return 0;
    });
  };

  // Compute per-test averages based on masterLabels
  const testWiseAvgMarks = masterLabels.map((label, idx) => {
    const vals = Object.keys(normalizedPerfs).map(sub => {
      const v = alignedSubjectData(sub)[idx];
      return (typeof v === 'number') ? v : undefined;
    }).filter(v => typeof v === 'number');
    const avg = vals.length ? Math.round(vals.reduce((s, n) => s + n, 0) / vals.length) : 0;
    return { test: label, avg };
  });

  // Compute per-test sums (total marks across all subjects) - used when 'Overall' is selected
  const testWiseSumMarks = masterLabels.map((label, idx) => {
    const vals = Object.keys(normalizedPerfs).map(sub => {
      const v = alignedSubjectData(sub)[idx];
      return (typeof v === 'number') ? v : 0;
    });
    const sum = vals.length ? vals.reduce((s, n) => s + n, 0) : 0;
    return { test: label, sum };
  });

  // Prepare subject-specific data and labels using masterLabels
  const dynamicLabels = masterLabels;
  // When 'Overall' is chosen, show total marks (sum across subjects) per test. Otherwise show the selected subject's marks.
  const subjectData = effectiveSelectedSubject === 'Overall' ? testWiseSumMarks.map(t => t.sum) : alignedSubjectData(effectiveSelectedSubject || subjects[1] || '');

  // highest/lowest for the summary row below the chart (ignore nulls)
  const avgValues = testWiseAvgMarks.map(t => t.avg).filter(v => typeof v === 'number');
  const highest = avgValues.length ? Math.max(...avgValues) : 0;
  const lowest = avgValues.length ? Math.min(...avgValues) : 0;

  // selected-subject specific highest/lowest (useful to show subject extremes)
  const numericSubjectVals = (subjectData || []).filter(v => typeof v === 'number');
  const subjectHighest = numericSubjectVals.length ? Math.max(...numericSubjectVals) : 0;
  const subjectLowest = numericSubjectVals.length ? Math.min(...numericSubjectVals) : 0;

  const chartData = {
    labels: dynamicLabels,
    datasets: [
      {
        label: effectiveSelectedSubject === 'Overall' ? 'Total Mark' : effectiveSelectedSubject + ' Mark',
        data: subjectData,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(37,99,235,0.15)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(37,99,235,0.35)');
          gradient.addColorStop(1, 'rgba(37,99,235,0.05)');
          return gradient;
        },
        borderColor: '#2563eb',
        borderWidth: 2,
        pointBackgroundColor: '#2563eb',
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBorderWidth: 2,
        pointBorderColor: '#fff',
        tension: 0.45
      },
      {
        label: 'Average',
        data: (() => {
          // number of tests
          const nTests = (dynamicLabels && dynamicLabels.length) ? dynamicLabels.length : 0;
          if (nTests === 0) return [];

          if (effectiveSelectedSubject === 'Overall') {
            // overall: average of total marks per test
            const totalAcrossTests = testWiseSumMarks.reduce((s, t) => s + (typeof t.sum === 'number' ? t.sum : 0), 0);
            const overallAvg = totalAcrossTests / nTests;
            return dynamicLabels.map(() => overallAvg);
          } else {
            // subject: average of the selected subject across all tests (include zeros if any)
            const subjectVals = alignedSubjectData(effectiveSelectedSubject || '') || [];
            const sum = subjectVals.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
            const subjectAvg = sum / nTests;
            return dynamicLabels.map(() => subjectAvg);
          }
        })(),
        fill: false,
        borderColor: '#9CA3AF',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#ffffffff',
        titleColor: '#374151',
        bodyColor: '#374151',
        borderColor: '#d1d5db',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { family: 'Tenorite, sans-serif', size: 14 },
        bodyFont: { family: 'Tenorite, sans-serif', size: 13 },
        mode: 'index',
        intersect: false,
        callbacks: {
          // show label as provided (handles Test names)
          title: (items) => items && items[0] ? items[0].label : undefined
        }
      },
      animation: { duration: 1200, easing: 'easeOutQuart' }
    },
    hover: { mode: 'index', intersect: false },
    onHover: function (event, chartElement) {
      const target = event?.native?.target || event?.target;
      if (target) {
        target.style.cursor = chartElement && chartElement.length ? 'crosshair' : 'default';
      }
    },
    scales: {
      x: {
        title: { display: false },
        ticks: { color: '#6b7280', font: { family: 'Tenorite, sans-serif', size: 13 } },
        border: { width: 0 },
        grid: { display: false }
      },
      y: {
        title: { display: false },
        beginAtZero: true,
        // determine max from numeric values only
        max: (() => {
          const nums = (subjectData || []).filter(v => typeof v === 'number');
          const maxVal = nums.length ? Math.max(...nums) : 100;
          const base = Math.max(100, Math.ceil(maxVal / 100) * 100);
          return base;
        })(),
        border: { width: 0 },
        ticks: { color: '#6b7280', font: { family: 'Tenorite, sans-serif', size: 13 }, stepSize: 100 },
        grid: { color: '#f3f4f6' }
      }
    },
    layout: { padding: { top: 16, bottom: 8, left: 8, right: 8 } },
    elements: { line: { borderJoinStyle: 'round' }, point: { pointStyle: 'circle' } }
  };

  // subjects already defined above

  return (
    <Card className="rounded-2xl border border-gray-250 bg-gray-100 flex flex-col items-start justify-start sm:p-0 p-2">
      {/* Title & Chart Container */}
      <div className="w-full flex flex-col bg-white p-3 sm:p-6 rounded-2xl">
        {/* Title Container: stack on mobile, row on sm+ */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-start mb-0.5 sm:mb-1">
          <div className="flex flex-col items-start justify-start gap-0">
            <span className="text-lg sm:text-lg font-bold text-primary">{title}</span>
            <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-6">Average marks across all students</p>
          </div>

          {subjects.length > 0 && (
            <>
              {/* Desktop/Tablet: select at the right (hidden on mobile) */}
              <div className="hidden sm:block w-full">
                <div className="flex justify-end">
                  <div className="w-fit text-start">
                    <Select onValueChange={(val) => effectiveSetSelectedSubject(val)} value={effectiveSelectedSubject}>
                      <SelectTrigger className="btn btn-sm justify-between w-full max-w-full truncate text-start">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start">
                        {subjects.map(sub => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Mobile: stacked select below the paragraph (visible only on mobile) */}
              <div className="block sm:hidden w-full my-2">
                <div className="w-full">
                  <Select onValueChange={(val) => effectiveSetSelectedSubject(val)} value={effectiveSelectedSubject}>
                    <SelectTrigger className="btn btn-sm justify-between w-full text-start">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="end">
                      {subjects.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Area Chart Container */}
        <div className="flex flex-col items-center justify-center w-full bg-white h-56 sm:h-80 border border-gray-200 rounded-lg">
          <Line data={chartData} options={options} width={260} height={140} />
        </div>
      </div>
    </Card>
  );
};

/** SubjectWiseAnalysisChart (inlined from s_subjectwiseanalysis.jsx) */
const SubjectWiseAnalysisChart = ({ selectedTest, setSelectedTest, testData = {}, subjectWiseDataMapping = [], subjectLabels = ['Physics', 'Chemistry', 'Botany', 'Zoology'], title = 'Subject-wise Analysis' }) => {
  // local selection when parent doesn't control it
  const [localSelectedTest, setLocalSelectedTest] = React.useState('');
  const effectiveSelectedTest = selectedTest ?? localSelectedTest;
  const effectiveSetSelectedTest = setSelectedTest ?? setLocalSelectedTest;

  const testList = Object.keys(testData || {});
  // If effectiveSelectedTest is not set, default to the latest test in testList
  const defaultTestKey = effectiveSelectedTest || (testList.length ? testList[testList.length - 1] : '');

  // Build currentTestData aligned to the provided subjectLabels using the detailed mapping.
  // Prefer the mapping row (which contains per-subject totals and breakdowns) for accurate totals.
  let currentTestData = [];
  try {
    const mapping = Array.isArray(subjectWiseDataMapping) ? subjectWiseDataMapping : [];
    const row = mapping.find(r => (r.Test || '') === defaultTestKey) || {};
    const details = buildSubjectDetailsFromRow(row, subjectLabels || []);
    // map subjectLabels to totals (use total if present, else sum breakdowns)
    currentTestData = (subjectLabels || []).map(label => {
      const d = details.find(x => x && (x.name === label || (x.name || '').toLowerCase() === (label || '').toLowerCase()));
      if (!d) return 0;
      const total = Number(d.total || 0);
      if (total && total > 0) return total;
      const c = Number(d.correct || 0);
      const i = Number(d.incorrect || 0);
      const u = Number(d.unattended ?? d.skipped ?? d.unattempted ?? 0);
      return c + i + u;
    });
  } catch (e) {
    currentTestData = testData[defaultTestKey] || [];
  }

  React.useEffect(() => {
    if (testList.length > 0 && !effectiveSelectedTest) {
      effectiveSetSelectedTest(testList[testList.length - 1]);
    }
  }, [testList, effectiveSelectedTest, effectiveSetSelectedTest]);

  // compute a suggested max for y so values drawn above bars have room
  const maxDataValue = currentTestData.length ? Math.max(...currentTestData.filter(v => typeof v === 'number')) : 0;
  // provide a little headroom (10% or minimum +5)
  const suggestedMaxY = Math.ceil((maxDataValue || 0) * 1.1 + 5);

  const chartData = { labels: subjectLabels, datasets: [{ label: 'Marks Obtained', data: currentTestData, backgroundColor: '#003cff', borderRadius: 8 }] };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#fff', titleColor: '#4A4A4A', bodyColor: '#4A4A4A', borderColor: '#01B7F0', borderWidth: 1 },
      // plugin to draw values above each bar
      datalabels: false
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6B7280', font: { size: 12 } } },
      // hide y axis visually but keep layout consistent
      y: { display: false, grid: { display: false }, ticks: { display: false }, suggestedMax: suggestedMaxY }
    },
    barPercentage: 0.35,
    categoryPercentage: 0.7,
    // make bars look good on small screens
    layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } }
  };

  return (
    <Card className="rounded-2xl border border-gray-250 bg-gray-100 flex flex-col items-start justify-start sm:p-0 p-2">
      <div className="w-full flex flex-col bg-white p-3 sm:p-6 rounded-2xl">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start mb-0.5 sm:mb-1">
          <div className="flex flex-col items-start justify-start gap-0">
            <h3 className="text-primary text-lg font-semibold">{title}</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-6">Breakdown of marks across subjects for the selected test</p>
          </div>

          {testList.length > 0 && (
            <>
              {/* Desktop/Tablet: select at the right (hidden on mobile) */}
              <div className="hidden sm:block w-full">
                <div className="flex justify-end">
                  <div className="w-fit">
                    <Select onValueChange={(val) => effectiveSetSelectedTest(val)} value={effectiveSelectedTest}>
                      <SelectTrigger className="btn btn-sm justify-between w-full max-w-full truncate text-start">
                        <SelectValue placeholder="Select Test" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start">
                        {testList.map(test => (
                          <SelectItem key={test} value={test}>{test}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Mobile: stacked label + select below the description (visible only on mobile) */}
              <div className="block sm:hidden w-full mb-2">
                <div className="w-full">
                  <Select onValueChange={(val) => effectiveSetSelectedTest(val)} value={effectiveSelectedTest}>
                    <SelectTrigger className="btn btn-sm justify-between w-full text-start">
                      <SelectValue placeholder="Select Test" />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="end">
                      {testList.map(test => (
                        <SelectItem key={test} value={test}>{test}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>


        <div className="w-full border border-bg-primary rounded-lg p-2 bg-white h-56 sm:h-80">
          {currentTestData.length ? (
            // use a small plugin to draw values above bars using beforeDatasetsDraw hook
            <Bar
              data={chartData}
              options={options}
              plugins={[{
                id: 'valueAboveBar',
                afterDatasetsDraw: (chart) => {
                  const ctx = chart.ctx;
                  chart.data.datasets.forEach((dataset, dsIndex) => {
                    const meta = chart.getDatasetMeta(dsIndex);
                    meta.data.forEach((bar, index) => {
                      const data = dataset.data[index];
                      if (data === null || data === undefined) return;
                      const x = bar.x;
                      const y = bar.y;
                      ctx.save();
                      // draw value in solid black and align baseline so it sits above the bar
                      ctx.fillStyle = '#000000';
                      ctx.font = '600 12px Tenorite, sans-serif';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'bottom';
                      // place value slightly above the top of the bar
                      const offset = Math.min(14, Math.max(8, (chart.height || 0) * 0.02));
                      ctx.fillText(String(data), x, y - offset);
                      ctx.restore();
                    });
                  });
                }
              }]}
            />
          ) : (
            <p className="text-gray-500">No subject-wise data available.</p>
          )}
        </div>
      </div>
    </Card>
  );
};

/** MobileInsightsSelect - small mobile-only component to choose and render insight lists */
const MobileInsightsSelect = ({ keyInsightsData = {} }) => {
  // Default to an option that exists after quickRecommendations was temporarily hidden
  const [selected, setSelected] = React.useState('keyStrengths');

  const sections = {
    quickRecommendations: keyInsightsData?.quickRecommendations || [],
    keyStrengths: keyInsightsData?.keyStrengths || [],
    areasForImprovement: keyInsightsData?.areasForImprovement || [],
    yetToDecide: keyInsightsData?.yetToDecide || []
  };

  const items = sections[selected] || [];

  return (
    <div>
      <Select onValueChange={(val) => setSelected(val)} value={selected}>
        <SelectTrigger className="btn btn-sm justify-between w-full text-start">
          <SelectValue placeholder="Select insights" />
        </SelectTrigger>
        <SelectContent side="bottom" align="end">
          {/* <SelectItem value="quickRecommendations">Quick Recommendations</SelectItem> */}
          <SelectItem value="keyStrengths">Key Strengths</SelectItem>
          <SelectItem value="areasForImprovement">Areas for Improvement</SelectItem>
          <SelectItem value="yetToDecide">Consistency Threats</SelectItem>
        </SelectContent>
      </Select>

      <div className="mt-3">
        {items.length ? (
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 bg-gray-100 p-3 rounded-lg">
            {items.map((it, i) => (
              <li key={`${selected}-${i}`}>{it}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No insights available</p>
        )}
      </div>
    </div>
  );
};
