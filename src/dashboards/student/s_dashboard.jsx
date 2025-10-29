import React, { useState } from 'react';
import { useStudentDashboardData } from '../components/hooks/z_dashboard/z_useDashboardData';
import SummaryCards from '../shared/SummaryCard.jsx';
import KeyInsights from '../shared/KeyInsights.jsx';
import PerformanceTrendChart from '../components/charts/s_performancetrend.jsx';
import SubjectWiseAnalysisChart from '../components/charts/s_subjectwiseanalysis.jsx';
import { Spinner, WarningCircle } from '@phosphor-icons/react'; // Importing icons for better UI

/**
 * SDashboard component serves as the main dashboard for a student.
 * It orchestrates the display of various performance metrics and insights
 * by fetching data using the `useStudentDashboardData` hook and rendering
 * it through specialized child components like `SummaryCards`, `KeyInsights`,
 * `PerformanceTrendChart`, and `SubjectWiseAnalysisChart`.
 *
 * It handles loading states and error display to provide a robust user experience.
 */
function SDashboard() {
  // Destructure data, loading state, and error from the custom hook.
  const {
    summaryCardsData,
    keyInsightsData,
    performanceTrendData,
    subjectWiseData,
    subjectWiseDataMapping,
    overallTestMarks, // Although fetched, this variable is not used in the current JSX.
    isLoading,
    error
  } = useStudentDashboardData();

  // State to manage the currently selected subject for the Performance Trend Chart.
  // Initialized as an empty string, default will be set when rendering the chart.
  const [selectedSubjectTrend, setSelectedSubjectTrend] = useState('');

  // State to manage the currently selected test for the Subject-Wise Analysis Chart.
  // Initialized as an empty string, default will be set when rendering the chart.
  const [selectedTest, setSelectedTest] = useState('');

  // --- Conditional Rendering for Loading and Error States ---

  // Display a loading indicator while dashboard data is being fetched.
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-base-100 rounded-lg shadow-md">
        <Spinner className="animate-spin h-8 w-8 text-primary mb-3" />
        <div className="text-center text-gray-500">Loading dashboard...</div>
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
            <h3 className="font-bold">Error loading dashboard!</h3>
            <div className="text-xs">{error}</div> {/* Display the specific error message */}
          </div>
        </div>
      </div>
    );
  }

  const subjectLabels = subjectWiseDataMapping.length > 0 ? Object.keys(subjectWiseDataMapping[0]).filter(key => key !== 'Test') : [];

  // --- Main Dashboard Content ---
  return (
    <div className="space-y-4 pt-12 m-4">
      {/* Section for Summary Cards */}
      <SummaryCards data={summaryCardsData} />

      {/* Section for Key Insights */}
      <KeyInsights data={keyInsightsData} />

      {/* Grid for Charts: Performance Trend and Subject-Wise Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Performance Trend Chart */}
        <PerformanceTrendChart
          // Pass the selected subject; default to the first available subject if none is selected.
          selectedSubject={selectedSubjectTrend || Object.keys(performanceTrendData)[0]}
          setSelectedSubject={setSelectedSubjectTrend}
          performanceData={performanceTrendData}
        />
        {/* Subject-Wise Analysis Chart */}
        <SubjectWiseAnalysisChart
          // Pass the selected test; default to the first available test if none is selected.
          selectedTest={selectedTest || Object.keys(subjectWiseData)[0]}
          setSelectedTest={setSelectedTest}
          testData={subjectWiseData}
          subjectLabels={subjectLabels}
        />
      </div>
    </div>
  );
}

export default SDashboard;