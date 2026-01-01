import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentDashboardData } from '../../utils/api.js';
import { TrendingUp, HelpCircle, AlertTriangle, FileText, ChevronRight, SwatchBook, Target, ListChecks, Lightbulb } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import PageLoader from '../components/LoadingPage';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import FilterDrawer from '../../components/ui/filter-drawer.jsx';
import Stat from '../../components/stat-mobile.jsx';
import { Card } from '../../components/ui/card.jsx';
import ActionPlanCard from './components/ActionPlanCard.jsx';
import ChecklistCard from './components/ChecklistCard.jsx';
import { Button } from '../../components/ui/button.jsx';
import StudyTipsCard from './components/StudyTipsCard.jsx';
import Alert from '../../components/ui/alert.jsx';

// Register ChartJS components (safe to call even if imported elsewhere)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  const preferred = ['Physics', 'Chemistry', 'Botany', 'Zoology', 'Biology'];
  const rest = Array.from(set).filter(s => !preferred.includes(s)).sort();
  return [...preferred.filter(p => set.has(p)), ...rest];
};

// Backward-compatible fallback constant. New code prefers dynamic derivation via `getSubjectsFromMapping`.
const SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

function SDashboardMobile() {
  const navigate = useNavigate();
  // State to hold the student dashboard data and loading/error status
  const [dashboardData, setDashboardData] = useState({
    keyInsightsData: {},
    subjectWiseData: {},
    subjectWiseDataMapping: [],
    actionPlan: [],
    checklist: [],
    studyTips: [],
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

        // Handle potential errors from the API
        if (!data || data.error) {
          throw new Error(data?.error || 'Failed to fetch data');
        }

        // Keep raw mappings for charts that need details and transform subject-wise data
        const subjectWiseDataMapping = Array.isArray(data.subjectWiseDataMapping) ? data.subjectWiseDataMapping : [];

        // Derive subjects list early so we can build subject-wise arrays in the same order
        const subjectsListGlobal = getSubjectsFromMapping(subjectWiseDataMapping || []) || SUBJECTS;

        let subjectWiseData = {};
        subjectWiseDataMapping.forEach((row) => {
          const testName = row.Test || 'Unknown Test';
          // Build the per-test subject array following subjectsListGlobal ordering so indexes align
          subjectWiseData[testName] = (subjectsListGlobal || []).map(s => Number(row[s] || 0));
        });

        // Build per-test stats from subjectWiseDataMapping using scoring rules (+4 correct, -1 incorrect, 0 unattempted)
        const perTestStats = subjectWiseDataMapping.map((row) => {
          const testName = row.Test || 'Unknown Test';
          const details = buildSubjectDetailsFromRow(row, subjectsListGlobal || []);
          // consider a subject present only if it has any attempts (correct+incorrect+unattended > 0)
          const present = (details || []).filter(d => {
            const c = Number(d?.correct || 0);
            const i = Number(d?.incorrect || 0);
            const u = Number(d?.unattended || d?.skipped || d?.unattempted || 0);
            return (c + i + u) > 0;
          });
          // totalQuestions: prefer summed attempts (correct+incorrect+unattended) as question count;
          // fallback to explicit `total` when attempts are missing.
          const explicitTotal = present.reduce((s, d) => s + (Number(d.total || 0)), 0);
          const attemptsTotal = present.reduce((s, d) => s + (Number(d.correct || 0) + Number(d.incorrect || 0) + Number(d.unattended || d.skipped || d.unattempted || 0)), 0);
          const totalQuestions = attemptsTotal || explicitTotal || 0;
          const totalScore = present.reduce((s, d) => s + ((Number(d.correct || 0) * 4) + (Number(d.incorrect || 0) * -1)), 0);
          const rawPercentage = totalQuestions > 0 ? (totalScore / (totalQuestions * 4)) * 100 : 0;
          const percentage = Number.isFinite(rawPercentage) ? Math.max(0, Math.min(100, rawPercentage)) : 0;
          return { testName, totalScore, totalQuestions, percentage };
        });

        // numeric-aware ordering: ensure tests like Test10 come after Test9
        const extractTestNum = (s) => {
          const m = String(s || '').match(/(\d+)/);
          return m ? parseInt(m[1], 10) : NaN;
        };

        const sortedPerTestStats = [...perTestStats].sort((a, b) => {
          const na = extractTestNum(a.testName);
          const nb = extractTestNum(b.testName);
          if (!isNaN(na) && !isNaN(nb)) return na - nb; // numeric ascending
          if (!isNaN(na)) return 1;
          if (!isNaN(nb)) return -1;
          return String(a.testName || '').localeCompare(String(b.testName || ''));
        });

        // Compute Recent Test Percentage, averages and improvements from sortedPerTestStats
        const testKeys = sortedPerTestStats.map(p => p.testName);
        let lastTestImprovement = 0;
        let lastTestPercentage = 0;
        let averageMarkImprovement = 0;
        let averagePercentage = 0;

        if (sortedPerTestStats.length > 0) {
          const last = sortedPerTestStats[sortedPerTestStats.length - 1];
          lastTestPercentage = last.percentage || 0;
          if (sortedPerTestStats.length > 1) {
            const prev = sortedPerTestStats[sortedPerTestStats.length - 2];
            const prevPct = prev?.percentage || 0;
            lastTestImprovement = prevPct > 0 ? ((lastTestPercentage - prevPct) / prevPct) * 100 : (lastTestPercentage - prevPct);
          }

          const allPercentages = sortedPerTestStats.map(p => p.percentage || 0);
          averagePercentage = allPercentages.length ? allPercentages.reduce((s, n) => s + n, 0) / allPercentages.length : 0;

          if (sortedPerTestStats.length > 1) {
            const prevAvg = allPercentages.slice(0, -1).length ? allPercentages.slice(0, -1).reduce((s, n) => s + n, 0) / (allPercentages.length - 1) : 0;
            const newAvg = averagePercentage;
            averageMarkImprovement = prevAvg > 0 ? ((newAvg - prevAvg) / prevAvg) * 100 : (newAvg - prevAvg);
          } else {
            averageMarkImprovement = 0;
          }
        }

        // Debug: log perTestStats so we can inspect computed percentages in mobile
        console.debug('mobile perTestStats', sortedPerTestStats);

        // Update the dashboard data state with the fetched and transformed data
        setDashboardData({
          keyInsightsData: data.keyInsightsData || {},
          subjectWiseData,
          subjectWiseDataMapping,
          actionPlan: data.actionPlan || [],
          checklist: data.checklist || [],
          studyTips: data.studyTips || [],
          perTestStats: sortedPerTestStats,
          lastTestImprovement,
          lastTestPercentage,
          averagePercentage,
          averageMarkImprovement,
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
    averagePercentage,
    averageMarkImprovement,
    isLoading,
    error
  } = dashboardData;

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
      <div className="flex flex-col items-center justify-center h-96 p-4 bg-white rounded-lg shadow-md">
        <div className="max-w-md w-full">
          <Alert
            variant="destructive"
            icon={<AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden />}
            className="shadow-sm"
          >
            <div className="font-semibold text-sm">Error loading dashboard!</div>
            <div className="text-xs text-rose-800/80 break-words">{error}</div>
          </Alert>
        </div>
      </div>
    );
  }

  // Create summary cards directly from perTestStats (mapping-driven)
  const perTestStatsLocal = dashboardData.perTestStats || [];
  const summaryCards = [
    {
      title: 'Recent Test Percentage',
      // keep one decimal as a string so formatStatValue recognizes it as a percentage
      value: typeof lastTestPercentage === 'number' ? lastTestPercentage.toFixed(1) : 'N/A',
      icon: 'TrendingUp',
      id: 'last-test-performance',
      description: 'Percentage score from the most recent test'
    },
    {
      title: 'Average Percentage',
      // keep one decimal as a string so formatStatValue recognizes it as a percentage
      value: typeof averagePercentage === 'number' ? averagePercentage.toFixed(1) : 'N/A',
      icon: 'Target',
      id: 'average-mark',
      description: 'Average percentage across all tests'
    },
    {
      title: 'Tests Attended',
      value: perTestStatsLocal.length,
      icon: 'FileText',
      id: 'tests-attended',
      description: 'Total number of tests completed'
    }
  ];

  // derive subjects for charts (only from subjectWiseDataMapping)
  const derivedSubjects = getSubjectsFromMapping(dashboardData.subjectWiseDataMapping || []) || SUBJECTS;

  // Icon mapping for stat cards (icon node + container bg tint)
  const iconMap = {
    // use semantic colors and consistent sizing for clarity on mobile
    TrendingUp: { icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50 border border-emerald-100' },
    FileText: { icon: <FileText className="w-5 h-5 text-sky-600" />, bg: 'bg-sky-50 border border-sky-100' },
    Target: { icon: <Target className="w-5 h-5 text-violet-600" />, bg: 'bg-violet-50 border border-violet-100' },
    Default: { icon: <HelpCircle className="w-5 h-5 text-gray-400" />, bg: 'bg-gray-100' }
  };

  return (
    <>
      <div className="space-y-2 pt-4 bg-gradient-to-br from-slate-100 to-white">
        {/* Stats Container */}
        <div className="w-full px-3 py-2">
          {/* Mobile: horizontal slides stats */}
          <div className="w-full overflow-x-auto hide-scrollbar">
            <div className="flex gap-3 snap-x snap-mandatory items-center">
              {summaryCards.map((card, idx) => {
                const { icon: iconName = 'Default', title = 'Untitled Stat', value, id, description } = card;

                const badgeForThis = (() => {
                  if (title === 'Recent Test Percentage') {
                    const isPositive = lastTestImprovement > 0;
                    const isNegative = lastTestImprovement < 0;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ml-1 ${isPositive ? 'bg-green-50 text-green-700' : isNegative ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
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
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ml-1 ${isPositive ? 'bg-green-50 text-green-700' : isNegative ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
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
                  <div key={id || `stat-${idx}`} className="flex-shrink-0 snap-center p-1">
                    <Stat
                      icon={(iconMap[iconName] && iconMap[iconName].icon) || iconMap.Default.icon}
                      iconBgClass={(iconMap[iconName] && iconMap[iconName].bg) || iconMap.Default.bg}
                      label={title}
                      value={formatStatValue(value)}
                      info={description}
                      badge={badgeForThis}
                      className="p-2"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rest Container */}
        <div className="w-full space-y-5 bg-white rounded-t-2xl pt-4 pb-10">
          <div className="w-full text-center">
            <span className='text-xs italic text-gray-400'>InzightEd generates tips for you to ace your next exam</span>
          </div>
          {/* Mobile: Card with Select + list */}
          <div className="w-full px-3">
            <div className="flex items-center ">
              <div className="w-full">
                <MobileInsightsSelect keyInsightsData={keyInsightsData} />

              </div>
            </div>
          </div>

          {/* Action Plan Section - Mobile */}
          <div className="w-full px-3">
            <CollapsibleCard title="Action Plan" defaultOpen={false} icon={<SwatchBook className="w-5 h-5 text-emerald-600" />}>
              <ActionPlanCard actionPlan={dashboardData.actionPlan} />
            </CollapsibleCard>
          </div>

          {/* Problems Checklist Section - Mobile */}
          <div className="w-full px-3">
            <CollapsibleCard title="Problems Checklist" defaultOpen={false} icon={<ListChecks className="w-5 h-5 text-sky-600" />}>
              <ChecklistCard checklist={dashboardData.checklist} />
            </CollapsibleCard>
          </div>

          {/* Study Tips Section - Mobile */}
          <div className="w-full px-3">
            <CollapsibleCard title="Smarter Study Tips" defaultOpen={false} icon={<Lightbulb className="w-5 h-5 text-gray-600" />}>
              <StudyTipsCard studyTips={dashboardData.studyTips} />
            </CollapsibleCard>
          </div>
          <div className="w-full px-3">
            <button onClick={() => navigate('/student/swot')} className="w-full mt-6 px-4 py-3 bg-gradient-to-b from-gray-600 to-gray-800 text-white rounded-xl font-semibold flex items-center justify-between">
              <span>View AI Generated tips for all tests</span>
              <ChevronRight className="w-5 h-5 border border-gray-500 rounded-lg" />
            </button>
          </div>

          {/* Divider: thin dashed gray line */}
          <div className="w-full">
            <hr className="border-t border-dashed border-gray-200" />
          </div>

          {/* Performance Chart */}
          <div className="grid grid-cols-1 gap-6 px-3 pt-2">
            <div>
              <PerformanceTrendChart
                subjectWiseData={subjectWiseData}
                subjectWiseDataMapping={dashboardData.subjectWiseDataMapping}
              />
            </div>
          </div>

          {/* Performance deep-dive card */}
          <div className="flex justify-center w-full">
            <Card
              className="rounded-2xl p-3 mt-3 border border-green-100 bg-white cursor-pointer shadow-lg transition-shadow mx-3"
              onClick={() => navigate('/student/performance')}
              role="button"
              aria-label="View detailed performance by chapter and topic"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { navigate('/student/performance'); } }}
            >
              <div className="flex flex-row items-center gap-3 flex-wrap">
                {/* Left icon */}
                <div className="flex-shrink-0 bg-green-50 border border-green-100 rounded-lg p-2 mr-2">
                  <SwatchBook className="w-7 h-7 text-emerald-600" aria-hidden="true" />
                </div>

                {/* Content (retained original link text) */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-primary">Want to see how you perform across each chapter and topics?</div>
                </div>

                {/* CTA */}
                <div className="w-full sm:w-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/student/performance'); }}
                    className="w-full sm:w-auto mt-2 sm:mt-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 text-sm font-semibold"
                  >
                    Explore Now
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-600">
                      <path d="M5 12h14M13 5l7 7-7 7" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
}

// -------------------------- Helpers & Subcomponents --------------------------

/** CollapsibleCard: small reusable wrapper to make sections collapsible on mobile */
const CollapsibleCard = ({ title = '', children = null, defaultOpen = true, icon = null }) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  // measure content height whenever children change or on mount
  useLayoutEffect(() => {
    if (contentRef.current) {
      // use scrollHeight to capture full content height
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

  // update measured height when opening (handles dynamic content)
  useEffect(() => {
    if (open && contentRef.current) setContentHeight(contentRef.current.scrollHeight);
  }, [open]);

  return (
    <div className="bg-white shadow-sm overflow-hidden border border-gray-100 rounded-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
        aria-expanded={open}
        aria-controls={`collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center">
          {icon ? (
            <div className="flex-shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-md bg-gray-50">
              {icon}
            </div>
          ) : null}
          <div className="text-base font-semibold text-gray-800">{title}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-gray-600 transform transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        id={`collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`}
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{ maxHeight: open ? `${contentHeight}px` : '0px', opacity: open ? 1 : 0 }}
        aria-hidden={!open}
      >
        <div className="p-3">
          {children}
        </div>
      </div>
    </div>
  );
};

/** DonutChart component: shows correct/incorrect/unattended counts for a selected test and subject */
/**
 * Normalize a mapping row into an array of subjectDetails with
 * shape: { name, correct, incorrect, unattended, total }
 * Supports multiple input shapes: subjectDetails array, flattened fields (Botany__correct),
 * or simple per-subject totals.
 */
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

  // Detect legacy / flattened shape using provided subjects
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

  // derive subjects list and normalize using it
  const subjectsList = getSubjectsFromMapping(subjectWiseDataMapping);

  // find details for selectedTest (if not provided, pick last test)
  const testKey = selectedTest || (tests.length ? tests[tests.length - 1] : undefined);
  const testRow = subjectWiseDataMapping.find(r => (r.Test || '') === testKey) || {};

  // Build normalized subjectDetails from whatever shape the API returned
  const subjectDetails = buildSubjectDetailsFromRow(testRow, subjectsList);

  // Selected subject row. Support 'Overall' which aggregates across all subjectDetails
  const selectedSubName = selectedSubject || (subjectDetails[0] && subjectDetails[0].name) || (subjectsList[0] || 'Botany');

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
      <div className="h-48 w-48">
        {hasData ? <Doughnut data={data} options={options} plugins={[centerTextPlugin]} /> : <p className="text-xs text-gray-500 text-center">No question breakdown</p>}
      </div>
    </div>
  );
};

/**
 * Format a stat value for display in stat cards.
 * - Returns 'N/A' for null/undefined/empty
 * - Preserves percentage signs and formats numeric values to 1 decimal for floats
 */
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
  const [localSelectedSubject, setLocalSelectedSubject] = useState('Overall');
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

  // Drawer state for mobile filter UI
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create performanceData using mapping rows when available (robust to dynamic subject lists)
  const performanceData = {};
  subjectNames.forEach((subject) => {
    if (Array.isArray(subjectWiseDataMapping) && subjectWiseDataMapping.length) {
      performanceData[subject] = subjectWiseDataMapping.map(row => {
        if (typeof row[subject] !== 'undefined' && row[subject] !== null) return Number(row[subject]) || 0;
        const c = Number(row[`${subject}__correct`] || 0);
        const i = Number(row[`${subject}__incorrect`] || 0);
        const u = Number(row[`${subject}__unattempted`] || row[`${subject}__skipped`] || 0);
        const total = Number(row[subject] || 0);
        return total || (c + i + u);
      });
    } else {
      performanceData[subject] = testKeys.map(test => {
        const arr = subjectWiseData[test] || [];
        const idx = subjectNames.indexOf(subject);
        const val = typeof arr[idx] !== 'undefined' ? arr[idx] : 0;
        return typeof val === 'number' ? val : Number(val || 0);
      });
    }
  });

  const subjectKeys = Object.keys(performanceData || {});
  // Force a consistent display order for the Performance chart regardless of
  // how subject keys are ordered in the underlying data. Only include
  // subjects that actually have non-zero data across the mapping.
  const desiredOrder = ['Overall', 'Physics', 'Chemistry', 'Botany', 'Zoology'];

  // Normalize performance arrays first so we can inspect numeric values.
  const normalizedPerfs = Object.fromEntries(Object.entries(performanceData || {}).map(([k, v]) => [k, normalize(v)]));

  // Determine which subject series contain any non-zero numeric value.
  const availableSubjects = subjectKeys.filter((k) => {
    const arr = normalizedPerfs[k] || [];
    return arr.some(item => {
      if (item === null || item === undefined) return false;
      if (typeof item === 'number') return item !== 0;
      if (typeof item === 'object') {
        if (typeof item.value === 'number') return item.value !== 0;
        const numeric = Object.values(item).find(v => typeof v === 'number');
        return typeof numeric === 'number' ? numeric !== 0 : false;
      }
      return false;
    });
  });

  // Build the subjects list dynamically from mapping-derived subjectNames.
  // Keep 'Overall' first, then include subjects in the canonical order returned by getSubjectsFromMapping
  // but only those that actually have data (availableSubjects).
  const subjects = ['Overall', ...subjectNames.filter(s => availableSubjects.includes(s))];

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
    // ordering used when building subjectWiseData (Botany, Chemistry, ...).
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
        label: effectiveSelectedSubject === 'Overall' ? 'Overall Average Marks' : effectiveSelectedSubject + ' Marks',
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
        borderWidth: 1,
        pointBackgroundColor: '#fff',
        // Smaller points for a cleaner look on mobile
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.45
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
        // Keep tooltip white on dark chart; tighten spacing and fonts for compactness
        backgroundColor: '#ffffffff',
        titleColor: '#374151',
        bodyColor: '#374151',
        borderColor: '#d1d5db',
        borderWidth: 1,
        padding: 6,
        cornerRadius: 6,
        displayColors: false,
        titleFont: { family: 'Tenorite, sans-serif', size: 12 },
        bodyFont: { family: 'Tenorite, sans-serif', size: 11 },
        mode: 'index',
        intersect: false,
        callbacks: {
          // keep the title (test name) but show a compact single-line label with just the numeric value
          title: (items) => items && items[0] ? items[0].label : undefined,
          label: (context) => {
            // prefer parsed y value (Chart v3/v4); fallback to raw
            const parsed = context.parsed && (typeof context.parsed.y !== 'undefined' ? context.parsed.y : context.parsed);
            const value = (typeof parsed !== 'undefined') ? parsed : context.raw;
            // Return only the value (no dataset label) for compactness
            return typeof value === 'number' ? String(value) : value;
          }
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
        ticks: { color: '#ffffff', font: { family: 'Tenorite, sans-serif', size: 9 }, maxTicksLimit: 10, autoSkip: true, maxRotation: 45, minRotation: 0 },
        // Disable grid lines and the axis border explicitly so no x-axis line is drawn on mobile
        grid: { display: false, drawBorder: false, drawOnChartArea: false }
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
        ticks: { display: false, color: '#6b7280', font: { family: 'Tenorite, sans-serif', size: 9 }, stepSize: 100 },
        // Hide horizontal grid lines for a cleaner dark background
        grid: { display: false, drawBorder: false }
      }
    },
    layout: { padding: { top: 16, bottom: 8, left: 8, right: 8 } },
    elements: { line: { borderJoinStyle: 'round' }, point: { pointStyle: 'circle' } }
  };

  // subjects already defined above

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <span className="text-lg font-bold text-primary">{title}</span>

        {/* Mobile: open FilterDrawer instead of dropdown */}
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open filters"
        >
          <span className="text-sm">{effectiveSelectedSubject}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
            <path d="M6 9l6 6 6-6" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Mobile Filter Drawer - uses panels API to control selection */}
      <FilterDrawer
        open={drawerOpen}
        onOpenChange={(v) => setDrawerOpen(v)}
        title="Subject"
        panels={[{
          key: 'subject',
          label: 'Subject',
          options: subjects.map(s => ({ value: s, label: s })),
          selected: effectiveSelectedSubject,
          onSelect: (val) => { effectiveSetSelectedSubject(val); setDrawerOpen(false); }
        }]}
        initialActivePanel="subject"
      />

      {/* Area Chart Container */}
      <div className="flex flex-col items-center justify-center w-full shadow-lg h-56 rounded-xl" style={{ background: 'linear-gradient(to bottom, #374151, #1f2937)' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

/** MobileInsightsSelect - small mobile-only component to choose and render insight lists */
const MobileInsightsSelect = ({ keyInsightsData = {} }) => {
  // Default to an option that exists after quickRecommendations was temporarily hidden
  const [selected, setSelected] = useState('yetToDecide');

  const sections = {
    quickRecommendations: keyInsightsData?.quickRecommendations || [],
    keyStrengths: keyInsightsData?.keyStrengths || [],
    yetToDecide: keyInsightsData?.yetToDecide || []
  };

  const items = sections[selected] || [];

  const tabs = [
    { key: 'yetToDecide', label: 'Focus Zone' },
    { key: 'keyStrengths', label: 'Steady Zone' }
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Modern Tabs */}
      <div className="flex space-x-3 mb-2">
        {tabs.map((tab) => {
          const isActive = selected === tab.key;
          let activeClasses = '';
          if (isActive) {
            if (tab.key === 'keyStrengths') {
              activeClasses = 'bg-green-100 text-green-900 shadow-sm shadow-green-200/50 border border-green-300';
            } else if (tab.key === 'yetToDecide') {
              activeClasses = 'bg-orange-100 text-orange-900 shadow-sm shadow-orange-200/60 border border-orange-300';
            }
          }
          return (
            <button
              key={tab.key}
              onClick={() => setSelected(tab.key)}
              className={`flex-1 py-2 px-2 text-sm font-semibold rounded-xl transition-all duration-300 ease-out transform scale-[1.02] ${isActive
                ? activeClasses
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 active:scale-95'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="mt-3">
        {items.length ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-100/80">
              {items.map((it, i) => (
                <li
                  key={`${selected}-${i}`}
                  className="py-1 px-4 text-gray-700 hover:bg-gray-50/50 transition-colors duration-200 group"
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-primary rounded-full mt-2 transform transition-transform duration-300" />
                    <span className="text-sm leading-relaxed transition-colors">
                      {it}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-8 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200/70">
            <div className="w-10 h-10 mx-auto mb-3 bg-gray-100/70 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No insights available</p>
            <p className="text-gray-400 text-xs mt-1">Check back later for updates</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SDashboardMobile;
