import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Filler } from 'chart.js';
import { useEducatorDashboard, useEducatorResults, usePrefetchEducatorData } from '../../hooks/useEducatorData.js';
import { Users, Calendar, HelpCircle, Sparkles, ChevronDown } from 'lucide-react';
import Carousel from '../../components/carousel';
import Stat from '../../components/stat';
import { Card } from '../../components/ui/card.jsx';
import { Tooltip as UITooltip, TooltipTrigger as UITooltipTrigger, TooltipContent as UITooltipContent, TooltipProvider as UITooltipProvider } from '../../components/ui/tooltip.jsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import { Button } from '../../components/ui/button.jsx';
import EStudentListMock from '../components/StudentListMock';
import EDashboardMobile from './e_dashboard-mobile.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import WhatsAppOptInBanner from '../../components/whatsapp/WhatsAppOptInBanner.jsx';

// Register Chart.js components and set global font family
Chart.register(LineElement, PointElement, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Filler);
Chart.defaults.font.family = 'Tenorite, sans-serif';


const ICON_MAPPING = {
  Users: <Users aria-hidden="true" className="text-foreground" />,
  Calendar: <Calendar aria-hidden="true" className="text-foreground" />,
  Default: <HelpCircle aria-hidden="true" className="text-foreground" />
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



function EDashboard() {
  const [mobileInsightIdx, setMobileInsightIdx] = useState(0);
  const navigate = useNavigate();
  const { data: dashboardDataResp, isLoading: dashboardLoading, error: dashboardError } = useEducatorDashboard();
  const { prefetchAll } = usePrefetchEducatorData();
  // For mobile insights dropdown (must be after dashboardData is defined)
  const mobileInsightSections = [
    {
      key: 'quickRecommendations',
      title: 'Quick Recommendations',
      items: dashboardDataResp?.keyInsightsData?.quickRecommendations || [],
      tag: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
          <Sparkles size={12} className="text-primary" />
          AI Generated
        </span>
      ),
      tagTooltip: 'These are AI-generated quick recommendations for your class.',
    },
    {
      key: 'keyStrengths',
      title: 'Key Strengths',
      items: dashboardDataResp?.keyInsightsData?.keyStrengths || [],
      tag: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
          <Sparkles size={12} className="text-primary" />
          AI Generated
        </span>
      ),
      tagTooltip: 'AI-generated strengths identified for your class.',
    },
    
    {
      key: 'yetToDecide',
      title: 'Consistency Vulnerability',
      items: dashboardDataResp?.keyInsightsData?.yetToDecide || [],
      tag: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
          <Sparkles size={12} className="text-primary" />
          AI Generated
        </span>
      ),
      tagTooltip: 'Potential vulnerabilities in consistency, identified by AI.',
    },
  ];

  
  const [selectedSubject, setSelectedSubject] = useState('Overall');
  const { data: resultsResp, isLoading: resultsLoading, error: resultsError } = useEducatorResults();
  // Local refs/state for mobile-only stat carousel (custom implementation)
  const statScrollRef = useRef(null);
  const [statIdx, setStatIdx] = useState(0);

  

  
  
  // derive rawResults array from query response
  const rawResults = useMemo(() => {
    if (!resultsResp) return [];
    if (Array.isArray(resultsResp.results)) return resultsResp.results;
    if (Array.isArray(resultsResp)) return resultsResp;
    return [];
  }, [resultsResp]);

  // derive testWiseAvgMarks from rawResults (same logic as before)
  const testWiseAvgMarks = useMemo(() => {
    if (!rawResults || rawResults.length === 0) return {};
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
      return avgData;
    } catch (err) {
      return {};
    }
  }, [rawResults]);

  // compute overallPerformance and improvementRate from rawResults
  const { overallPerformance, improvementRate } = useMemo(() => {
    if (!rawResults || rawResults.length === 0) return { overallPerformance: 'N/A', improvementRate: 'N/A' };

    const testNums = [...new Set(rawResults.map(r => r.test_num))].sort((a, b) => a - b);
    const maxTestNum = Math.max(...rawResults.map(r => r.test_num));
    const lastTestResults = rawResults.filter(r => r.test_num === maxTestNum);

    const computeAvgPercentFromRows = (rows) => {
      const vals = rows.map(r => {
        if (r.total_percent !== undefined && r.total_percent !== null) return parseFloat(String(r.total_percent).replace('%', ''));
        const score = Number(r.total_score) ||
          ((Number(r.phy_score) || 0) + (Number(r.chem_score) || 0) + (Number(r.bot_score) || 0) + (Number(r.zoo_score) || 0) + (Number(r.bio_score) || 0));
        if (!isNaN(score) && score > 0) return (score / 720) * 100;
        if (r.total !== undefined && r.total_max !== undefined) return (Number(r.total) / Number(r.total_max)) * 100;
        return null;
      }).filter(v => v !== null && !isNaN(v));

      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    let overallPerf = 'N/A';
    const avgLatestPercent = lastTestResults.length > 0 ? computeAvgPercentFromRows(lastTestResults) : null;
    if (avgLatestPercent !== null) overallPerf = `${Math.round(avgLatestPercent)}%`;

    let improv = 'N/A';
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
        improv = `${absolutePoints}%`;
      }
    }

    return { overallPerformance: overallPerf, improvementRate: improv };
  }, [rawResults]);

  // Build subject options for the Select control based on the computed testWiseAvgMarks
  const subjectOptions = useMemo(() => {
    const keys = Object.keys(testWiseAvgMarks || {});
    if (!keys || keys.length === 0) return ['Overall', 'Physics', 'Chemistry', 'Botany', 'Zoology'];
    // Ensure 'Overall' is first and preserve other detected subjects in a stable order
    const others = keys.filter(k => k !== 'Overall');
    // Keep a preferred ordering for readability
    const preferredOrder = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
    const ordered = preferredOrder.filter(k => others.includes(k)).concat(others.filter(k => !preferredOrder.includes(k)));
    return ['Overall', ...ordered];
  }, [testWiseAvgMarks]);

  // Ensure the selected subject exists in the computed data. If the current
  // `selectedSubject` is not available after we compute series (for example
  // Biology is added later), switch to a sensible available subject so the
  // chart immediately reflects the computed series.
  useEffect(() => {
    const keys = Object.keys(testWiseAvgMarks || {});
    if (keys.length === 0) return;
    if (!keys.includes(selectedSubject)) {
      if (keys.includes('Biology')) setSelectedSubject('Biology');
      else setSelectedSubject(keys[0]);
    }
  }, [testWiseAvgMarks, selectedSubject]);
  
  // Prefetch all other page data in background after dashboard loads
  useEffect(() => {
    if (dashboardDataResp && !dashboardLoading) {
      prefetchAll();
    }
  }, [dashboardDataResp, dashboardLoading, prefetchAll]);

  const summaryCardsData = dashboardDataResp?.summaryCardsData || [];
  const keyInsightsData = dashboardDataResp?.keyInsightsData || {};
  const isLoading = dashboardLoading || resultsLoading;
  const error = (dashboardError && (dashboardError.message || dashboardError)) || (resultsError && (resultsError.message || resultsError)) || null;

  const attendanceData = useMemo(() => {
    let percentage = 'N/A';
    let change = null;
    let direction = null;
    if (rawResults.length > 0) {
      // Group by test_num
      const testAttendance = {};
      rawResults.forEach(r => {
        if (!testAttendance[r.test_num]) testAttendance[r.test_num] = new Set();
        testAttendance[r.test_num].add(r.student_id);
      });
      const testNums = Object.keys(testAttendance).map(Number).sort((a, b) => a - b);
      if (testNums.length > 1) {
        const lastTest = testNums[testNums.length - 1];
        const prevTest = testNums[testNums.length - 2];
        const lastCount = testAttendance[lastTest].size;
        const prevCount = testAttendance[prevTest].size;
        // Find total unique students
        const allStudents = new Set(rawResults.map(r => r.student_id));
        percentage = Math.round((lastCount / allStudents.size) * 100);
        change = lastCount - prevCount;
        direction = change > 0 ? 'up' : (change < 0 ? 'down' : 'same');
      }
    }
    return { percentage, change, direction };
  }, [rawResults]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <LoadingPage fixed={false} className="bg-white/80 dark:bg-gray-900/80 z-10" />
      </div>
    );
  }

  if (error) return <div className="text-center py-8 text-error">{error}</div>;

  return (
    <UITooltipProvider>
      <>
        {/* Mobile version */}
        <div className="block md:hidden">
          <EDashboardMobile />
        </div>

        {/* Desktop version */}
        <div className="hidden md:block mt-12">
          {/* WhatsApp Opt-In Banner */}
          <WhatsAppOptInBanner />
          
          {/* Section 1: Grid layout */}
          <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-2">
            {/* Left Column */}
            <div className="flex flex-col gap-4 sm:gap-8">
              {/* Desktop / larger screens: two-column stats */}
              <div className="hidden sm:grid grid-cols-1 gap-3 sm:gap-6 sm:grid-cols-2">
                <Stat
                  icon={ICON_MAPPING.Users}
                  iconBg="bg-blue-50 dark:bg-blue-950/30"
                  iconClass="text-blue-600 dark:text-blue-400"
                  label="Recent Test Performance"
                  info={"Average total score in the latest test (as % of full marks)."}
                  value={formatStatValue(overallPerformance)}
                  badge={(() => {
                    let rate = 0;
                    if (improvementRate !== undefined && improvementRate !== null && improvementRate !== 'N/A') {
                      const numeric = String(improvementRate).replace(/[^0-9.-]+/g, "");
                      rate = parseFloat(numeric);
                    }
                    const isNegative = rate < 0;
                    return (
                      <UITooltip>
                        <UITooltipTrigger asChild>
                          <span
                            aria-label={isNegative ? "Improvement rate: negative change compared to previous test" : "Improvement rate: positive change compared to previous test"}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold ml-1 sm:ml-2 ${isNegative ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 border border-red-200/60 dark:border-red-800/60' : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200 border border-green-200/60 dark:border-green-800/60'}`}>
                            {isNegative ? (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                            <span className="whitespace-nowrap">{formatStatValue(improvementRate)}</span>
                          </span>
                        </UITooltipTrigger>
                        <UITooltipContent sideOffset={6}>
                          {isNegative ? "Drop compared to previous test (rounded %)." : "Improvement compared to previous test (rounded %)."}
                        </UITooltipContent>
                      </UITooltip>
                    );
                  })()}
                />
                {/* Add hidden accessible tooltip text for the improvement-rate badge */}
                <Stat
                  icon={ICON_MAPPING.Calendar}
                  iconBg="bg-green-50 dark:bg-green-950/30"
                  iconClass="text-green-600 dark:text-green-400"
                  label="Attendance"
                  info={"Percentage of students who attended the latest test."}
                  value={`${attendanceData.percentage}%`}
                  badge={attendanceData.direction && attendanceData.direction !== 'same' ? (
                    <UITooltip>
                      <UITooltipTrigger asChild>
                        <span
                          aria-label={attendanceData.direction === 'up' ? "Attendance increased since previous test" : "Attendance decreased since previous test"}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2 text-xs sm:text-sm ${attendanceData.direction === 'up' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200 border border-green-200/60 dark:border-green-800/60' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 border border-red-200/60 dark:border-red-800/60'}`}>
                          {attendanceData.direction === 'up' ? (
                            <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          ) : (
                            <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                          {attendanceData.change > 0 ? `+${attendanceData.change}` : attendanceData.change}
                          {attendanceData.change === 1 || attendanceData.change === -1 ? ' student' : ' students'}
                        </span>
                      </UITooltipTrigger>
                      <UITooltipContent sideOffset={6}>{attendanceData.direction === 'up' ? 'Attendance increased compared to the previous test: shows the change in number of students who took the test.' : 'Attendance decreased compared to the previous test: shows the change in number of students who took the test.'}</UITooltipContent>
                    </UITooltip>
                  ) : attendanceData.direction === 'same' ? (
                    <UITooltip>
                      <UITooltipTrigger asChild>
                        <span aria-label="No change in attendance" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold ml-1 sm:ml-2 text-xs sm:text-sm">
                          No change
                        </span>
                      </UITooltipTrigger>
                      <UITooltipContent sideOffset={6}>No change in student attendance between the last two tests.</UITooltipContent>
                    </UITooltip>
                  ) : null}
                />
              </div>

              {/* Mobile: custom horizontal scroll-snap carousel for the two stat cards */}
              <div className="block sm:hidden w-full">
                <div className="relative">
                  <div
                    ref={statScrollRef}
                    onScroll={() => {
                      const container = statScrollRef.current;
                      if (!container) return;
                      const children = Array.from(container.children);
                      const center = container.scrollLeft + container.offsetWidth / 2;
                      let nearestIdx = 0;
                      let nearestDist = Infinity;
                      children.forEach((child, i) => {
                        const cCenter = child.offsetLeft + child.offsetWidth / 2;
                        const dist = Math.abs(cCenter - center);
                        if (dist < nearestDist) {
                          nearestDist = dist;
                          nearestIdx = i;
                        }
                      });
                      setStatIdx(nearestIdx);
                    }}
                    className="flex gap-3 -mx-2 px-2 overflow-x-auto snap-x snap-mandatory touch-pan-x scrollbar-hide"
                  >
                    <div className="snap-center flex-shrink-0 w-full p-2">
                      <Stat
                        icon={ICON_MAPPING.Users}
                        iconBg="bg-blue-50 dark:bg-blue-950/30"
                        iconClass="text-blue-600 dark:text-blue-400"
                        label="Overall Performance"
                        info="Shows the overall average performance of all students for the last test."
                        value={formatStatValue(overallPerformance)}
                        badge={(() => {
                          let rate = 0;
                          if (improvementRate !== undefined && improvementRate !== null && improvementRate !== 'N/A') {
                            const numeric = String(improvementRate).replace(/[^0-9.-]+/g, "");
                            rate = parseFloat(numeric);
                          }
                          const isNegative = rate < 0;
                          return (
                            <UITooltip>
                              <UITooltipTrigger asChild>
                                <span
                                  aria-label={isNegative ? "Improvement rate: negative change compared to previous test" : "Improvement rate: positive change compared to previous test"}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold ml-1 sm:ml-2 ${isNegative ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 border border-red-200/60 dark:border-red-800/60' : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200 border border-green-200/60 dark:border-green-800/60'}`}>
                                  {isNegative ? (
                                    <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                  ) : (
                                    <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                  )}
                                  <span className="whitespace-nowrap">{formatStatValue(improvementRate)}</span>
                                </span>
                              </UITooltipTrigger>
                              <UITooltipContent sideOffset={6}>
                                {isNegative ? "Percentage drop compared to the previous test average. Formula: rounded((lastAvg - prevAvg) / prevAvg × 100)." : "Percentage improvement compared to the previous test average. Formula: rounded((lastAvg - prevAvg) / prevAvg × 100)."}
                              </UITooltipContent>
                            </UITooltip>
                          );
                        })()}
                      />
                    </div>
                    <div className="snap-center flex-shrink-0 w-full p-2">
                      <Stat
                        icon={ICON_MAPPING.Calendar}
                        iconBg="bg-green-50 dark:bg-green-950/30"
                        iconClass="text-green-600 dark:text-green-400"
                        label="Attendance"
                        info="Percentage of students who attended the most recent test."
                        value={`${attendanceData.percentage}%`}
                        badge={attendanceData.direction && attendanceData.direction !== 'same' ? (
                          <UITooltip>
                            <UITooltipTrigger asChild>
                              <span
                                aria-label={attendanceData.direction === 'up' ? "Attendance increased since previous test" : "Attendance decreased since previous test"}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2 text-xs sm:text-sm ${attendanceData.direction === 'up' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200 border border-green-200/60 dark:border-green-800/60' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 border border-red-200/60 dark:border-red-800/60'}`}>
                                {attendanceData.direction === 'up' ? (
                                  <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ) : (
                                  <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                )}
                                {attendanceData.change > 0 ? `+${attendanceData.change}` : attendanceData.change}
                                {attendanceData.change === 1 || attendanceData.change === -1 ? ' student' : ' students'}
                              </span>
                            </UITooltipTrigger>
                            <UITooltipContent sideOffset={6}>{attendanceData.direction === 'up' ? 'Attendance increased compared to the previous test: shows the change in number of students who took the test.' : 'Attendance decreased compared to the previous test: shows the change in number of students who took the test.'}</UITooltipContent>
                          </UITooltip>
                        ) : attendanceData.direction === 'same' ? (
                          <UITooltip>
                            <UITooltipTrigger asChild>
                              <span aria-label="No change in attendance" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold ml-1 sm:ml-2 text-xs sm:text-sm">
                                No change
                              </span>
                            </UITooltipTrigger>
                            <UITooltipContent sideOffset={6}>No change in student attendance between the last two tests.</UITooltipContent>
                          </UITooltip>
                        ) : null}
                      />
                    </div>
                  </div>

                  {/* Dot indicators (mobile only) */}
                  <div className="absolute left-0 right-0 bottom-2 flex items-center justify-center gap-2 pointer-events-auto translate-y-4">
                    {[0, 1].map((i) => (
                      <button
                        key={i}
                        aria-label={`Go to stat ${i + 1}`}
                        onClick={() => {
                          const container = statScrollRef.current;
                          if (!container) return;
                          const child = container.children[i];
                          if (child) container.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
                          setStatIdx(i);
                        }}
                        className={`w-2 h-2 rounded-full transition-colors ${statIdx === i ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* Insights Carousel Card */}
              <div className="w-full">
                {/* Mobile: Single card with dropdown title */}
                <div className="block sm:hidden w-full">
                  <Card className="bg-white rounded-2xl px-3 py-3 border border-gray-200">
                    <DropdownMenu>
                      <div className="mb-3">
                        <div className="flex items-center justify-between w-full gap-2">
                          <DropdownMenuTrigger asChild>
                            <button className="flex-1 text-left bg-gray-50 border border-gray-200 text-md font-semibold text-gray-800 px-2 py-1.5 rounded-lg flex items-center min-h-0 h-9">
                              <span className="flex-1 text-left">{mobileInsightSections[mobileInsightIdx].title}</span>
                              <ChevronDown className="w-3.5 h-3.5 ml-2 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <div className="ml-2 sm:hidden">
                            {mobileInsightSections[mobileInsightIdx].tag}
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
                      </div>

                      {/* tag is now shown inline inside the trigger on mobile */}
                      <div className="flex flex-col gap-2 px-0.5 pb-0.5">
                        {mobileInsightSections[mobileInsightIdx].items && mobileInsightSections[mobileInsightIdx].items.length > 0 ? (
                          mobileInsightSections[mobileInsightIdx].items.map((item, i) => (
                            <div key={i} className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-400 italic">No Insights Available</div>
                        )}
                      </div>
                    </DropdownMenu>
                  </Card>
                </div>
                <div className="hidden sm:block w-full">
                  <Carousel
                    sections={[
                      {
                        title: 'Quick Recommendations',
                        items: keyInsightsData.quickRecommendations || [],
                        tag: (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                            <Sparkles size={12} className="text-primary" />
                            AI Generated
                          </span>
                        ),
                        tagTooltip: 'These are AI-generated quick recommendations for your class.',
                      },
                      {
                        title: 'Key Strengths',
                        items: keyInsightsData.keyStrengths || [],
                        tag: (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                            <Sparkles size={12} className="text-primary" />
                            AI Generated
                          </span>
                        ),
                        tagTooltip: 'AI-generated strengths identified for your class.',
                      },
                      {
                        title: 'Areas for Improvement',
                        items: keyInsightsData.areasForImprovement || [],
                        tag: (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                            <Sparkles size={12} className="text-primary" />
                            AI Generated
                          </span>
                        ),
                        tagTooltip: 'AI-generated suggestions for improvement.',
                      },
                      {
                        title: 'Consistency Vulnerability',
                        items: keyInsightsData.yetToDecide || [],
                        tag: (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                            <Sparkles size={12} className="text-primary" />
                            AI Generated
                          </span>
                        ),
                        tagTooltip: 'Potential vulnerabilities in consistency, identified by AI.',
                      },
                    ]}
                    height={330}
                    className="!p-4 md:!p-6 lg:!p-8 !gap-4 md:!gap-6"
                    emptyMessage="No Insights Available"
                  />
                </div>
              </div>
            </div>
            <Card className="rounded-2xl border border-border bg-muted flex flex-col items-start justify-start sm:p-0 p-2">
              {/* Title & Chart Container */}
              <div className="w-full flex flex-col bg-card border border-border p-3 sm:p-6 rounded-2xl">
                {/* Title Container */}
                <div className="w-full flex justify-between items-center mb-0.5 sm:mb-1">
                  <span className="text-base sm:text-xl font-semibold text-foreground text-left">Class Performance</span>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-6">Average marks across all students</p>

                {/* Area Chart Container */}
                <div className="flex flex-col items-center justify-center w-full mb-3 sm:mb-6 bg-card h-56 sm:h-80">
                  {(() => {
                    const currentData = testWiseAvgMarks[selectedSubject] || [];
                    const dataValues = currentData.map(d => d.avg);
                    const maxValue = dataValues.length > 0 ? Math.max(...dataValues) : 50;
                    const minValue = dataValues.length > 0 ? Math.min(...dataValues) : 0;
                    const range = maxValue - minValue;
                    const suggestedMax = Math.ceil((maxValue + range * 0.1) / 10) * 10; // Add 10% padding
                    const stepSize = Math.ceil(range / 5 / 10) * 10 || 10; // Divide into ~5 steps

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
                                if (!chartArea) return "rgba(37,99,235,0.15)";
                                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                                gradient.addColorStop(0, "rgba(37,99,235,0.35)");
                                gradient.addColorStop(1, "rgba(37,99,235,0.05)");
                                return gradient;
                              },
                              borderColor: "#2563eb",
                              borderWidth: 2,
                              pointBackgroundColor: "#2563eb",
                              pointRadius: 5,
                              pointHoverRadius: 7,
                              pointBorderWidth: 2,
                              pointBorderColor: "#fff",
                              tension: 0.45,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              enabled: true,
                              // Compact dark themed tooltip
                              backgroundColor: 'rgba(15,23,42,0.95)', // slate-900 nearly opaque
                              titleColor: '#ffffff',
                              bodyColor: '#e5e7eb',
                              borderColor: 'rgba(255,255,255,0.06)',
                              borderWidth: 0,
                              padding: 8,
                              cornerRadius: 6,
                              displayColors: false,
                              caretSize: 6,
                              caretPadding: 6,
                              titleFont: { family: 'Tenorite, sans-serif', size: 12, weight: '600' },
                              bodyFont: { family: 'Tenorite, sans-serif', size: 12 },
                              callbacks: {
                                title: function (context) {
                                  // keep the test label but keep it compact
                                  return context[0].label;
                                },
                                label: function (context) {
                                  // show average, max and min for the hovered point
                                  const dataIndex = context.dataIndex;
                                  const dataPoint = currentData[dataIndex];
                                  if (dataPoint) {
                                    if ((selectedSubject === 'Botany' || selectedSubject === 'Zoology') && dataPoint.avg === 0 && testWiseAvgMarks['Biology'] && testWiseAvgMarks['Biology'].length > 0) {
                                      return ['The question paper must have uploaded as Biology instead of Botany and Zoology, please check on Biology'];
                                    }
                                    return [
                                      `Avg Score: ${dataPoint.avg}`,
                                      `Max Score: ${dataPoint.max}`,
                                      `Min Score: ${dataPoint.min}`,
                                    ];
                                  }
                                  return '';
                                }
                              },
                              mode: 'index',
                              intersect: false,
                            },
                            animation: {
                              duration: 1200,
                              easing: 'easeOutQuart',
                            },
                          },
                          hover: {
                            mode: 'index',
                            intersect: false,
                          },
                          onHover: function (event, chartElement) {
                            const target = event?.native?.target || event?.target;
                            if (target) {
                              target.style.cursor = chartElement && chartElement.length ? 'crosshair' : 'default';
                            }
                          },
                          scales: {
                            x: {
                              // Remove axis title
                              title: { display: false },
                              ticks: { color: "#6b7280", font: { family: 'Tenorite, sans-serif', size: 13 } },
                              border: { width: 0 }, // Hide y-axis line
                              grid: { display: false },
                            },
                            y: {
                              // Remove axis title
                              title: { display: false },
                              beginAtZero: true,
                              max: suggestedMax,
                              border: { width: 0 }, // Hide y-axis line
                              ticks: {
                                color: "#6b7280",
                                font: { family: 'Tenorite, sans-serif', size: 13 },
                                stepSize: stepSize,
                              },
                              grid: { color: "rgba(156, 163, 175, 0.15)" },
                            },
                          },
                          layout: {
                            padding: {
                              top: 16,
                              bottom: 8,
                              left: 8,
                              right: 8,
                            },
                          },
                          elements: {
                            line: {
                              borderJoinStyle: 'round',
                            },
                            point: {
                              pointStyle: 'circle',
                            },
                          },
                        }}
                        width={260}
                        height={140}
                      />
                    );
                  })()}
                </div>
              </div>

              <div className="w-full">
                <div className="grid grid-cols-2 w-full pt-2 sm:pt-4 gap-x-4 sm:gap-x-12 justify-center">
                  {(() => {
                    // Calculate highest and lowest from testWiseAvgMarks for selected subject
                    const currentData = testWiseAvgMarks[selectedSubject] || [];
                    let highest = 0;
                    let lowest = 0;
                    if (currentData.length > 0) {
                      highest = Math.max(...currentData.map(t => t.avg));
                      lowest = Math.min(...currentData.map(t => t.avg));
                    }
                    return <>
                      <div className="flex flex-col items-center border-r border-border pr-2 sm:pr-0">
                        <span className="text-muted-foreground text-xs sm:text-sm">Avg Highest Score</span>
                        <div className="flex items-center">
                          <span className="text-base sm:text-lg font-semibold text-foreground">{highest}</span>
                          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground text-xs sm:text-sm">Avg Lowest Score</span>
                        <div className="flex items-center">
                          <span className="text-base sm:text-lg font-semibold text-foreground">{lowest}</span>
                          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </>;
                  })()}
                </div>
              </div>
            </Card>
          </div>
        </div>
        <Card className="hidden md:block rounded-2xl border border-gray-250 bg-card w-full mt-4 sm:mt-8 p-3 sm:p-8">
          <div className="flex items-center justify-between pb-2 sm:pb-6">
            <h2 className="text-base sm:text-xl font-bold text-foreground">Recent Test Results</h2>
            <Button
              variant="ghost"
              size="sm"
              className="border-gray-300"
              onClick={() => navigate('/educator/students')}
            >
              See All
            </Button>
          </div>
          <EStudentListMock rawResults={rawResults} />
        </Card>
      </>
    </UITooltipProvider>
  );
}

export default EDashboard;