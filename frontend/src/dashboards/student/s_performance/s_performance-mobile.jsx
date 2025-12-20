import React from 'react';
import { AlertCircle, Atom, FlaskConical, Leaf, PawPrint, Microscope, ChevronDown } from 'lucide-react';
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
import usePerformanceData from '../../components/hooks/s_performance/s_usePerformanceData.js';
import LoadingPage from '../../components/LoadingPage.jsx';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import FilterDrawer from '../../../components/ui/filter-drawer.jsx';
import { Button } from '../../../components/ui/button.jsx';

// Define InsightCard component
const InsightCard = ({ item, insights, className = '' }) => (
  <div
    className={`card bg-white rounded-2xl p-5 transition-all duration-300 shadow-lg
      border border-gray-200 h-full ${className}`}
  >
    <div className="flex flex-col h-full">
      {/* Card Header Section */}
      <div>
        <h3 className="text-primary text-lg font-semibold mb-4 border-b pb-2">
          {item}
        </h3>
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
        pointBackgroundColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBorderWidth: 1,
        pointBorderColor: '#2563eb',
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
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
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
        ticks: { color: '#9ca3af', font: { family: 'Tenorite, sans-serif', size: 13 } },
        border: { width: 0 },
        grid: { display: false }
      },
      y: {
        display: false,
        title: { display: false },
        beginAtZero: true,
        max: (() => {
          const dataMax = Math.max(...(data.length ? data : [100])) || 100;
          const tolerance = Math.max(10, dataMax * 0.15); // Add 15% tolerance, minimum 10 points
          return Math.ceil((dataMax + tolerance) / 10) * 10; // Round up to nearest 10
        })(),
        border: { width: 0 },
        ticks: { color: '#9ca3af', font: { family: 'Tenorite, sans-serif', size: 13 }, stepSize: 10 },
        grid: { display: false }
      }
    },
    layout: { padding: { top: 16, bottom: 8, left: 24, right: 16 } },
    elements: { line: { borderJoinStyle: 'round' }, point: { pointStyle: 'circle' } }
  };

  return (
    <div className="w-full shadow-lg rounded-2xl" style={{ background: 'linear-gradient(to bottom, #374151, #1f2937)' }}>
      <div className="p-3">
        <div className="w-full h-44 mt-2">
          {data.length ? (
            <Line data={chartData} options={options} width={260} height={120} />
          ) : (
            <p className="text-gray-300 text-center py-8">No data available</p>
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
const SPerformanceMobile = () => {
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
    chapterMap,
    topicsMap,
    testLabels,     // Labels for the chart's X-axis (e.g., test names)
    chapterAccuracy, // Raw accuracy data used to derive chapter insights
    chapterIndex,    // Index to access specific chapter accuracy data
    handleSubjectChange, // Handler for subject selection
    handleChapterChange, // Handler for chapter selection
    handleTopicChange,   // Handler for topic selection
    getChapterInsights,  // Function to get insights for the selected chapter
    getTopicInsights,     // Function to get insights for the selected topic
    latestTest,
    updatedChapterFlags,
    updatedTopicFlags,
  } = usePerformanceData();

  // State for filter drawer
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [activePanelKey, setActivePanelKey] = React.useState('chapter');

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
          <AlertCircle className="stroke-current shrink-0 h-6 w-6" />
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

  // Format subject tabs: derive from hook `subjects` with preferred ordering fallback
  const PREFERRED_SUBJECT_ORDER = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
  const orderedSubjects = (Array.isArray(subjects) && subjects.length)
    ? PREFERRED_SUBJECT_ORDER.filter(s => subjects.includes(s)).concat(subjects.filter(s => !PREFERRED_SUBJECT_ORDER.includes(s)))
    : PREFERRED_SUBJECT_ORDER;

  const tabWidthPercent = `${100 / orderedSubjects.length}%`;
  const animateLeft = `${(Math.max(0, orderedSubjects.indexOf(selectedSubject || orderedSubjects[0])) * (100 / orderedSubjects.length))}%`;

  // Panels for the FilterDrawer
  const panels = [
    { key: 'chapter', label: 'Chapter', options: formattedChapterOptions, selected: selectedChapter, onSelect: handleChapterChange },
    {
      key: 'topic',
      label: 'Topic',
      // Provide a function so the drawer can compute topic options dynamically
      options: (localSelections = {}) => {
        const chapterName = localSelections.chapter ?? selectedChapter;
        const chapterIdx = Object.entries(chapterMap || {}).find(([, name]) => name === chapterName)?.[0];
        const topicsForChapter = (topicsMap && topicsMap[chapterIdx]) || {};
        return Object.keys(topicsForChapter).map(t => ({ value: t, label: t, updated: !!updatedTopicFlags?.[chapterIdx]?.[t] }));
      },
      selected: selectedTopic,
      onSelect: handleTopicChange,
    },
  ];

  // --- Main Component Render (Mobile-focused) ---
  return (
    <div className="space-y-3 pb-6 bg-white">
      {/* Header (matches s_swot-mobile style) */}
      <div>
        <div className="flex w-full bg-white px-3 border-b justify-between items-center">
          <div className="text-left py-4">
            <h1 className="text-2xl font-bold text-gray-800">Deep dive - Chapters & Topics</h1>
          </div>
        </div>

        {/* Subject Tabs (mobile) */}
        <div>
          <div className="flex bg-white border-b relative pb-1">
            {orderedSubjects.map((subject) => {
              const shortName = subject === 'Physics'
                ? 'Phy'
                : subject === 'Chemistry'
                  ? 'Chem'
                  : subject === 'Biology'
                    ? 'Bio'
                    : subject === 'Botany'
                      ? 'Bot'
                      : 'Zoo';

              const icon = subject === 'Physics'
                ? <Atom size={16} />
                : subject === 'Chemistry'
                  ? <FlaskConical size={16} />
                  : subject === 'Biology'
                    ? <Microscope size={16} />
                    : subject === 'Botany'
                      ? <Leaf size={16} />
                      : <PawPrint size={16} />;

              const baseBg = subject === 'Physics'
                ? 'bg-cyan-100'
                : subject === 'Chemistry'
                  ? 'bg-violet-100'
                  : subject === 'Biology'
                    ? 'bg-amber-100'
                    : subject === 'Botany'
                      ? 'bg-lime-100'
                      : 'bg-rose-100';

              const activeBg = subject === 'Physics'
                ? 'bg-cyan-200'
                : subject === 'Chemistry'
                  ? 'bg-violet-200'
                  : subject === 'Biology'
                    ? 'bg-amber-200'
                    : subject === 'Botany'
                      ? 'bg-lime-200'
                      : 'bg-rose-200';

              const isSelected = selectedSubject === subject;
              return (
                <button
                  key={subject}
                  onClick={() => handleSubjectChange && handleSubjectChange(subject)}
                  className={`flex-1 pt-2 px-1 text-center text-sm font-medium flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isSelected ? 'text-gray-800' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <div className={`${isSelected ? activeBg : baseBg} rounded-lg p-2 mb-1 transform ${isSelected ? 'scale-105 shadow-md' : 'scale-100'}`}>
                    {icon}
                  </div>
                  <span className={`${isSelected ? 'font-semibold' : 'font-medium'}`}>{shortName}</span>
                </button>
              );
            })}

            <motion.div
              className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full"
              style={{ width: `${100 / (orderedSubjects.length || 1)}%` }}
              animate={{ left: `${(Math.max(0, orderedSubjects.indexOf(selectedSubject || orderedSubjects[0])) * (100 / (orderedSubjects.length || 1)))}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        </div>

        {/* Selected chapter & topic summary (quick view) */}
        <div className="flex flex-col gap-3 px-3 pt-4">
          <button
            type="button"
            onClick={() => { setActivePanelKey('chapter'); setDrawerOpen(true); }}
            className="flex-1 flex items-center justify-between bg-white border-2 border-blue-200 font-bold rounded-2xl px-3 py-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            title={selectedChapter || 'Select chapter'}
          >
            <div className="flex flex-col items-start gap-1">
              <div className="text-xxs text-blue-700 uppercase">Chapter</div>
              <div className="text-sm font-medium text-gray-500 truncate">{selectedChapter || '—'}</div>
            </div>
            <ChevronDown size={16} className="text-blue-200" />
          </button>
        </div>
      </div>

      {/* Performance Panels Section: Chapter and Topic */}
      <div className="grid grid-cols-1 gap-8 items-stretch px-3">
        {/* LEFT COLUMN: Chapter Performance */}
        <div className="flex flex-col h-full space-y-3">
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
          <button
            type="button"
            onClick={() => { setActivePanelKey('topic'); setDrawerOpen(true); }}
            className="flex items-center justify-between bg-white border-2 border-indigo-200 font-bold rounded-2xl px-3 py-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            title={selectedTopic || 'Select topic'}
          >
            <div className="flex flex-col items-start gap-1">
              <div className="text-xxs text-indigo-700 uppercase">Topic</div>
              <div className="text-sm font-medium text-gray-500 truncate">{selectedTopic || '—'}</div>
            </div>
            <ChevronDown size={16} className="text-indigo-200" />
          </button>

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

      {/* Filter Drawer */}
      <FilterDrawer
        open={drawerOpen}
        onOpenChange={(v) => setDrawerOpen(v)}
        panels={panels}
        initialActivePanel={activePanelKey}
        title="Select Chapter & Topic"
      />
    </div>
  );
};

export default SPerformanceMobile;