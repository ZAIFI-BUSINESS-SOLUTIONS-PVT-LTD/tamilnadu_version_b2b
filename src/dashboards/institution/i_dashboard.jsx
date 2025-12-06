import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Filler } from 'chart.js';
import { getInstitutionEducatorDashboardData, fetchInstitutionEducatorAllStudentResults } from '../../utils/api';
import { Users, Calendar, HelpCircle, Sparkles, ChevronDown } from 'lucide-react';
import Carousel from '../components/ui/carousel';
import Stat from '../components/ui/stat';
import { Card } from '../../components/ui/card.jsx';
import { Tooltip as UITooltip, TooltipTrigger as UITooltipTrigger, TooltipContent as UITooltipContent, TooltipProvider as UITooltipProvider } from '../../components/ui/tooltip.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import { Button } from '../../components/ui/button.jsx';
import EStudentListMock from '../educator/components/e_StudentListMock';
import LoadingPage from '../components/LoadingPage.jsx';
import { useInstitution } from './index.jsx';

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
  const [dashboardData, setDashboardData] = useState({
    summaryCardsData: [],
    keyInsightsData: {},
    isLoading: false,
    error: null,
  });

  const [testWiseAvgMarks, setTestWiseAvgMarks] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('Overall');
  const [rawResults, setRawResults] = useState([]);
  const [overallPerformance, setOverallPerformance] = useState('N/A');
  const [improvementRate, setImprovementRate] = useState('N/A');

  useEffect(() => {
    if (!selectedEducatorId) return;

    const fetchData = async () => {
      setDashboardData(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await getInstitutionEducatorDashboardData(selectedEducatorId);
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
  }, [selectedEducatorId]);

  useEffect(() => {
    if (!selectedEducatorId) return;

    const fetchTestWiseAvg = async () => {
      try {
        const results = await fetchInstitutionEducatorAllStudentResults(selectedEducatorId);
        if (results && Array.isArray(results.results)) {
          const hasField = (field) => results.results.some(r => Object.prototype.hasOwnProperty.call(r, field));
          const subjectKeys = { Overall: 'total_score' };
          if (hasField('phy_score') || hasField('phy_total')) subjectKeys['Physics'] = 'phy_score';
          if (hasField('chem_score') || hasField('chem_total')) subjectKeys['Chemistry'] = 'chem_score';

          const hasBioData = results.results.some(r => (Number(r.bio_score) || 0) > 0 || (Number(r.bio_total) || 0) > 0);
          const hasBotZooData = results.results.some(r => (Number(r.bot_score) || 0) > 0 || (Number(r.bot_total) || 0) > 0 || (Number(r.zoo_score) || 0) > 0 || (Number(r.zoo_total) || 0) > 0);

          if (hasBioData || hasBotZooData) {
            subjectKeys['Biology'] = 'unified_bio';
          }

          if (hasField('bot_score') || hasField('bot_total')) subjectKeys['Botany'] = 'bot_score';
          if (hasField('zoo_score') || hasField('zoo_total')) subjectKeys['Zoology'] = 'zoo_score';
          const avgData = {};
          Object.keys(subjectKeys).forEach(subject => {
            const key = subjectKeys[subject];
            const testMap = {};
            results.results.forEach(r => {
              const testNum = r.test_num;
              let score;
              if (key === 'unified_bio') {
                score = (Number(r.bio_score) || 0) + (Number(r.bot_score) || 0) + (Number(r.zoo_score) || 0);
              } else if (key === 'computed_bio') {
                score = (Number(r.bot_score) || 0) + (Number(r.zoo_score) || 0);
              } else {
                score = Number(r[key]) || 0;
              }
              if (!testMap[testNum]) {
                testMap[testNum] = { total: 0, count: 0, max: score, min: score };
              }
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
                max: max,
                min: min
              }));
          });
          setTestWiseAvgMarks(avgData);
          setRawResults(results.results);
        }
      } catch (err) {
        const dummyData = {
          Overall: [
            { test: 'Test 1', avg: 540, max: 650, min: 400 },
            { test: 'Test 2', avg: 620, max: 720, min: 500 },
            { test: 'Test 3', avg: 480, max: 580, min: 350 },
            { test: 'Test 4', avg: 700, max: 800, min: 600 }
          ]
        };
        setTestWiseAvgMarks(dummyData);
      }
    };
    fetchTestWiseAvg();
  }, [selectedEducatorId]);

  const subjectOptions = useMemo(() => {
    const keys = Object.keys(testWiseAvgMarks || {});
    if (!keys || keys.length === 0) return ['Overall', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
    const others = keys.filter(k => k !== 'Overall');
    const preferredOrder = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
    const ordered = preferredOrder.filter(k => others.includes(k)).concat(others.filter(k => !preferredOrder.includes(k)));
    return ['Overall', ...ordered];
  }, [testWiseAvgMarks]);

  useEffect(() => {
    const keys = Object.keys(testWiseAvgMarks || {});
    if (keys.length === 0) return;
    if (!keys.includes(selectedSubject)) {
      if (keys.includes('Biology')) setSelectedSubject('Biology');
      else setSelectedSubject(keys[0]);
    }
  }, [testWiseAvgMarks, selectedSubject]);

  useEffect(() => {
    if (rawResults.length > 0) {
      const maxTestNum = Math.max(...rawResults.map(r => r.test_num));
      const lastTestResults = rawResults.filter(r => r.test_num === maxTestNum);

      if (lastTestResults.length > 0) {
        const totalScoreSum = lastTestResults.reduce((sum, r) => {
          const score = Number(r.total_score) ||
            ((Number(r.phy_score) || 0) +
              (Number(r.chem_score) || 0) +
              (Number(r.bot_score) || 0) +
              (Number(r.zoo_score) || 0) +
              (Number(r.bio_score) || 0));
          return sum + score;
        }, 0);

        const averageScore = totalScoreSum / lastTestResults.length;
        const percentage = Math.round((averageScore / 720) * 100);
        setOverallPerformance(`${percentage}%`);
      } else {
        setOverallPerformance('N/A');
      }

      const testNums = [...new Set(rawResults.map(r => r.test_num))].sort((a, b) => a - b);
      if (testNums.length >= 2) {
        const lastTestNum = testNums[testNums.length - 1];
        const prevTestNum = testNums[testNums.length - 2];
        const lastResults = rawResults.filter(r => r.test_num === lastTestNum);
        const prevResults = rawResults.filter(r => r.test_num === prevTestNum);

        if (lastResults.length > 0 && prevResults.length > 0) {
          const calculateTestAveragePercentage = (testResults) => {
            const total = testResults.reduce((sum, r) => {
              const score = Number(r.total_score) ||
                ((Number(r.phy_score) || 0) +
                  (Number(r.chem_score) || 0) +
                  (Number(r.bot_score) || 0) +
                  (Number(r.zoo_score) || 0) +
                  (Number(r.bio_score) || 0));
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
        if (!testAttendance[r.test_num]) testAttendance[r.test_num] = new Set();
        testAttendance[r.test_num].add(r.student_id);
      });
      const testNums = Object.keys(testAttendance).map(Number).sort((a, b) => a - b);
      if (testNums.length > 1) {
        const lastTest = testNums[testNums.length - 1];
        const prevTest = testNums[testNums.length - 2];
        const lastCount = testAttendance[lastTest].size;
        const prevCount = testAttendance[prevTest].size;
        const allStudents = new Set(rawResults.map(r => r.student_id));
        percentage = Math.round((lastCount / allStudents.size) * 100);
        change = lastCount - prevCount;
        direction = change > 0 ? 'up' : (change < 0 ? 'down' : 'same');
      } else if (testNums.length === 1) {
        const lastTest = testNums[0];
        const lastCount = testAttendance[lastTest].size;
        const allStudents = new Set(rawResults.map(r => r.student_id));
        percentage = Math.round((lastCount / allStudents.size) * 100);
        change = 0;
        direction = 'same';
      }
    }
    return { percentage, change, direction };
  }, [rawResults]);

  if (!selectedEducatorId) {
    return <div className="text-center py-8 mt-20">Please select an educator to view their dashboard.</div>;
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <LoadingPage fixed={false} className="bg-white/80 dark:bg-gray-900/80 z-10" />
      </div>
    );
  }

  if (error) return <div className="text-center py-8 text-error mt-20">{error}</div>;

  return (
    <UITooltipProvider>
      <div className="mt-12">
        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4 sm:gap-8">
            <div className="grid grid-cols-1 gap-3 sm:gap-6 sm:grid-cols-2">
              <Stat
                icon={ICON_MAPPING.Users}
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
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold ml-1 sm:ml-2 ${isNegative ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
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
              <Stat
                icon={ICON_MAPPING.Calendar}
                label="Attendance"
                info={"Percentage of students who attended the latest test."}
                value={`${attendanceData.percentage}%`}
                badge={attendanceData.direction && attendanceData.direction !== 'same' ? (
                  <UITooltip>
                    <UITooltipTrigger asChild>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2 text-xs sm:text-sm ${attendanceData.direction === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
                ) : attendanceData.direction === 'same' ? (
                  <UITooltip>
                    <UITooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold ml-1 sm:ml-2 text-xs sm:text-sm">
                        No change
                      </span>
                    </UITooltipTrigger>
                    <UITooltipContent sideOffset={6}>No change in student attendance between the last two tests.</UITooltipContent>
                  </UITooltip>
                ) : null}
              />
            </div>

            <div className="w-full">
              <div className="w-full">
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
            <div className="w-full flex flex-col bg-white p-3 sm:p-6 rounded-2xl">
              <div className="w-full flex justify-between items-center mb-0.5 sm:mb-1">
                <span className="text-base sm:text-xl font-semibold text-primary text-left">Class Performance</span>
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

              <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-6">Average marks across all students</p>

              <div className="flex flex-col items-center justify-center w-full mb-3 sm:mb-6 bg-white h-56 sm:h-80">
                {(() => {
                  const currentData = testWiseAvgMarks[selectedSubject] || [];
                  const dataValues = currentData.map(d => d.avg);
                  const maxValue = dataValues.length > 0 ? Math.max(...dataValues) : 50;
                  const minValue = dataValues.length > 0 ? Math.min(...dataValues) : 0;
                  const range = maxValue - minValue;
                  const suggestedMax = Math.ceil((maxValue + range * 0.1) / 10) * 10;
                  const stepSize = Math.ceil(range / 5 / 10) * 10 || 10;

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
                            backgroundColor: 'rgba(15,23,42,0.95)',
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
                                return context[0].label;
                              },
                              label: function (context) {
                                const dataIndex = context.dataIndex;
                                const dataPoint = currentData[dataIndex];
                                if (dataPoint) {
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
                        },
                        scales: {
                          x: {
                            title: { display: false },
                            ticks: { color: "#6b7280", font: { family: 'Tenorite, sans-serif', size: 13 } },
                            border: { width: 0 },
                            grid: { display: false },
                          },
                          y: {
                            title: { display: false },
                            beginAtZero: true,
                            max: suggestedMax,
                            border: { width: 0 },
                            ticks: {
                              color: "#6b7280",
                              font: { family: 'Tenorite, sans-serif', size: 13 },
                              stepSize: stepSize,
                            },
                            grid: { color: "#f3f4f6" },
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
                  const currentData = testWiseAvgMarks[selectedSubject] || [];
                  let highest = 0;
                  let lowest = 0;
                  if (currentData.length > 0) {
                    highest = Math.max(...currentData.map(t => t.avg));
                    lowest = Math.min(...currentData.map(t => t.avg));
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
        <Card className="hidden md:block rounded-2xl border border-gray-250 bg-white w-full mt-4 sm:mt-8 p-3 sm:p-8">
          <div className="flex items-center justify-between pb-2 sm:pb-6 border-b border-gray-200">
            <h2 className="text-base sm:text-xl font-bold text-gray-800">Recent Test Results</h2>
            <Button
              variant="ghost"
              size="sm"
              className="border-gray-300"
              onClick={() => navigate('/institution/students')}
            >
              See All
            </Button>
          </div>
          <EStudentListMock rawResults={rawResults} />
        </Card>
      </div>
    </UITooltipProvider>
  );
}

export default IDashboard;
