import React from 'react';
import { useEducatorDashboardData } from '../components/hooks/z_dashboard/z_useDashboardData';
import SummaryCards from '../shared/SummaryCard.jsx';
import KeyInsights from '../shared/KeyInsights.jsx';

// Educator Dashboard component to display key metrics and insights
function EDashboard() {
  // Custom hook to fetch educator dashboard data
  const {
    summaryCardsData,
    keyInsightsData,
    isLoading,
    error,
  } = useEducatorDashboardData();

  // Display a loading message while data is being fetched
  if (isLoading) return <div className="text-center py-8">Loading dashboard...</div>;

  // Display an error message if there's an issue fetching data
  if (error) return <div className="text-center py-8 text-error">{error}</div>;

  // Render the dashboard content once data is successfully loaded
  return (
    <div className="space-y-4 pt-12 m-4">
      {/* Component to display summary cards with key metrics */}
      <SummaryCards data={summaryCardsData} />

      {/* Component to display key insights in a grid layout */}
      <KeyInsights data={keyInsightsData} columns={2} />
    </div>
  );
}

export default EDashboard;