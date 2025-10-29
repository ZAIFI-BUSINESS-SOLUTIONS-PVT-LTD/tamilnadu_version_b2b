import React from 'react';
import { Funnel } from '@phosphor-icons/react';
import SelectDropdown from '../../components/ui/dropdown.jsx';
import usePerformanceData from '../../components/hooks/s_performance/s_usePerformanceData';
import PerformanceChart from '../../components/charts/s_performancechaptertopic.jsx';
import InsightCard from './s_insightcard.jsx';
import { Spinner, WarningCircle } from '@phosphor-icons/react'; // Import icons for loading and error

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
    getTopicInsights     // Function to get insights for the selected topic
  } = usePerformanceData();

  // --- Conditional Rendering for Loading and Error States ---

  // Display a loading indicator while performance data is being fetched.
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-base-100 rounded-lg shadow-md">
        <Spinner className="animate-spin h-8 w-8 text-primary mb-3" />
        <div className="text-center text-gray-500">Loading performance data...</div>
      </div>
    );
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
    label: option
  }));

  // Format topic options for the dropdown component.
  const formattedTopicOptions = topicOptions.map(option => ({
    value: option,
    label: option
  }));

  // Format subject options for the dropdown
  const subjectOptions = subjects.map(subject => ({ value: subject, label: subject }));

  // --- Main Component Render ---
  return (
    <div className="space-y-4 pt-12 px-4 pb-4">
      {/* Subject Switcher Section */}
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 border-b border-base-200 pb-4">
        <Funnel className="text-gray-400 w-5 h-5" />
        <span className="text-sm text-gray-400 min-w-max">Subject</span>
        <SelectDropdown
          options={subjectOptions}
          selectedValue={selectedSubject}
          onSelect={handleSubjectChange}
          buttonClassName="btn btn-sm justify-start truncate m-1 flex-grow"
          placeholder="Select Subject" // Added placeholder for clarity
        />
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
            dropdownOptions={formattedChapterOptions} // Options for the chapter selection dropdown
            selectedDropdownValue={selectedChapter} // Currently selected chapter
            onDropdownSelect={handleChapterChange} // Handler for chapter selection
            dropdownLabel="Chapter" // Label for the dropdown
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
            dropdownOptions={formattedTopicOptions} // Options for the topic selection dropdown
            selectedDropdownValue={selectedTopic} // Currently selected topic
            onDropdownSelect={handleTopicChange} // Handler for topic selection
            dropdownLabel="Topic" // Label for the dropdown
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
  );
};

export default SPerformance;