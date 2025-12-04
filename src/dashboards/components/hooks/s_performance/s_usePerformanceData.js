import { useState, useEffect } from 'react';
import { getStudentPerformanceData, getStudentDashboardData } from '../../../../utils/api';

const usePerformanceData = () => {
  // State to hold the overall performance data
  const [performanceData, setPerformanceData] = useState({});
  // State to hold insights related to student performance
  const [performanceInsights, setPerformanceInsights] = useState({});
  // State to track the loading status of the data fetch
  const [loading, setLoading] = useState(true);

  // State to manage the currently selected subject, chapter, and topic
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [latestTest, setLatestTest] = useState('');

  // useEffect hook to fetch performance data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getStudentPerformanceData();
        const { performanceData: perfData, performanceInsights: perfInsights } = response;

        // Try to fetch dashboard data to determine the student's most recent test
        try {
          const dashboard = await getStudentDashboardData();
          const mapping = dashboard?.subjectWiseDataMapping || [];
          const lastEntry = mapping && mapping.length ? mapping[mapping.length - 1] : null;
          const lastTestName = lastEntry?.Test || '';
          setLatestTest(lastTestName);
        } catch (dashErr) {
          console.warn('Failed to fetch dashboard data for latest test marker', dashErr);
        }

        // Initialize selected subject, chapter, and topic based on the fetched data
        // Prioritize 'Physics' as the default subject if available, otherwise use the first subject
        const availableSubjects = Object.keys(perfData);
        const firstSubject = availableSubjects.includes('Physics') ? 'Physics' : availableSubjects[0];
        const subjectData = perfData[firstSubject];
        const firstChapterIndex = Object.keys(subjectData?.chapter_accuracy || {})[0];
        const firstChapterName = subjectData?.chapter?.[firstChapterIndex];
        const firstTopic = Object.keys(subjectData?.topics?.[firstChapterIndex] || {})[0];

        // Update the state with the fetched data and initial selections
        setPerformanceData(perfData);
        setPerformanceInsights(perfInsights);
        setSelectedSubject(firstSubject);
        setSelectedChapter(firstChapterName);
        setSelectedTopic(firstTopic);
      } finally {
        // Set loading to false once the data fetch is complete
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs only once after the initial render

  // Derived state for subjects
  const subjects = Object.keys(performanceData);
  // Derived state for information related to the selected subject
  const subjectInfo = performanceData[selectedSubject];

  // Derived state for chapter and topic mappings and accuracy
  const chapterMap = subjectInfo?.chapter || {};
  const chapterAccuracy = subjectInfo?.chapter_accuracy || {};
  const topicsMap = subjectInfo?.topics || {};

  // Derived state for chapter options to display in a dropdown
  const chapterOptions = Object.values(chapterMap);
  const updatedChapterFlags = Object.fromEntries(
    Object.entries(chapterMap).map(([idx, name]) => [name, Object.keys(chapterAccuracy[idx] || {}).includes(latestTest)])
  );
  // Derived state to find the index of the selected chapter
  const chapterIndex = Object.entries(chapterMap).find(([, name]) => name === selectedChapter)?.[0];

  // Derived state for topic options based on the selected chapter
  const topicOptions = Object.keys(topicsMap[chapterIndex] || {});
  const updatedTopicFlags = Object.fromEntries(
    Object.entries(topicsMap || {}).map(([cIdx, topics]) => [
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
    const subjectInsights = performanceInsights?.[selectedSubject];
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
    const firstChapterIndex = Object.keys(performanceData[subject]?.chapter_accuracy || {})[0];
    const firstChapterName = performanceData[subject]?.chapter?.[firstChapterIndex];
    const firstTopic = Object.keys(performanceData[subject]?.topics?.[firstChapterIndex] || {})[0];

    setSelectedSubject(subject);
    setSelectedChapter(firstChapterName);
    setSelectedTopic(firstTopic);
  };

  // Handler function to update the selected chapter and reset the topic
  const handleChapterChange = (chapter) => {
    const chapterIdx = Object.entries(chapterMap).find(([, name]) => name === chapter)?.[0];
    const firstTopic = Object.keys(topicsMap[chapterIdx] || {})[0];

    setSelectedChapter(chapter);
    setSelectedTopic(firstTopic);
  };

  // Handler function to update the selected topic
  const handleTopicChange = (topic) => {
    setSelectedTopic(topic);
  };

  // Return all the necessary state and handler functions
  return {
    loading,
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
    latestTest,
    updatedChapterFlags,
    updatedTopicFlags,
    handleSubjectChange,
    handleChapterChange,
    handleTopicChange,
    getChapterInsights,
    getTopicInsights,
  };
};

export default usePerformanceData;