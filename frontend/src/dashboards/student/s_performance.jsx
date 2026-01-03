import React, { useState, useEffect } from 'react';
import { CircleAlert } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import useStudentDashboard, { useStudentPerformance } from '../../hooks/useStudentData';

// Inlined hook originally from
// src/dashboards/components/hooks/s_performance/s_usePerformanceData.js
const usePerformanceData = () => {
  // State to hold the overall performance data
  const [performanceData, setPerformanceData] = useState({});
  // State to hold insights related to student performance
  const [performanceInsights, setPerformanceInsights] = useState({});
  // State to track the loading status of the data fetch
  const [loading, setLoading] = useState(true);
  // State to track error
  const [error, setError] = useState(null);

  // State to manage the currently selected subject, chapter, and topic
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  // Latest test identifier (e.g., 'Test9') from dashboard data
  const [latestTest, setLatestTest] = useState('');

  // Use cached queries
  const perfQuery = useStudentPerformance();
  const dashboardQuery = useStudentDashboard();

  // when performance data loads, populate local state
  useEffect(() => {
    try {
      const response = perfQuery.data || {};
      const { performanceData: perfData, performanceInsights: perfInsights } = response || {};

      const availableSubjects = Object.keys(perfData || {});
      const firstSubject = availableSubjects.includes('Physics') ? 'Physics' : availableSubjects[0];
      const subjectData = perfData?.[firstSubject] || {};
      const firstChapterIndex = Object.keys(subjectData?.chapter_accuracy || {})[0];
      const firstChapterName = subjectData?.chapter?.[firstChapterIndex];
      const firstTopic = Object.keys(subjectData?.topics?.[firstChapterIndex] || {})[0];

      setPerformanceData(perfData || {});
      setPerformanceInsights(perfInsights || {});
      setSelectedSubject(firstSubject || '');
      setSelectedChapter(firstChapterName || '');
      setSelectedTopic(firstTopic || '');
      if (perfQuery.error) setError(perfQuery.error?.message || perfQuery.error);
    } catch (err) {
      setError(err?.message || String(err));
    }
  }, [perfQuery.data, perfQuery.error]);

  // Derive latestTest from cached dashboard mapping when available
  useEffect(() => {
    try {
      const mapping = dashboardQuery.data?.subjectWiseDataMapping || [];
      const lastEntry = mapping && mapping.length ? mapping[mapping.length - 1] : null;
      const lastTestName = lastEntry?.Test || '';
      setLatestTest(lastTestName);
      if (dashboardQuery.error) console.warn('Dashboard query error', dashboardQuery.error);
    } catch (e) {
      console.warn('Failed to derive latest test from dashboard query', e);
    }
  }, [dashboardQuery.data, dashboardQuery.error]);

  // Set loading flag based on query states
  useEffect(() => {
    setLoading(Boolean(perfQuery.isLoading || dashboardQuery.isLoading));
  }, [perfQuery.isLoading, dashboardQuery.isLoading]);

  // Derived state for subjects — enforce preferred ordering while preserving extras
  const PREFERRED_SUBJECT_ORDER = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
  const _allSubjects = Object.keys(performanceData || {}).filter(Boolean);
  const subjects = PREFERRED_SUBJECT_ORDER.filter(s => _allSubjects.includes(s))
    .concat(_allSubjects.filter(s => !PREFERRED_SUBJECT_ORDER.includes(s)));
  // Derived state for information related to the selected subject
  const subjectInfo = performanceData[selectedSubject] || {};

  // Derived state for chapter and topic mappings and accuracy
  // If performanceData is missing chapter/topic info for a subject, fall back to performanceInsights maps
  const chapterMap = subjectInfo?.chapter || {};
  const chapterAccuracy = subjectInfo?.chapter_accuracy || {};
  const topicsMap = subjectInfo?.topics || {};

  const insightsChapterMap = performanceInsights?.[selectedSubject]?.chapter || {};
  const insightsTopicMap = performanceInsights?.[selectedSubject]?.topic_insights || {};

  // Helper to check if chapter names are valid (not empty, not "[]", etc.)
  const hasValidChapterNames = (chapterObj) => {
    const values = Object.values(chapterObj || {});
    return values.length > 0 && values.every(name =>
      name && typeof name === 'string' && name.trim() !== '' && name !== '[]'
    );
  };

  // Effective chapter/topic maps used by the UI (prefer performanceData IF valid, otherwise fall back to insights)
  const chapterMapEffective = hasValidChapterNames(chapterMap) ? chapterMap : insightsChapterMap || {};
  const topicsMapEffective = (hasValidChapterNames(chapterMap) && Object.keys(topicsMap || {}).length)
    ? topicsMap
    : // convert insightsTopicMap (which may be { chapterIdx: { topicName: [...] } }) into a compatible shape
    Object.fromEntries(Object.entries(insightsTopicMap || {}).map(([cIdx, topicsObj]) => [cIdx, topicsObj || {}]));

  // Derived state for chapter options to display in a dropdown
  const chapterOptions = Object.values(chapterMapEffective).filter(Boolean);
  // Map of chapterName -> boolean indicating whether this chapter was updated in latest test
  // Use the effective chapter map (validated / fallback) so flags align with displayed names
  const updatedChapterFlags = Object.fromEntries(
    Object.entries(chapterMapEffective).map(([idx, name]) => [name, Object.keys(chapterAccuracy[idx] || {}).includes(latestTest)])
  );
  // Derived state to find the index of the selected chapter
  const chapterIndex = Object.entries(chapterMapEffective).find(([, name]) => name === selectedChapter)?.[0];

  // Derived state for topic options based on the selected chapter
  const rawTopicEntry = topicsMapEffective[chapterIndex] || {};
  const topicOptions = Array.isArray(rawTopicEntry)
    ? rawTopicEntry.filter(Boolean)
    : Object.keys(rawTopicEntry || {}).filter(Boolean);
  // Map of chapterIndex -> { topicName: boolean } indicating whether topic was updated in latest test
  const updatedTopicFlags = Object.fromEntries(
    Object.entries(topicsMapEffective || {}).map(([cIdx, topics]) => [
      cIdx,
      Object.fromEntries(Object.keys(topics || {}).map(tName => [tName, Object.keys(topics?.[tName] || {}).includes(latestTest)]))
    ])
  );
  // Derived state for chapter-wise accuracy data for visualization
  const chapterData = Object.values(chapterAccuracy[chapterIndex] || {});
  // Derived state for topic-wise performance data
  const topicData = Object.values(topicsMap[chapterIndex]?.[selectedTopic] || {});
  // Derived state for test labels within the selected topic
  const testLabels = Object.keys(topicsMap[chapterIndex]?.[selectedTopic] || {});

  // Function to retrieve insights for the selected chapter
  const getChapterInsights = () => {
    const subjectInsights = performanceInsights?.[selectedSubject] || {};
    const chapterNameMap = subjectInsights?.chapter || {};
    const insightsMap = subjectInsights?.chapter_insights || {};

    // Find the index of the selected chapter in the insights map
    const matchedEntry = Object.entries(chapterNameMap).find(
      ([, chapName]) => chapName?.toLowerCase()?.trim() === selectedChapter?.toLowerCase()?.trim()
    );
    const matchedIndex = matchedEntry?.[0];

    // Return the insights for the matched chapter, or an empty array if not found
    return insightsMap?.[matchedIndex] || [];
  };

  // Function to retrieve insights for the selected topic
  const getTopicInsights = () => {
    const chapterNameMap = performanceInsights?.[selectedSubject]?.chapter || {};
    const topicInsightsMap = performanceInsights?.[selectedSubject]?.topic_insights || {};

    // Find the index of the chapter containing the selected topic
    const matchedChapterIndex = Object.entries(chapterNameMap).find(
      ([, name]) => name?.toLowerCase()?.trim() === selectedChapter?.toLowerCase()?.trim()
    )?.[0];

    // Get the topic insights for the matched chapter
    const chapterTopicInsights = matchedChapterIndex ? topicInsightsMap[matchedChapterIndex] || {} : {};

    // Find the insights for the selected topic within the chapter
    const matchedTopicEntry = Object.entries(chapterTopicInsights).find(
      ([topic]) => topic?.toLowerCase()?.trim() === selectedTopic?.toLowerCase()?.trim()
    );

    // Return the insights for the matched topic, or an empty array if not found
    return matchedTopicEntry?.[1] || [];
  };

  // Handler function to update the selected subject and reset chapter and topic
  const handleSubjectChange = (subject) => {
    // Prefer performanceData, fall back to performanceInsights for chapter/topic lists
    const subjPerf = performanceData[subject] || {};
    const subjInsights = performanceInsights?.[subject] || {};

    const effectiveChapterMap = hasValidChapterNames(subjPerf.chapter)
      ? subjPerf.chapter
      : subjInsights.chapter || {};

    const effectiveTopicsMap = (hasValidChapterNames(subjPerf.chapter) && Object.keys(subjPerf.topics || {}).length)
      ? subjPerf.topics
      : // convert insights topic_insights into compatible shape if necessary
      (subjInsights.topic_insights && Object.fromEntries(Object.entries(subjInsights.topic_insights).map(([k, v]) => [k, v || {}]))) || {};

    const firstChapterIndex = Object.keys(effectiveChapterMap || {})[0];
    const firstChapterName = effectiveChapterMap?.[firstChapterIndex];

    const rawFirstTopicEntry = effectiveTopicsMap?.[firstChapterIndex] || {};
    const firstTopic = Array.isArray(rawFirstTopicEntry)
      ? rawFirstTopicEntry.filter(Boolean)[0]
      : Object.keys(rawFirstTopicEntry || {})[0];

    setSelectedSubject(subject);
    setSelectedChapter(firstChapterName || '');
    setSelectedTopic(firstTopic || '');
  };

  // Handler function to update the selected chapter and reset the topic
  const handleChapterChange = (chapter) => {
    // Use effective maps so chapters from insights are respected
    const chapterIdx = Object.entries(chapterMapEffective).find(([, name]) => name === chapter)?.[0];
    const rawFirstTopicEntry = topicsMapEffective[chapterIdx] || {};
    const firstTopic = Array.isArray(rawFirstTopicEntry)
      ? rawFirstTopicEntry.filter(Boolean)[0]
      : Object.keys(rawFirstTopicEntry || {})[0];

    setSelectedChapter(chapter);
    setSelectedTopic(firstTopic || '');
  };

  // Handler function to update the selected topic
  const handleTopicChange = (topic) => {
    setSelectedTopic(topic);
  };

  // Return all the necessary state and handler functions
  return {
    loading,
    error,
    subjects,
    selectedSubject,
    selectedChapter,
    selectedTopic,
    chapterData,
    topicData,
    chapterOptions,
    topicOptions,
    testLabels,
    chapterAccuracy,
    chapterIndex,
    chapterMap,
    topicsMap,
    performanceInsights,
    handleSubjectChange,
    handleChapterChange,
    handleTopicChange,
    getChapterInsights,
    getTopicInsights,
    latestTest,
    updatedChapterFlags,
    updatedTopicFlags,
  };
};
import LoadingPage from '../components/LoadingPage.jsx';
import SPerformanceMobile from './s_performance-mobile.jsx';

