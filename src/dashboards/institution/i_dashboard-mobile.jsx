import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Filler } from 'chart.js';
import { getInstitutionEducatorDashboardData, fetchInstitutionEducatorAllStudentResults } from '../../utils/api';
import { Users, Calendar, HelpCircle, Sparkles, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu.jsx';
import Stat from '../components/ui/stat-mobile';
import { Card } from '../../components/ui/card.jsx';
import { Tooltip as UITooltip, TooltipTrigger as UITooltipTrigger, TooltipContent as UITooltipContent, TooltipProvider as UITooltipProvider } from '../../components/ui/tooltip.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { useInstitution } from './index.jsx';
import FilterDrawer from '../../components/ui/filter-drawer.jsx';

// Register Chart.js components and set global font family
Chart.register(LineElement, PointElement, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Filler);
Chart.defaults.font.family = 'Tenorite, sans-serif';

const ICON_MAPPING = {
  Users: <Users aria-hidden="true" className="text-gray-800" />,
  Calendar: <Calendar aria-hidden="true" className="text-gray-800" />,
  Default: <HelpCircle aria-hidden="true" className="text-gray-800" />
};
const formatStatValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'N/A';
  }
  const valueStr = String(value);
  const isPercentage = valueStr.includes('%');
  const numericString = valueStr.replace(/[^0-9.-]+/g, "");
  const rawValue = parseFloat(numericString);
  if (!isNaN(rawValue)) {
    const formattedValue = isPercentage ? rawValue.toFixed(1) : (Number.isInteger(rawValue) ? rawValue : rawValue.toFixed(1));
    return isPercentage ? `${formattedValue}%` : formattedValue;
  }
  return valueStr;
};

