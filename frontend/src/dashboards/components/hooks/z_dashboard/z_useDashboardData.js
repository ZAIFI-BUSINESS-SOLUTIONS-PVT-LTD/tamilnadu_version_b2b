import { useState, useEffect } from 'react';
import { getStudentDashboardData } from '../../../../utils/api';

// Hook for fetching and managing student dashboard data
export const useStudentDashboardData = () => {
  // State to hold the student dashboard data and loading/error status
  const [dashboardData, setDashboardData] = useState({
    summaryCardsData: [],
    keyInsightsData: {},
    performanceTrendData: {},
    subjectWiseData: {},
    overallTestMarks: {},
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student dashboard data from the API
        const data = await getStudentDashboardData();

        // Handle potential errors from the API
        if (!data || data.error) {
          throw new Error(data?.error || 'Failed to fetch data');
        }

        // Transform performance trend data into a more usable format
        let performanceTrendData = {};
        if (data.performanceTrendDataMapping?.subjects) {
          data.performanceTrendDataMapping.subjects.forEach((subject) => {
            performanceTrendData[subject.name] = subject.tests;
          });
        }

        // Transform subject-wise data into a format suitable for display
        let subjectWiseData = {};
        if (Array.isArray(data.subjectWiseDataMapping)) {
          data.subjectWiseDataMapping.forEach((row) => {
            const testName = row.Test || 'Unknown Test';
            subjectWiseData[testName] = [
              row.Botany || 0,
              row.Chemistry || 0,
              row.Physics || 0,
              row.Zoology || 0,
            ];
          });
        }

        // Compute the overall test marks by summing the subject-wise scores
        const overallTestMarks = Object.keys(subjectWiseData).reduce((acc, testName) => {
          const scores = subjectWiseData[testName] || [];
          const sum = scores.reduce((s, val) => s + val, 0);
          acc[testName] = `${sum}/720`;
          return acc;
        }, {});

        // Update the dashboard data state with the fetched and transformed data
        setDashboardData({
          summaryCardsData: data.summaryCardsData || [],
          keyInsightsData: data.keyInsightsData || {},
          performanceTrendData,
          subjectWiseData,
          overallTestMarks,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        // Update the dashboard data state with the error message
        setDashboardData((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
      }
    };

    // Call the fetchData function when the component mounts
    fetchData();
  }, []); // Empty dependency array ensures this effect runs only once

  // Return the dashboard data state
  return dashboardData;
};

