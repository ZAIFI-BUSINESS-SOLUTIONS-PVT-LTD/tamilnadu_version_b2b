import { useState, useEffect } from 'react';

// Custom hook to fetch and manage SWOT analysis data
const useSwotData = (fetchSwotData, fetchAvailableTestsData) => {
  // State for the currently selected subject
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  // State for the currently selected test
  const [selectedTest, setSelectedTest] = useState('Overall');
  // State to hold the list of available tests
  const [availableTests, setAvailableTests] = useState(['Overall']);
  // State to store the organized SWOT data
  const [swotData, setSwotData] = useState({});
  // State to track the loading status of the data fetch
  const [loading, setLoading] = useState(true);

  // useEffect hook to load the list of available tests on component mount
  useEffect(() => {
    const loadAvailableTests = async () => {
      try {
        // Fetch the available test numbers
        const tests = await fetchAvailableTestsData();
        // Filter out duplicate test numbers and remove any '0' values
        const uniqueTests = [...new Set(tests)].filter((num) => num !== 0);
        // Format the test numbers into displayable strings
        const formatted = ['Overall', ...uniqueTests.map((num) => `Test ${num}`)];
        // Update the availableTests state
        setAvailableTests(formatted);
      } catch (error) {
        console.error('Error loading available tests:', error);
        // Optionally set an error state here if needed
      }
    };

    loadAvailableTests();
  }, [fetchAvailableTestsData]); // Fetch available tests only once on mount

  // useEffect hook to fetch SWOT data whenever the selected test changes
  useEffect(() => {
    const fetchSwot = async () => {
      setLoading(true);
      try {
        // Determine the test number to fetch (0 for 'Overall')
        const testNum = selectedTest === 'Overall' ? 0 : parseInt(selectedTest.split(' ')[1]);
        // Fetch the SWOT data for the selected test
        const response = await fetchSwotData(testNum);
        // If the response is successful and contains SWOT data
        if (!response?.error && response?.swot) {
          // Organize the raw SWOT data into a more structured format
          const formatted = organizeSwotData(response.swot);
          // Update the swotData state
          setSwotData(formatted);
        } else if (response?.error) {
          console.error('Error fetching SWOT data:', response.error);
          setSwotData({}); // Clear previous data on error
          // Optionally set an error state here if needed
        } else {
          setSwotData({}); // Clear data if no SWOT data is present
        }
      } catch (error) {
        console.error('Error fetching SWOT data:', error);
        setSwotData({}); // Clear previous data on error
        // Optionally set an error state here if needed
      } finally {
        setLoading(false);
      }
    };

    fetchSwot();
  }, [selectedTest, fetchSwotData]); // Fetch SWOT data when selectedTest changes

  // Function to organize the raw SWOT data into a subject-wise structure
  const organizeSwotData = (rawData) => {
    const organized = {};
    for (const metric in rawData) {
      const subjectMap = rawData[metric];
      // Look up the category, title, and description for the current metric
      const [category, title, description] = metricToCategoryMap[metric] || [];
      // Skip if the category is not found in the mapping
      if (!category) continue;

      for (const subject in subjectMap) {
        // Initialize the subject's SWOT categories if they don't exist
        if (!organized[subject]) {
          organized[subject] = {
            Strengths: [],
            Weaknesses: [],
            Opportunities: [],
            Threats: [],
          };
        }
        // Push the SWOT item into the appropriate subject and category
        organized[subject][category].push({
          title,
          description,
          topics: subjectMap[subject],
        });
      }
    }
    return organized;
  };

  // Return the state variables and setter functions for external use
  return {
    selectedSubject,
    setSelectedSubject,
    selectedTest,
    setSelectedTest,
    availableTests,
    swotData,
    loading,
  };
};

// Mapping of API metric keys to SWOT categories, titles, and descriptions
const metricToCategoryMap = {
  TS_BPT: ['Strengths', 'Best Performing Topics', 'Areas where the student excels:'],
  TS_IOT: ['Strengths', 'Improvement Over Time', 'Topics showing noticeable progress:'],
  TS_SQT: ['Strengths', 'Strongest Question Types', 'Excels in answering specific types of questions:'],
  TW_MCT: ['Weaknesses', 'Most Challenging Topics', 'Topics where the student has struggled:'],
  TW_WOT: ['Weaknesses', 'Weakness Over Time', 'Topics that haven’t improved:'],
  TW_LRT: ['Weaknesses', 'Low Retention Topics', 'Topics with lower retention and recall:'],
  TO_PR: ['Opportunities', 'Practice Recommendations', 'Suggested practice areas:'],
  TO_MO: ['Opportunities', 'Missed Opportunities', 'Topics to review for better consistency:'],
  TO_RLT: ['Opportunities', 'Rapid Learning Topics', 'Topics that can be quickly improved with targeted practice:'],
  TT_RMCG: ['Threats', 'Recurring Mistakes & Conceptual Gaps', 'Repeated errors observed in:'],
  TT_WHIT: ['Threats', 'Weakness on High Impact Topics', 'Underperformance in critical areas:'],
  TT_IP: ['Threats', 'Inconsistent Performance', 'Areas where performance is erratic:'],
};

export default useSwotData;