function IDashboard() {
  const { selectedEducatorId } = useInstitution();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({ summaryCardsData: [], keyInsightsData: {}, isLoading: false, error: null });
  const [testWiseAvgMarks, setTestWiseAvgMarks] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('Overall');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rawResults, setRawResults] = useState([]);
  const [overallPerformance, setOverallPerformance] = useState('N/A');
  const [improvementRate, setImprovementRate] = useState('N/A');
  const [mobileInsightIdx, setMobileInsightIdx] = useState(0);
  const mobileInsightSections = [
    { key: 'quickRecommendations', title: 'Quick Recommendations' },
    { key: 'keyStrengths', title: 'Key Strengths' },
    { key: 'yetToDecide', title: 'Consistency Vulnerability' },
  ];

  useEffect(() => {
    if (!selectedEducatorId) return;
    const fetchData = async () => {
      setDashboardData(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await getInstitutionEducatorDashboardData(selectedEducatorId);
        if (!data || data.error) {
          setDashboardData({ summaryCardsData: [], keyInsightsData: {}, isLoading: false, error: data?.error || 'Failed to load dashboard' });
          return;
        }
        setDashboardData({ summaryCardsData: data.summaryCardsData || [], keyInsightsData: data.keyInsightsData || {}, isLoading: false, error: null });
      } catch (err) {
        setDashboardData({ summaryCardsData: [], keyInsightsData: {}, isLoading: false, error: err.message || 'Failed to load dashboard' });
      }
    };
    fetchData();
  }, [selectedEducatorId]);

  useEffect(() => {
    if (!selectedEducatorId) return;
    const fetchTestWiseAvg = async () => {
      try {
        // Try to reuse dashboard API if it contains test-wise averages, otherwise ignore
        const resp = await getInstitutionEducatorDashboardData(selectedEducatorId);
        if (resp && resp.testWiseAvgMarks) {
          setTestWiseAvgMarks(resp.testWiseAvgMarks);
        } else if (resp && resp.testWiseAvg) {
          setTestWiseAvgMarks(resp.testWiseAvg);
        }
      } catch (err) {
        // noop - leave testWiseAvgMarks empty
      }
    };
    fetchTestWiseAvg();
  }, [selectedEducatorId]);

  useEffect(() => {
    if (!selectedEducatorId) return;
    const fetchResults = async () => {
      try {
        const results = await fetchInstitutionEducatorAllStudentResults(selectedEducatorId);
        if (results && Array.isArray(results.results)) {
          setRawResults(results.results);
        } else if (Array.isArray(results)) {
          setRawResults(results);
        }
      } catch (err) {
        // leave rawResults empty on error
      }
    };
    fetchResults();
  }, [selectedEducatorId]);

  // Compute test-wise averages from rawResults so charts can consume consistent series
  useEffect(() => {
    if (!rawResults || rawResults.length === 0) return;
    try {
      const hasField = (field) => rawResults.some(r => Object.prototype.hasOwnProperty.call(r, field));
      const subjectKeys = { Overall: 'total_score' };
      if (hasField('phy_score') || hasField('phy_total')) subjectKeys['Physics'] = 'phy_score';
      if (hasField('chem_score') || hasField('chem_total')) subjectKeys['Chemistry'] = 'chem_score';

      const hasBioData = rawResults.some(r => (Number(r.bio_score) || 0) > 0 || (Number(r.bio_total) || 0) > 0);
      const hasBotZooData = rawResults.some(r => (Number(r.bot_score) || 0) > 0 || (Number(r.bot_total) || 0) > 0 || (Number(r.zoo_score) || 0) > 0 || (Number(r.zoo_total) || 0) > 0);

      if (hasBioData || hasBotZooData) {
        subjectKeys['Biology'] = 'unified_bio';
      }

      if (hasField('bot_score') || hasField('bot_total')) subjectKeys['Botany'] = 'bot_score';
      if (hasField('zoo_score') || hasField('zoo_total')) subjectKeys['Zoology'] = 'zoo_score';

      const avgData = {};
      Object.keys(subjectKeys).forEach(subject => {
        const key = subjectKeys[subject];
        const testMap = {};
        rawResults.forEach(r => {
          const testNum = r.test_num;
          let score;
          if (key === 'unified_bio') {
            score = (Number(r.bio_score) || 0) + (Number(r.bot_score) || 0) + (Number(r.zoo_score) || 0);
          } else if (key === 'computed_bio') {
            score = (Number(r.bot_score) || 0) + (Number(r.zoo_score) || 0);
          } else {
            score = Number(r[key]) || 0;
          }
          if (!testMap[testNum]) testMap[testNum] = { total: 0, count: 0, max: score, min: score };
          testMap[testNum].total += score;
          testMap[testNum].count += 1;
          if (score > testMap[testNum].max) testMap[testNum].max = score;
          if (score < testMap[testNum].min) testMap[testNum].min = score;
        });
        avgData[subject] = Object.entries(testMap)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([testNum, { total, count, max, min }]) => ({
            test: `Test ${testNum}`,
            testNum: Number(testNum),
            avg: count ? Math.round(total / count) : 0,
            max,
            min,
          }));
      });
      setTestWiseAvgMarks(avgData);
    } catch (err) {
      // leave testWiseAvgMarks as-is on error
    }
  }, [rawResults]);

  useEffect(() => {
    if (rawResults.length > 0) {
      const testNums = [...new Set(rawResults.map(r => r.test_num))].sort((a, b) => a - b);
      const maxTestNum = Math.max(...rawResults.map(r => r.test_num));
      const lastTestResults = rawResults.filter(r => r.test_num === maxTestNum);

      // Compute average percentage for a set of rows similar to desktop `i_dashboard.jsx`.
      const computeAvgPercentFromRows = (rows) => {
        const vals = rows.map(r => {
          // If API already provides percent, use it
          if (r.total_percent !== undefined && r.total_percent !== null) return parseFloat(String(r.total_percent).replace('%', ''));

          // Prefer an explicit total_score if present
          const score = Number(r.total_score) ||
            ((Number(r.phy_score) || 0) + (Number(r.chem_score) || 0) + (Number(r.bot_score) || 0) + (Number(r.zoo_score) || 0) + (Number(r.bio_score) || 0));
          if (!isNaN(score) && score > 0) {
            // total full marks assumed to be 720 (same as desktop dashboard)
            return (score / 720) * 100;
          }

          // Fallback: if total and total_max exist, compute percent
          if (r.total !== undefined && r.total_max !== undefined) return (Number(r.total) / Number(r.total_max)) * 100;

          return null;
        }).filter(v => v !== null && !isNaN(v));

        if (vals.length === 0) return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      };

      if (lastTestResults.length > 0) {
        const avgLatestPercent = computeAvgPercentFromRows(lastTestResults);
        if (avgLatestPercent !== null) setOverallPerformance(`${Math.round(avgLatestPercent)}%`);
        else setOverallPerformance('N/A');
      } else {
        setOverallPerformance('N/A');
      }

      if (testNums.length >= 2) {
        const last = Math.max(...testNums);
        const prev = testNums[testNums.length - 2];
        const lastResults = rawResults.filter(r => r.test_num === last);
        const prevResults = rawResults.filter(r => r.test_num === prev);

        if (lastResults.length > 0 && prevResults.length > 0) {
          const calculateTestAveragePercentage = (testResults) => {
            const total = testResults.reduce((sum, r) => {
              const score = Number(r.total_score) ||
                ((Number(r.phy_score) || 0) + (Number(r.chem_score) || 0) + (Number(r.bot_score) || 0) + (Number(r.zoo_score) || 0) + (Number(r.bio_score) || 0));
              return sum + score;
            }, 0);
            const average = total / testResults.length;
            return (average / 720) * 100;
          };

          const lastAvgPercent = calculateTestAveragePercentage(lastResults);
          const prevAvgPercent = calculateTestAveragePercentage(prevResults);
          const diff = lastAvgPercent - prevAvgPercent;
          const absolutePoints = Math.round(diff);
          setImprovementRate(`${absolutePoints}%`);
        } else {
          setImprovementRate('N/A');
        }
      } else {
        setImprovementRate('N/A');
      }
    } else {
      setOverallPerformance('N/A');
      setImprovementRate('N/A');
    }
  }, [rawResults]);

  const { summaryCardsData, keyInsightsData, isLoading, error } = dashboardData;

  const attendanceData = useMemo(() => {
    let percentage = 'N/A';
    let change = null;
    let direction = null;
    if (rawResults.length > 0) {
      const testAttendance = {};
      rawResults.forEach(r => {
        const tn = r.test_num;
        if (!testAttendance[tn]) testAttendance[tn] = new Set();
        if (r.student_id !== undefined) testAttendance[tn].add(r.student_id);
        else if (r.id !== undefined) testAttendance[tn].add(r.id);
      });

      const testNums = Object.keys(testAttendance).map(Number).sort((a, b) => a - b);
      if (testNums.length > 1) {
        const last = testNums[testNums.length - 1];
        const prev = testNums[testNums.length - 2];
        const lastCount = testAttendance[last].size;
        const prevCount = testAttendance[prev].size;
        const allUnique = new Set(rawResults.map(r => r.student_id || r.id)).size || Math.max(lastCount, prevCount);
        percentage = Math.round((lastCount / allUnique) * 100);
        change = lastCount - prevCount;
        direction = change === 0 ? 'same' : (change > 0 ? 'up' : 'down');
      } else {
        const last = testNums[testNums.length - 1];
        const lastCount = testAttendance[last].size;
        const allUnique = new Set(rawResults.map(r => r.student_id || r.id)).size || lastCount;
        percentage = Math.round((lastCount / allUnique) * 100);
        change = null; direction = null;
      }
    }
    return { percentage, change, direction };
  }, [rawResults]);

  if (!selectedEducatorId) return <div className="text-center py-8 mt-20">Please select an educator to view their dashboard.</div>;
  if (isLoading) return (
    <div className="relative min-h-screen">
      <LoadingPage fixed={false} className="bg-white/80 dark:bg-gray-900/80 z-10" />
    </div>
  );
  if (error) return <div className="text-center py-8 text-error mt-20">{error}</div>;

  return (
    <UITooltipProvider>
      <div className="space-y-2 pt-4 bg-gradient-to-br from-slate-100 to-white">
        {/* Stats Container (mobile-friendly horizontal stat cards) */}
        <div className="w-full px-3 py-2">
          {(() => {
            const testsAttended = new Set(rawResults.map(r => r.test_num)).size;
            const summaryCards = [
              {
                id: 'recent-test-performance',
                title: 'Recent Test Percentage',
                value: overallPerformance,
                icon: ICON_MAPPING.Users,
                iconBgClass: 'bg-emerald-50 border border-emerald-100',
                description: 'Average total score in the latest test',
              },
              {
                id: 'attendance',
                title: 'Attendance',
                value: `${attendanceData.percentage}%`,
                icon: ICON_MAPPING.Calendar,
                iconBgClass: 'bg-sky-50 border border-sky-100',
                description: 'Percentage of students who attended the latest test',
              },
              {
                id: 'tests-attended',
                title: 'Tests Recorded',
                value: testsAttended,
                icon: ICON_MAPPING.Default,
                iconBgClass: 'bg-violet-50 border border-violet-100',
                description: 'Total number of tests recorded',
              }
            ];

            return (
              <div className="w-full overflow-x-auto hide-scrollbar">
                <div className="flex gap-3 snap-x snap-mandatory items-center">
                  {summaryCards.map((card) => {
                    const { id, title, value, icon, iconBgClass, description } = card;
                    const badgeForRecent = (() => {
                      if (id !== 'recent-test-performance') return null;
                      let rate = 0;
                      if (improvementRate !== undefined && improvementRate !== null && improvementRate !== 'N/A') {
                        const parsed = parseFloat(String(improvementRate).replace('%', ''));
                        if (!isNaN(parsed)) rate = parsed;
                      }
                      const isNegative = rate < 0;
                      return (
                        <UITooltip>
                          <UITooltipTrigger asChild>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ml-1 ${isNegative ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                              {isNegative ? (
                                <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              ) : (
                                <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              )}
                              <span className="whitespace-nowrap">{formatStatValue(improvementRate)}</span>
                            </span>
                          </UITooltipTrigger>
                          <UITooltipContent sideOffset={6}>
                            {isNegative ? 'Drop compared to previous test (rounded %).' : 'Improvement compared to previous test (rounded %).'}
                          </UITooltipContent>
                        </UITooltip>
                      );
                    })();

                    const badgeForAttendance = (() => {
                      if (id !== 'attendance') return null;
                      if (attendanceData.direction && attendanceData.direction !== 'same') {
                        return (
                          <UITooltip>
                            <UITooltipTrigger asChild>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ml-1 text-xs ${attendanceData.direction === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {attendanceData.direction === 'up' ? (
                                  <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ) : (
                                  <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                )}
                                {attendanceData.change > 0 ? `+${attendanceData.change}` : attendanceData.change}
                                {attendanceData.change === 1 || attendanceData.change === -1 ? ' student' : ' students'}
                              </span>
                            </UITooltipTrigger>
                            <UITooltipContent sideOffset={6}>{attendanceData.direction === 'up' ? 'Attendance increased compared to the previous test.' : 'Attendance decreased compared to the previous test.'}</UITooltipContent>
                          </UITooltip>
                        );
                      }
                      if (attendanceData.direction === 'same') {
                        return (
                          <UITooltip>
                            <UITooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold ml-1 text-xs">No change</span>
                            </UITooltipTrigger>
                            <UITooltipContent sideOffset={6}>No change in student attendance between the last two tests.</UITooltipContent>
                          </UITooltip>
                        );
                      }
                      return null;
                    })();

                    return (
                      <div key={id} className="flex-shrink-0 snap-center p-1">
                        <Stat
                          icon={icon}
                          iconBgClass={iconBgClass}
                          label={title}
                          info={description}
                          value={formatStatValue(value)}
                          badge={badgeForRecent || badgeForAttendance || null}
                          className="p-2"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Rest Container */}
        <div className="w-full space-y-6 bg-white rounded-t-2xl pt-4 pb-10">
          <div className="w-full text-center">
            <span className='text-xs italic text-gray-400'>InzightEd generates insights for your selected educator's class</span>
          </div>

          {/* Insights Dropdown (mobile) */}
          <div className="w-full px-3 pb-2">
            <Card className="bg-white rounded-2xl px-3 py-3 border border-gray-200">
              <DropdownMenu>
                <div className="mb-3">
                  <div className="flex items-center justify-between w-full gap-2">
                    <DropdownMenuTrigger asChild>
                      <button className="flex-1 text-left bg-gray-50 border border-gray-200 text-md font-semibold text-gray-800 px-2 py-1.5 rounded-lg flex items-center min-h-0 h-9">
                        <span className="flex-1 text-left">{mobileInsightSections[mobileInsightIdx]?.title || 'Insights'}</span>
                        <ChevronDown className="w-3.5 h-3.5 ml-2 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                  </div>
                </div>

                <DropdownMenuContent sideOffset={6} align="start" className="w-64 mt-1">
                  {mobileInsightSections.map((section, idx) => (
                    <DropdownMenuItem
                      key={section.key}
                      className={"w-full text-left px-1.5 py-1 rounded text-sm " + (mobileInsightIdx === idx ? 'bg-blue-100 text-blue-700 font-semibold' : '')}
                      onSelect={() => setMobileInsightIdx(idx)}
                    >
                      {section.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>

                <div className="flex flex-col gap-2 px-0.5 pb-0.5">
                  {(() => {
                    const sections = [
                      { items: keyInsightsData.quickRecommendations || [] },
                      { items: keyInsightsData.keyStrengths || [] },
                      { items: keyInsightsData.yetToDecide || [] },
                    ];
                    const active = sections[mobileInsightIdx] || { items: [] };
                    if (active.items && active.items.length > 0) {
                      return active.items.map((item, i) => (
                        <div key={i} className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">{item}</div>
                      ));
                    }
                    return <div className="text-sm text-gray-400 italic">No Insights Available</div>;
                  })()}
                </div>
              </DropdownMenu>
            </Card>
          </div>

          <div className="w-full">
            <hr className="border-t border-dashed border-gray-200" />
          </div>

          {/* Class Performance Chart (mobile) */}
          <div className="grid grid-cols-1 gap-6 px-3 pt-2">
            <div>
              <div className="w-full flex flex-col bg-white rounded-2xl">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <span className="text-xl font-bold text-primary">Class Performance</span>
                  <button
                    className="btn btn-sm bg-gray-200 inline-flex items-center gap-2 rounded-xl"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open filters"
                  >
                    <span className="text-sm">{selectedSubject}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
                      <path d="M6 9l6 6 6-6" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <FilterDrawer
                  open={drawerOpen}
                  onOpenChange={(v) => setDrawerOpen(v)}
                  title="Subject"
                  panels={[{
                    key: 'subject',
                    label: 'Subject',
                    options: Object.keys(testWiseAvgMarks || {}).length === 0 ? ['Overall', 'Physics', 'Chemistry', 'Biology'].map(s => ({ value: s, label: s })) : Object.keys(testWiseAvgMarks).map(s => ({ value: s, label: s })),
                    selected: selectedSubject,
                    onSelect: (val) => setSelectedSubject(val),
                  }]}
                  initialActivePanel="subject"
                />

                <div className="flex flex-col items-center justify-center w-full shadow-lg h-56 rounded-xl" style={{ background: 'linear-gradient(to bottom, #374151, #1f2937)' }}>
                  {(() => {
                    const currentData = testWiseAvgMarks[selectedSubject] || [];
                    const dataValues = currentData.map(d => d.avg);
                    const maxValue = dataValues.length > 0 ? Math.max(...dataValues) : 50;
                    const minValue = dataValues.length > 0 ? Math.min(...dataValues) : 0;
                    const range = maxValue - minValue;
                    const suggestedMax = Math.ceil((maxValue + range * 0.1) / 10) * 10;

                    return (
                      <Line
                        data={{
                          labels: currentData.map(d => d.test),
                          datasets: [
                            {
                              label: "Average Marks",
                              data: dataValues,
                              fill: true,
                              backgroundColor: (context) => {
                                const chart = context.chart;
                                const { ctx, chartArea } = chart;
                                if (!chartArea) return 'rgba(37,99,235,0.1)';
                                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                                gradient.addColorStop(0, "rgba(37,99,235,0.35)");
                                gradient.addColorStop(1, "rgba(37,99,235,0.05)");
                                return gradient;
                              },
                              borderColor: "#2563eb",
                              borderWidth: 1,
                              pointBackgroundColor: "#fff",
                              pointRadius: 3,
                              pointHoverRadius: 5,
                              pointBorderWidth: 1,
                              pointBorderColor: "#2563eb",
                              tension: 0.45,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            // Use an external HTML tooltip so it can be placed above the chart canvas and not be clipped
                            tooltip: {
                              enabled: false,
                              mode: 'index',
                              intersect: false,
                              external: function (context) {
                                const tooltipId = 'inzighted-mobile-chart-tooltip';
                                let tooltipEl = document.getElementById(tooltipId);
                                const { chart, tooltip } = context;
                                if (!tooltipEl) {
                                  tooltipEl = document.createElement('div');
                                  tooltipEl.id = tooltipId;
                                  document.body.appendChild(tooltipEl);
                                  tooltipEl.style.position = 'absolute';
                                  tooltipEl.style.pointerEvents = 'none';
                                  tooltipEl.style.zIndex = 9999;
                                  tooltipEl.style.background = '#ffffff';
                                  tooltipEl.style.border = '1px solid #d1d5db';
                                  tooltipEl.style.color = '#374151';
                                  tooltipEl.style.padding = '8px';
                                  tooltipEl.style.borderRadius = '6px';
                                  tooltipEl.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                                  tooltipEl.style.fontFamily = 'Tenorite, sans-serif';
                                  tooltipEl.style.fontSize = '12px';
                                  tooltipEl.style.whiteSpace = 'normal';
                                  tooltipEl.style.wordWrap = 'break-word';
                                  tooltipEl.style.overflowWrap = 'break-word';
                                  tooltipEl.style.wordBreak = 'break-word';
                                  tooltipEl.style.boxSizing = 'border-box';
                                  tooltipEl.style.width = 'auto';
                                  tooltipEl.style.maxWidth = Math.min(window.innerWidth - 32, 420) + 'px';
                                }

                                if (tooltip.opacity === 0) {
                                  tooltipEl.style.display = 'none';
                                  return;
                                }

                                const titleLines = tooltip.title || [];
                                const bodyLines = [];
                                tooltip.body.forEach(b => { if (b.lines) bodyLines.push(...b.lines); });

                                // Special handling for Botany/Zoology similar to desktop
                                if (selectedSubject === 'Botany' || selectedSubject === 'Zoology') {
                                  const dataIndex = tooltip.dataPoints && tooltip.dataPoints[0] && tooltip.dataPoints[0].dataIndex;
                                  const dataPoint = currentData && currentData[dataIndex];
                                  if (dataPoint && dataPoint.avg === 0 && testWiseAvgMarks['Biology'] && testWiseAvgMarks['Biology'].length > 0) {
                                    tooltipEl.style.width = 'auto';
                                    tooltipEl.style.maxWidth = Math.min(window.innerWidth - 32, 420) + 'px';
                                    tooltipEl.innerText = 'The question paper must have uploaded as Biology instead of Botany and Zoology, please check on Biology';
                                  } else {
                                    tooltipEl.style.width = 'auto';
                                    tooltipEl.style.maxWidth = Math.min(window.innerWidth - 32, 420) + 'px';
                                    tooltipEl.innerHTML = '';
                                    titleLines.forEach(t => { const el = document.createElement('div'); el.style.fontWeight = '600'; el.style.marginBottom = '6px'; el.innerText = t; tooltipEl.appendChild(el); });
                                    bodyLines.forEach(line => { const el = document.createElement('div'); el.innerText = line; tooltipEl.appendChild(el); });
                                  }
                                } else {
                                  tooltipEl.innerHTML = '';
                                  titleLines.forEach(t => { const el = document.createElement('div'); el.style.fontWeight = '600'; el.style.marginBottom = '6px'; el.innerText = t; tooltipEl.appendChild(el); });
                                  bodyLines.forEach(line => { const el = document.createElement('div'); el.innerText = line; tooltipEl.appendChild(el); });
                                }

                                const canvasRect = chart.canvas.getBoundingClientRect();
                                const caretX = canvasRect.left + window.pageXOffset + tooltip.caretX;
                                const caretY = canvasRect.top + window.pageYOffset + tooltip.caretY;
                                tooltipEl.style.display = 'block';
                                const offsetX = -tooltipEl.offsetWidth / 2;
                                const offsetY = -tooltipEl.offsetHeight - 12;
                                const desiredLeft = caretX + offsetX;
                                const minLeft = window.pageXOffset + 8;
                                const maxLeft = window.pageXOffset + window.innerWidth - tooltipEl.offsetWidth - 8;
                                const finalLeft = Math.min(Math.max(desiredLeft, minLeft), Math.max(minLeft, maxLeft));
                                tooltipEl.style.left = finalLeft + 'px';
                                tooltipEl.style.top = (caretY + offsetY) + 'px';
                              }
                            },
                            animation: { duration: 1200, easing: 'easeOutQuart' },
                          },
                          hover: { mode: 'index', intersect: false },
                          onHover: function (event, chartElement) {
                            const target = event?.native?.target || event?.target;
                            if (target) target.style.cursor = chartElement && chartElement.length ? 'crosshair' : 'default';
                          },
                          scales: {
                            x: { title: { display: false }, ticks: { color: "#ffffff", font: { family: 'Tenorite, sans-serif', size: 9 } }, border: { width: 0 }, grid: { display: false } },
                            y: { title: { display: false }, beginAtZero: true, max: suggestedMax, border: { width: 0 }, ticks: { display: false }, grid: { display: false } },
                          },
                          layout: { padding: { top: 16, bottom: 8, left: 8, right: 8 } },
                          elements: { line: { borderJoinStyle: 'round' }, point: { pointStyle: 'circle' } },
                        }}
                        width={260}
                        height={140}
                      />
                    );
                  })()}
                </div>

                <div className="w-full">
                  <div className="grid grid-cols-2 w-full pt-6 gap-x-4 justify-center">
                    {(() => {
                      const currentData = testWiseAvgMarks[selectedSubject] || [];
                      let highest = 0;
                      let lowest = 0;
                      if (currentData.length > 0) {
                        highest = Math.max(...currentData.map(t => t.avg));
                        lowest = Math.min(...currentData.map(t => t.avg));
                      }
                      return <>
                        <div className="flex flex-col items-center border-r border-gray-200 pr-2 ">
                          <span className="text-gray-500 text-xs">Avg Highest Score</span>
                          <div className="flex items-center">
                            <span className="text-base font-semibold">{highest}</span>
                            <svg className="h-3.5 w-3.5 text-green-500 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-gray-500 text-xs">Avg Lowest Score</span>
                          <div className="flex items-center">
                            <span className="text-base font-semibold">{lowest}</span>
                            <svg className="h-3.5 w-3.5 text-red-500 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </>;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deep-dive card */}
          <div className="flex justify-center w-full">
            <Card
              className="rounded-2xl p-3 mt-3 border border-green-100 bg-white cursor-pointer shadow-lg transition-shadow mx-3"
              onClick={() => navigate('/institution/students')}
              role="button"
              aria-label="View detailed student results"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); navigate('/institution/students'); } }}
            >
              <div className="flex flex-row items-center gap-3 flex-wrap">
                <div className="flex-shrink-0 bg-green-50 border border-green-100 rounded-lg p-2 mr-2">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-primary">Want to see detailed results for each student?</div>
                </div>

                <div className="w-full">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/institution/students'); }}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 text-sm font-semibold"
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
    </UITooltipProvider>
  );
}

export default IDashboard;
