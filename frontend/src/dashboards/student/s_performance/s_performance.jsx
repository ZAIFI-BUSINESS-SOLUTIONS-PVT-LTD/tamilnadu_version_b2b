import React, { useState, useEffect } from 'react';
import { Funnel, WarningCircle } from '@phosphor-icons/react';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
import { getStudentPerformanceData, getStudentDashboardData } from '../../../utils/api';

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

  // useEffect hook to fetch performance data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getStudentPerformanceData();
        const { performanceData: perfData, performanceInsights: perfInsights } = response || {};

        // (debug logs removed)

        // Try to fetch dashboard data to determine the student's most recent test
        try {
          const dashboard = await getStudentDashboardData();
          const mapping = dashboard?.subjectWiseDataMapping || [];
          const lastEntry = mapping && mapping.length ? mapping[mapping.length - 1] : null;
          const lastTestName = lastEntry?.Test || '';
          setLatestTest(lastTestName);
        } catch (dashErr) {
          // non-fatal — we can still render without latest-test markers
          console.warn('Failed to fetch dashboard data for latest test marker', dashErr);
        }

        // Initialize selected subject, chapter, and topic based on the fetched data
        // Prioritize 'Physics' as the default subject if available, otherwise use the first subject
        const availableSubjects = Object.keys(perfData || {});
        const firstSubject = availableSubjects.includes('Physics') ? 'Physics' : availableSubjects[0];
        const subjectData = perfData?.[firstSubject] || {};
        const firstChapterIndex = Object.keys(subjectData?.chapter_accuracy || {})[0];
        const firstChapterName = subjectData?.chapter?.[firstChapterIndex];
        const firstTopic = Object.keys(subjectData?.topics?.[firstChapterIndex] || {})[0];

        // Update the state with the fetched data and initial selections
        setPerformanceData(perfData || {});
        setPerformanceInsights(perfInsights || {});
        setSelectedSubject(firstSubject || '');
        setSelectedChapter(firstChapterName || '');
        setSelectedTopic(firstTopic || '');
      } catch (err) {
        setError(err?.message || String(err));
      } finally {
        // Set loading to false once the data fetch is complete
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs only once after the initial render

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
import LoadingPage from '../../components/LoadingPage.jsx';
import SPerformanceMobile from './s_performance-mobile.jsx';

// Define InsightCard component
const InsightCard = ({ title, item, insights, className = '' }) => (
  <div
    className={`card bg-white rounded-2xl p-5 transition-all duration-300 
      border border-gray-200 h-full ${className}`}
  >
    <div className="flex flex-col h-full">
      {/* Card Header Section */}
      <div>
        <h3 className="text-primary text-lg font-semibold mb-4 border-b pb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Detailed analysis for{' '}
          <span className="font-semibold text-gray-800">{item}</span>:
        </p>
      </div>

      {/* Insights List Section (occupies remaining vertical space) */}
      <div className="flex-grow">
        <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm leading-relaxed">
          {insights.length > 0 ? (
            // Render each insight if the array is not empty  
            insights.map((insight, idx) => (
              <li key={idx} className="hover:text-primary transition-colors duration-200">
                {insight}
              </li>
            ))
          ) : (
            // Display a fallback message if no insights are available
            <li className="text-gray-500">No insights available</li>
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

  // Chart options configuration
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
        ticks: { color: '#6b7280', font: { family: 'Tenorite, sans-serif', size: 13 } },
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
        ticks: { color: '#6b7280', font: { family: 'Tenorite, sans-serif', size: 13 }, stepSize: 10 },
        grid: { color: '#f3f4f6' }
      }
    },
    layout: { padding: { top: 16, bottom: 8, left: 24, right: 16 } },
    elements: { line: { borderJoinStyle: 'round' }, point: { pointStyle: 'circle' } }
  };

  return (
    <div className="rounded-2xl border border-gray-250 bg-gray-100 flex flex-col items-start justify-start sm:p-0 p-2">
      {/* Title & Chart Container */}
      <div className="w-full flex flex-col bg-white p-3 sm:p-6 rounded-2xl">
        {/* Title Container */}
        <div className="w-full flex flex-col items-start justify-start gap-0 mb-0.5 sm:mb-1">
          <span className="text-lg sm:text-lg font-bold text-primary">{title}</span>
          <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-6">Performance analysis across tests</p>
        </div>

        {/* Area Chart Container */}
        <div className="flex flex-col items-center justify-center w-full mb-3 sm:mb-6 bg-white h-56 sm:h-80 border border-gray-200 rounded-lg">
          {data.length ? (
            <Line data={chartData} options={options} width={260} height={140} />
          ) : (
            <p className="text-gray-500">No data available</p>
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

  // Display a loading indicator while performance data is being fetched.
  if (loading) {
    return <LoadingPage />;
  }

  // Display an error message if data fetching failed.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-4 bg-base-100 rounded-lg shadow-md">
        <div className="alert alert-error max-w-md shadow-lg">
          <WarningCircle className="stroke-current shrink-0 h-6 w-6" weight="bold" />
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
          {/* Filter Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 bg-white shadow-lg p-4 rounded-xl">
            <Funnel className="hidden sm:block text-gray-400 w-5 h-5 mt-1 sm:mt-0" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full overflow-x-hidden">
              <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-2">
                <span className="text-sm text-gray-400 min-w-max">Subject</span>
                <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                  <SelectTrigger className="btn btn-sm justify-start truncate overflow-hidden text-ellipsis w-70 sm:w-fit text-start">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-2">
                <span className="text-sm text-gray-400 min-w-max">Chapter</span>
                <Select value={selectedChapter} onValueChange={handleChapterChange}>
                  <SelectTrigger className="btn btn-sm justify-start truncate overflow-hidden text-ellipsis w-70 sm:w-fit text-start">
                    <SelectValue placeholder="Select Chapter" />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>
              <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-2">
                <span className="text-sm text-gray-400 min-w-max">Topic</span>
                <Select value={selectedTopic} onValueChange={handleTopicChange}>
                  <SelectTrigger className="btn btn-sm justify-start truncate overflow-hidden text-ellipsis w-70 sm:w-fit text-start">
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent>
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