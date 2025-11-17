import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Filler } from 'chart.js';
import { getEducatorDashboardData, fetchEducatorAllStudentResults } from '../../utils/api';
import { Users, Calendar, HelpCircle, Sparkles, ChevronDown } from 'lucide-react';
import Carousel from '../components/ui/carousel';
import Stat from '../components/ui/stat';
import { Card } from '../../components/ui/card.jsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu.jsx';
import { Button } from '../../components/ui/button.jsx';
import EStudentListMock from './components/e_StudentListMock';

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
    const wasIntendedAsInteger = Number.isInteger(rawValue) && !valueStr.includes('.');
    const formattedValue = wasIntendedAsInteger ? rawValue : rawValue.toFixed(1);
    return isPercentage ? `${formattedValue}%` : formattedValue;
  }
  return valueStr;
};



function EDashboard() {
  const [mobileInsightIdx, setMobileInsightIdx] = useState(0);
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    summaryCardsData: [],
    keyInsightsData: {},
    isLoading: true,
    error: null,
  });
  // For mobile insights dropdown (must be after dashboardData is defined)
  const mobileInsightSections = [
    {
      key: 'quickRecommendations',
      title: 'Quick Recommendations',
      items: dashboardData.keyInsightsData.quickRecommendations || [],
      tag: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
          <Sparkles size={12} />
          AI Generated
        </span>
      ),
      tagTooltip: 'These are AI-generated quick recommendations for your class.',
    },
    {
      key: 'keyStrengths',
      title: 'Key Strengths',
      items: dashboardData.keyInsightsData.keyStrengths || [],
      tag: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
          <Sparkles size={12} />
          AI Generated
        </span>
      ),
      tagTooltip: 'AI-generated strengths identified for your class.',
    },
    {
      key: 'areasForImprovement',
      title: 'Areas for Improvement',
      items: dashboardData.keyInsightsData.areasForImprovement || [],
      tag: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
          <Sparkles size={12} />
          AI Generated
        </span>
      ),
      tagTooltip: 'AI-generated suggestions for improvement.',
    },
    {
      key: 'yetToDecide',
      title: 'Consistency Vulnerability',
      items: dashboardData.keyInsightsData.yetToDecide || [],
      tag: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
          <Sparkles size={12} />
          AI Generated
        </span>
      ),
      tagTooltip: 'Potential vulnerabilities in consistency, identified by AI.',
    },
  ];

  const [testWiseAvgMarks, setTestWiseAvgMarks] = useState([]);
  const [rawResults, setRawResults] = useState([]);
  // Local refs/state for mobile-only stat carousel (custom implementation)
  const statScrollRef = useRef(null);
  const [statIdx, setStatIdx] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getEducatorDashboardData();
        if (!data || data.error) {
          throw new Error(data?.error || 'Failed to fetch data');
        }
        setDashboardData({
          summaryCardsData: data.summaryCardsData || [],
          keyInsightsData: data.keyInsightsData || {},
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setDashboardData((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTestWiseAvg = async () => {
      try {
        const results = await fetchEducatorAllStudentResults();
        if (results && Array.isArray(results.results)) {
          // Group by test_num and calculate average marks for each test
          const testMap = {};
          results.results.forEach(r => {
            const testNum = r.test_num;
            if (!testMap[testNum]) {
              testMap[testNum] = { total: 0, count: 0 };
            }
            testMap[testNum].total += r.total_score || 0;
            testMap[testNum].count += 1;
          });
          const avgMarks = Object.entries(testMap)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([testNum, { total, count }]) => ({
              test: `Test ${testNum}`,
              avg: count ? Math.round(total / count) : 0
            }));
          setTestWiseAvgMarks(avgMarks);
        }
      } catch (err) {
        // fallback to dummy data if needed
        setTestWiseAvgMarks([
          { test: 'Test 1', avg: 540 },
          { test: 'Test 2', avg: 620 },
          { test: 'Test 3', avg: 480 },
          { test: 'Test 4', avg: 700 }
        ]);
      }
    };
    fetchTestWiseAvg();
  }, []);

  useEffect(() => {
    fetchEducatorAllStudentResults().then(results => {
      if (results && Array.isArray(results.results)) {
        setRawResults(results.results);
      }
    });
  }, []);

  const { summaryCardsData, keyInsightsData, isLoading, error } = dashboardData;

  let attendancePercentage = 'N/A';
  let attendanceChange = null;
  let attendanceDirection = null;
  if (Array.isArray(testWiseAvgMarks) && testWiseAvgMarks.length > 1 && rawResults.length > 0) {
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
      attendancePercentage = Math.round((lastCount / allStudents.size) * 100);
      attendanceChange = lastCount - prevCount;
      attendanceDirection = attendanceChange > 0 ? 'up' : (attendanceChange < 0 ? 'down' : 'same');
    }
  }

  const overallPerformanceCard = summaryCardsData.find(card => card.title === 'Overall Performance') || { value: 'N/A', icon: 'ChartLine' };
  const improvementRateCard = summaryCardsData.find(card => card.title === 'Improvement Rate') || { value: 'N/A' };

  if (isLoading) return <div className="text-center py-8">Loading dashboard...</div>;

  if (error) return <div className="text-center py-8 text-error">{error}</div>;

  return (
    <>
      <div className="space-y-6 pt-6 sm:space-y-8 sm:pt-12">
        {/* Section 1: Grid layout */}
        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-2">
          {/* Left Column */}
          <div className="flex flex-col gap-4 sm:gap-8">
            {/* Desktop / larger screens: two-column stats */}
            <div className="hidden sm:grid grid-cols-1 gap-3 sm:gap-6 sm:grid-cols-2">
              <Stat
                icon={ICON_MAPPING.Users}
                label="Overall Performance"
                info="Shows the overall average performance of all students."
                value={formatStatValue(overallPerformanceCard.value)}
                badge={(() => {
                  let rate = 0;
                  if (improvementRateCard.value !== undefined && improvementRateCard.value !== null) {
                    const numeric = String(improvementRateCard.value).replace(/[^0-9.-]+/g, "");
                    rate = parseFloat(numeric);
                  }
                  const isNegative = rate < 0;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold ml-1 sm:ml-2 ${isNegative ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {isNegative ? (
                        <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                      {formatStatValue(improvementRateCard.value)}
                    </span>
                  );
                })()}
              />
              <Stat
                icon={ICON_MAPPING.Calendar}
                label="Attendance"
                info="Percentage of students who attended the most recent test."
                value={`${attendancePercentage}%`}
                badge={attendanceDirection && attendanceDirection !== 'same' ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2 text-xs sm:text-sm ${attendanceDirection === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {attendanceDirection === 'up' ? (
                      <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                    {attendanceChange > 0 ? `+${attendanceChange}` : attendanceChange}
                    {attendanceChange === 1 || attendanceChange === -1 ? ' student' : ' students'}
                  </span>
                ) : attendanceDirection === 'same' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold ml-1 sm:ml-2 text-xs sm:text-sm">
                    No change
                  </span>
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
                      label="Overall Performance"
                      info="Shows the overall average performance of all students."
                      value={formatStatValue(overallPerformanceCard.value)}
                      badge={(() => {
                        let rate = 0;
                        if (improvementRateCard.value !== undefined && improvementRateCard.value !== null) {
                          const numeric = String(improvementRateCard.value).replace(/[^0-9.-]+/g, "");
                          rate = parseFloat(numeric);
                        }
                        const isNegative = rate < 0;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold ml-1 sm:ml-2 ${isNegative ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {isNegative ? (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : (
                              <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                            {formatStatValue(improvementRateCard.value)}
                          </span>
                        );
                      })()}
                    />
                  </div>
                  <div className="snap-center flex-shrink-0 w-full p-2">
                    <Stat
                      icon={ICON_MAPPING.Calendar}
                      label="Attendance"
                      info="Percentage of students who attended the most recent test."
                      value={`${attendancePercentage}%`}
                      badge={attendanceDirection && attendanceDirection !== 'same' ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2 text-xs sm:text-sm ${attendanceDirection === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {attendanceDirection === 'up' ? (
                            <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          ) : (
                            <svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 4v8M8 12l3-3M8 12l-3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                          {attendanceChange > 0 ? `+${attendanceChange}` : attendanceChange}
                          {attendanceChange === 1 || attendanceChange === -1 ? ' student' : ' students'}
                        </span>
                      ) : attendanceDirection === 'same' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold ml-1 sm:ml-2 text-xs sm:text-sm">
                          No change
                        </span>
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
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Sparkles size={12} />
                          AI Generated
                        </span>
                      ),
                      tagTooltip: 'These are AI-generated quick recommendations for your class.',
                    },
                    {
                      title: 'Key Strengths',
                      items: keyInsightsData.keyStrengths || [],
                      tag: (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Sparkles size={12} />
                          AI Generated
                        </span>
                      ),
                      tagTooltip: 'AI-generated strengths identified for your class.',
                    },
                    {
                      title: 'Areas for Improvement',
                      items: keyInsightsData.areasForImprovement || [],
                      tag: (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Sparkles size={12} />
                          AI Generated
                        </span>
                      ),
                      tagTooltip: 'AI-generated suggestions for improvement.',
                    },
                    {
                      title: 'Consistency Vulnerability',
                      items: keyInsightsData.yetToDecide || [],
                      tag: (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Sparkles size={12} />
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
          <Card className="rounded-2xl border border-gray-250 bg-gray-100 flex flex-col items-start justify-start sm:p-0 p-2">
            {/* Title & Chart Container */}
            <div className="w-full flex flex-col bg-white p-3 sm:p-6 rounded-2xl">
              {/* Title Container */}
              <div className="w-full flex justify-between items-center mb-0.5 sm:mb-1">
                <span className="text-base sm:text-xl font-semibold text-primary text-left">Class Performance</span>
              </div>

              <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-6">Average marks across all students</p>

              {/* Area Chart Container */}
              <div className="flex flex-col items-center justify-center w-full mb-3 sm:mb-6 bg-white h-56 sm:h-80">
                <Line
                  data={{
                    labels: testWiseAvgMarks.map(d => d.test),
                    datasets: [
                      {
                        label: "Average Marks",
                        data: testWiseAvgMarks.map(d => d.avg),
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
                        max: 800,
                        border: { width: 0 }, // Hide y-axis line
                        ticks: {
                          color: "#6b7280",
                          font: { family: 'Tenorite, sans-serif', size: 13 },
                          stepSize: 100,
                        },
                        grid: { color: "#f3f4f6" },
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
              </div>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-2 w-full pt-2 sm:pt-4 gap-x-4 sm:gap-x-12 justify-center">
                {(() => {
                  // Calculate highest and lowest from testWiseAvgMarks
                  let highest = 0;
                  let lowest = 0;
                  if (testWiseAvgMarks.length > 0) {
                    highest = Math.max(...testWiseAvgMarks.map(t => t.avg));
                    lowest = Math.min(...testWiseAvgMarks.map(t => t.avg));
                  }
                  return <>
                    <div className="flex flex-col items-center border-r border-gray-200 pr-2 sm:pr-0">
                      <span className="text-gray-500 text-xs sm:text-sm">Avg Highest Score</span>
                      <div className="flex items-center">
                        <span className="text-base sm:text-lg font-semibold">{highest}</span>
                        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-500 text-xs sm:text-sm">Avg Lowest Score</span>
                      <div className="flex items-center">
                        <span className="text-base sm:text-lg font-semibold">{lowest}</span>
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
      <Card className="rounded-2xl border border-gray-250 bg-white w-full mt-4 sm:mt-8 p-3 sm:p-8">
        <div className="flex items-center justify-between pb-2 sm:pb-6 border-b border-gray-200">
          <h2 className="text-base sm:text-xl font-bold text-gray-800">Recent Test Results</h2>
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
  );
}

export default EDashboard;