// Define InsightCard component (theme-aware)
const InsightCard = ({ title, item, insights, className = '' }) => (
  <div
    className={`rounded-2xl border border-border bg-card p-5 transition-all duration-300 h-full ${className}`}
  >
    <div className="flex flex-col h-full">
      {/* Card Header Section */}
      <div>
        <h3 className="text-foreground text-lg font-semibold mb-4 border-b border-border pb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Detailed analysis for{' '}
          <span className="font-semibold text-foreground">{item}</span>:
        </p>
      </div>

      {/* Insights List Section (occupies remaining vertical space) */}
      <div className="flex-grow">
        <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-muted-foreground">
          {insights.length > 0 ? (
            // Render each insight if the array is not empty
            insights.map((insight, idx) => (
              <li key={idx} className="hover:text-primary transition-colors duration-200">
                {insight}
              </li>
            ))
          ) : (
            // Display a fallback message if no insights are available
            <li className="text-muted-foreground">No insights available</li>
          )}
        </ul>
      </div>
    </div>
  </div>
);

// Define PerformanceChart component
// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceChart = ({
  title,
  data,
  labels,
}) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  // Chart data configuration
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Accuracy',
        data,
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
    ],
  };

  const tooltipColors = isDark
    ? { backgroundColor: '#0b1220', titleColor: '#ffffff', bodyColor: '#e5e7eb', borderColor: '#1f2937' }
    : { backgroundColor: '#ffffffff', titleColor: '#374151', bodyColor: '#374151', borderColor: '#d1d5db' };

  // Chart options configuration
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        ...tooltipColors,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { family: 'Tenorite, sans-serif', size: 14 },
        bodyFont: { family: 'Tenorite, sans-serif', size: 13 },
        mode: 'index',
        intersect: false
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
        ticks: { color: isDark ? '#cbd5e1' : '#6b7280', font: { family: 'Tenorite, sans-serif', size: 13 } },
        border: { width: 0 },
        grid: { display: false }
      },
      y: {
        title: { display: false },
        beginAtZero: true,
        max: (() => {
          const dataMax = Math.max(...(data.length ? data : [100])) || 100;
          const tolerance = Math.max(10, dataMax * 0.15); // Add 15% tolerance, minimum 10 points
          return Math.ceil((dataMax + tolerance) / 10) * 10; // Round up to nearest 10
        })(),
        border: { width: 0 },
        ticks: { color: isDark ? '#cbd5e1' : '#6b7280', font: { family: 'Tenorite, sans-serif', size: 13 }, stepSize: 10 },
        grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }
      }
    },
    layout: { padding: { top: 16, bottom: 8, left: 24, right: 16 } },
    elements: { line: { borderJoinStyle: 'round' }, point: { pointStyle: 'circle' } }
  };

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col items-start justify-start sm:p-0 p-2">
      {/* Title & Chart Container */}
      <div className="w-full flex flex-col p-3 sm:p-6 rounded-2xl">
        {/* Title Container */}
        <div className="w-full flex flex-col items-start justify-start gap-0 mb-0.5 sm:mb-1">
          <span className="text-lg sm:text-lg font-bold text-foreground">{title}</span>
          <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-6">Performance analysis across tests</p>
        </div>

        {/* Area Chart Container */}
        <div className="flex flex-col items-center justify-center w-full mb-3 sm:mb-6 bg-card h-56 sm:h-80 border border-border rounded-lg">
          {data.length ? (
            <Line data={chartData} options={options} width={260} height={140} />
          ) : (
            <p className="text-muted-foreground">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * SPerformance component displays student performance data across subjects, chapters, and topics.
 * It leverages `usePerformanceData` to manage data fetching and state, and presents the
 * information using `PerformanceChart` for visual representation and `InsightCard` for textual analysis.
 *
 * Provides interactive selection for subjects, chapters, and topics to drill down into performance.
 */
const SPerformance = () => {
  // Destructure properties and functions from the custom performance data hook.
  const {
    loading,
    error, // Assuming usePerformanceData can return an error state
    subjects,
    selectedSubject,
    selectedChapter,
    selectedTopic,
    chapterData, // Data for the chapter performance chart
    topicData,   // Data for the topic performance chart
    chapterOptions, // Available chapters for the dropdown
    topicOptions,   // Available topics for the dropdown
    testLabels,     // Labels for the chart's X-axis (e.g., test names)
    chapterAccuracy, // Raw accuracy data used to derive chapter insights
    chapterIndex,    // Index to access specific chapter accuracy data
    handleSubjectChange, // Handler for subject selection
    handleChapterChange, // Handler for chapter selection
    handleTopicChange,   // Handler for topic selection
    getChapterInsights,  // Function to get insights for the selected chapter
    getTopicInsights,    // Function to get insights for the selected topic
    latestTest,
    updatedChapterFlags,
    updatedTopicFlags,
  } = usePerformanceData();

  // --- Conditional Rendering for Loading and Error States ---

  // Display a loading overlay while performance data is being fetched (match i_dashboard behaviour).
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <LoadingPage fixed={false} className="bg-white/80 dark:bg-gray-900/80 z-10" />
      </div>
    );
  }

  // Display an error message if data fetching failed.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-4 bg-base-100 rounded-lg shadow-md">
        <div className="alert alert-error max-w-md shadow-lg">
          <CircleAlert className="stroke-current shrink-0 h-6 w-6" weight="bold" />
          <div>
            <h3 className="font-bold">Error loading performance data!</h3>
            <div className="text-xs">{error}</div> {/* Display the specific error message */}
          </div>
        </div>
      </div>
    );
  }

  // Format chapter options for the dropdown component (assuming it expects { value, label } objects).
  const formattedChapterOptions = chapterOptions.map(option => ({
    value: option,
    label: option,
    updated: !!updatedChapterFlags?.[option]
  }));

  // Format topic options for the dropdown component.
  const formattedTopicOptions = topicOptions.map(option => ({
    value: option,
    label: option,
    updated: !!updatedTopicFlags?.[chapterIndex]?.[option]
  }));

  // Format subject options for the dropdown
  const subjectOptions = subjects.map(subject => ({ value: subject, label: subject }));

  // --- Main Component Render ---
  return (
    <>
      {/* Mobile: render the mobile-optimised component only on small screens */}
      <div className="block md:hidden">
        <SPerformanceMobile />
      </div>

      {/* Desktop / tablet: keep existing layout for md+ screens */}
      <div className="hidden md:block">
        <div className="space-y-4 pt-6 sm:pt-12 px-4 pb-4">
          {/* Header and selector controls */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground">Chapter & Topics Analysis</h2>
              <p className="text-sm text-muted-foreground">Track accuracy trends across chapters and topics.</p>
            </div>
            <div className="flex items-start gap-4 flex-wrap justify-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-max pl-1">Subject</span>
                <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                  <SelectTrigger title={selectedSubject} className="m-1 w-full lg:w-auto max-w-[220px] overflow-hidden truncate justify-start text-start bg-card border border-border">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent side="bottom" align="end">
                    {subjectOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-sm text-muted-foreground min-w-max pl-1">Chapter</span>
                <Select value={selectedChapter} onValueChange={handleChapterChange}>
                  <SelectTrigger title={selectedChapter} className="m-1 w-full lg:w-auto max-w-[220px] overflow-hidden truncate justify-start text-start bg-card border border-border">
                    <SelectValue placeholder="Select Chapter" />
                  </SelectTrigger>
                  <SelectContent side="bottom" align="end">
                    {formattedChapterOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{opt.label}</span>
                          {opt.updated && (
                            <span aria-hidden className="ml-3 inline-block w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-sm text-muted-foreground min-w-max pl-1">Topic</span>
                <Select value={selectedTopic} onValueChange={handleTopicChange}>
                  <SelectTrigger title={selectedTopic} className="m-1 w-full lg:w-auto max-w-[220px] overflow-hidden truncate justify-start text-start bg-card border border-border">
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent side="bottom" align="end">
                    {formattedTopicOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{opt.label}</span>
                          {opt.updated && (
                            <span aria-hidden className="ml-3 inline-block w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Performance Panels Section: Chapter and Topic */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* LEFT COLUMN: Chapter Performance */}
            <div className="flex flex-col h-full space-y-4">
              {/* Chapter Performance Chart */}
              <PerformanceChart
                title="Chapter Performance"
                data={chapterData} // Data points for the chart line
                labels={Object.keys(chapterAccuracy[chapterIndex] || {})} // Labels for the X-axis (e.g., "Test 1", "Test 2")
              />

              {/* Chapter Insights Card */}
              <InsightCard
                className="flex-grow" // Ensures the card expands to fill available height
                title="Chapter Insights"
                item={selectedChapter} // The chapter name as the item for insights
                insights={getChapterInsights()} // Dynamic insights for the selected chapter
              />
            </div>

            {/* RIGHT COLUMN: Topic Performance */}
            <div className="flex flex-col h-full space-y-4">
              {/* Topic Performance Chart */}
              <PerformanceChart
                title="Topic Performance"
                data={topicData} // Data points for the chart line
                labels={testLabels} // Labels for the X-axis (e.g., "Test 1", "Test 2")
              />

              {/* Topic Insights Card */}
              <InsightCard
                className="flex-grow" // Ensures the card expands to fill available height
                title="Topic Insights"
                item={selectedTopic} // The topic name as the item for insights
                insights={getTopicInsights()} // Dynamic insights for the selected topic
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SPerformance;