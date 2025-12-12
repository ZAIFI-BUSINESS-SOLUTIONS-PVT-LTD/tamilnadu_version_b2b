import React from 'react';
import { CheckCircle, AlertCircle, Filter, Target, Zap, Atom, FlaskConical, Microscope, Leaf, PawPrint, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchEducatorSWOT, fetchAvailableSwotTests_Educator } from '../../utils/api';
import LoadingPage from '../components/LoadingPage.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '../../components/ui/select.jsx';
import { Button } from '../../components/ui/button.jsx';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
import { useState, useEffect } from 'react';

// Preferred ordering for subjects. The dropdown will show subjects
// present in the fetched SWOT data in this order when possible.
const PREFERRED_SUBJECT_ORDER = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];

// Custom hook to fetch and manage SWOT analysis data
const useSwotData = (fetchSwotData, fetchAvailableTestsData) => {
  // State for the currently selected subject
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  // State for the currently selected test
  const [selectedTest, setSelectedTest] = useState('');
  // State to hold the list of available tests
  const [availableTests, setAvailableTests] = useState([]);
  // State to store the organized SWOT data
  const [swotData, setSwotData] = useState({});
  // State to track the loading status of the data fetch
  const [loading, setLoading] = useState(true);

  // useEffect hook to load the list of available tests on component mount
  useEffect(() => {
    const loadAvailableTests = async () => {
      try {
        // Fetch the available test numbers (these are zero-based IDs coming from the API)
        const tests = await fetchAvailableTestsData();
        // Remove duplicates but DO NOT drop 0 — 0 is a valid test id (maps to display "Overall")
        const uniqueTests = [...new Set(tests)];
        // Sort the unique tests: Overall (0) first, then descending order for others
        uniqueTests.sort((a, b) => {
          if (a === 0) return -1;
          if (b === 0) return 1;
          return b - a;
        });
        // Format the test numbers into displayable strings where display = 'Overall' for id 0, or 'Test X' where X = id for id > 0
        const formatted = uniqueTests.map((num) => num === 0 ? 'Overall' : `Test ${num}`);
        // Update the availableTests state
        setAvailableTests(formatted);
        // Set selectedTest to the first available test if not set
        if (!selectedTest && formatted.length > 0) {
          setSelectedTest(formatted[0]);
        }
      } catch (error) {
        console.error('Error loading available tests:', error);
        // Optionally set an error state here if needed
      }
    };

    loadAvailableTests();
  }, [fetchAvailableTestsData]); // Fetch available tests only once on mount

  // Set selectedTest to first available test if not set
  useEffect(() => {
    if (!selectedTest && availableTests.length > 0) {
      setSelectedTest(availableTests[0]);
    }
  }, [availableTests, selectedTest]);

  // useEffect hook to fetch SWOT data whenever the selected test changes
  useEffect(() => {
    if (!selectedTest) return;

    const fetchSwot = async () => {
      setLoading(true);
      try {
        // Determine the test number to fetch.
        // Display labels are 'Overall' for api_id 0, or 'Test X' where X = api_id for api_id > 0
        let testNum;
        if (selectedTest === 'Overall') {
          testNum = 0;
        } else {
          const parsed = parseInt(selectedTest.split(' ')[1], 10);
          testNum = Number.isNaN(parsed) ? null : parsed;
        }
        if (testNum === null) {
          console.error('Invalid selectedTest format, cannot determine test number:', selectedTest);
          setSwotData({});
          setLoading(false);
          return;
        }
        // Fetch the SWOT data for the selected test
        const response = await fetchSwotData(testNum);
        // Print the full response so developers can inspect every field returned
        // by the backend (useful for debugging / exploring the API payload).
        // The API helper `fetchEducatorSWOT` itself also logs response.data, but
        // logging here shows exactly what the consumer receives.
        // You can view this output in the browser devtools console.
        console.log('fetchEducatorSWOT full response (consumer):', response);
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
            Threats: [],
          };
        }
        // Only include Strengths, Weaknesses, and Threats; drop Opportunities (Edge Zone)
        if (category === 'Strengths' || category === 'Weaknesses' || category === 'Threats') {
          organized[subject][category].push({
            title,
            description,
            topics: subjectMap[subject],
          });
        }
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

/**
 * SwotSection Component
 * Renders a single section of a SWOT analysis (e.g., Strengths, Weaknesses)
 * for a specified subject.
 *
 * @param {Object} props - The component props.
 * @param {string} props.label - The key for the SWOT section in data (e.g., "Strengths", "Weaknesses").
 * @param {string} [props.displayLabel] - The display label for the SWOT section. Defaults to label if not provided.
 * @param {React.ReactNode} props.icon - The icon element to display next to the label.
 * @param {string} props.color - Tailwind CSS class string for the label's text color (e.g., "text-green-600").
 * @param {string} props.border - Tailwind CSS class string for the border color of the individual items (e.g., "border-green-300").
 * @param {Object} props.data - The full SWOT data object, structured by subject and then by SWOT category.
 * Expected structure: `{ [subjectName]: { Strengths: [], Weaknesses: [], ... } }`.
 * @param {string} props.selectedSubject - The name of the subject for which to display SWOT data.
 */
const SwotSection = ({ label, displayLabel, icon, color, border, data, selectedSubject }) => {
  const displayText = displayLabel || label;
  // Safely access the data for the selected subject and the current label.
  // Fallback to an empty array if the path doesn't exist to prevent errors.
  const itemsToRender = data?.[selectedSubject]?.[label] || [];

  // Small subtitle mapping for each zone (used under the title in mobile view)
  const zoneSubtitleMap = {
    'Focus Zone': 'Areas to improve',
    'Steady Zone': 'Strong areas',
  };

  // Gradient/background map for each zone
  const zoneBgMap = {
    'Focus Zone': 'bg-gradient-to-br from-pink-100 via-pink-50 to-pink-50',
    'Steady Zone': 'bg-gradient-to-br from-green-100 via-green-50 to-green-50',
  };

  const subtitle = zoneSubtitleMap[displayText] || '';
  const outerBg = zoneBgMap[displayText] || 'bg-base-100';

  return (
    // Make card a column flex container and full height so siblings in the desktop grid can match heights
    // Add a thin border whose color is provided via the `border` prop so the border is slightly
    // darker than the background gradient.
    <Card className={`${outerBg} rounded-2xl overflow-hidden h-full flex flex-col border ${border}`}>
      <CardHeader className="px-4 py-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div>
              <CardTitle className={`${color} font-semibold items-center mb-0 text-lg`}>{displayText}</CardTitle>
              {subtitle && <div className="text-sm text-gray-700">{subtitle}</div>}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 flex-1">
        {/* Inner white rounded box that holds the items (matches design in screenshot) */}
        <div className="bg-white p-4 rounded-lg flex flex-col h-full">
          <div className="space-y-4 flex-1 overflow-auto">
            {itemsToRender.length > 0 ? (
              itemsToRender.map((item, idx) => (
                <div key={item.id || `${displayText}-${selectedSubject}-${item.title || ''}-${idx}`} className={`p-3 rounded-lg`}>
                  {item.topics && item.topics.length > 0 && (
                    <ul className="list-disc list-inside text-sm md:text-base text-gray-700 space-y-2">
                      {item.topics.map((topic, i) => (
                        <li
                          key={`${item.id || item.title || ''}-topic-${topic}-${i}`}
                          className="py-1 leading-relaxed break-words whitespace-pre-wrap"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No data available for this category.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Prop Types for validation and documentation
SwotSection.propTypes = {
  label: PropTypes.string.isRequired,
  displayLabel: PropTypes.string, // Optional display label, defaults to label
  icon: PropTypes.element.isRequired, // Expects a React element (e.g., <Icon />)
  color: PropTypes.string.isRequired, // Tailwind CSS class for text color
  border: PropTypes.string.isRequired, // Tailwind CSS class for border color
  selectedSubject: PropTypes.string.isRequired,
  data: PropTypes.objectOf( // data is an object where keys are subject names
    PropTypes.objectOf( // each subject value is an object where keys are SWOT labels (Strengths, Weaknesses, etc.)
      PropTypes.arrayOf( // the value for each SWOT label is an array of item objects
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Optional unique ID for the item
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          topics: PropTypes.arrayOf(PropTypes.string).isRequired,
        })
      )
    )
  ).isRequired,
};

/**
 * ESWOT component displays the Focus Zone, Edge Zone, Steady Zone
 * analysis for students, allowing educators to filter results by test and subject.
 * It fetches and manages SWOT data using the `useSwotData` custom hook.
 */
const ESWOT = () => {
  // Utilize the custom hook to manage data fetching and state for SWOT analysis.
  const {
    selectedSubject,
    setSelectedSubject,
    selectedTest,
    setSelectedTest,
    availableTests = [],
    swotData,
    loading,
    error
  } = useSwotData(fetchEducatorSWOT, fetchAvailableSwotTests_Educator);

  // Filter out specific weaknesses: "Weakness Over Time" and "Low Retention Topics"
  // And specific strengths: "Strongest Question Types" and "Improvement Over Time"
  // And specific opportunities: "Missed Opportunities" and "Practice Recommendations"
  const filteredSwotData = React.useMemo(() => {
    if (!swotData) return swotData;
    const filtered = { ...swotData };
    for (const subject in filtered) {
      if (filtered[subject].Weaknesses) {
        filtered[subject].Weaknesses = filtered[subject].Weaknesses.filter(item =>
          item.title !== 'Weakness Over Time' && item.title !== 'Low Retention Topics'
        );
      }
      if (filtered[subject].Strengths) {
        filtered[subject].Strengths = filtered[subject].Strengths.filter(item =>
          item.title !== 'Strongest Question Types' && item.title !== 'Improvement Over Time'
        );
      }
      // Drop Opportunities (Edge Zone) entirely from educator view
    }
    return filtered;
  }, [swotData]);

  // Configuration for each SWOT section, including labels, icons, and styling.
  const sections = [
    {
      label: 'Weaknesses',
      displayLabel: 'Focus Zone',
      icon: <Target className="mr-2" />,
      color: 'text-red-600',
      // slightly darker than the pink/red background
      border: 'border-red-200'
    },
    {
      label: 'Strengths',
      displayLabel: 'Steady Zone',
      icon: <CheckCircle className="mr-2" />,
      color: 'text-green-600',
      // slightly darker than the green background
      border: 'border-green-200'
    }
  ];

  // Transform available test data into options format suitable for SelectDropdown.
  const testOptions = availableTests.map(test => ({
    value: test,
    label: test
  }));
  // Dynamically build the subject options from the fetched SWOT data,
  // preserving the preferred order when possible. If no SWOT data
  // is available yet, fall back to the preferred order.
  const subjectsFromData = Object.keys(swotData || {});

  const orderedSubjects = (() => {
    if (subjectsFromData.length === 0) return PREFERRED_SUBJECT_ORDER.slice();
    // Include preferred-ordered subjects that exist in the data
    const ordered = PREFERRED_SUBJECT_ORDER.filter(s => subjectsFromData.includes(s));
    // Append any additional subjects present in the data but not in the preferred list
    const remainder = subjectsFromData.filter(s => !PREFERRED_SUBJECT_ORDER.includes(s));
    return ordered.concat(remainder);
  })();

  const subjectOptions = orderedSubjects.map(subject => ({ value: subject, label: subject }));

  // If the current selectedSubject isn't present in the new options,
  // update it to the first available ordered subject.
  React.useEffect(() => {
    if (!orderedSubjects || orderedSubjects.length === 0) return;
    if (!orderedSubjects.includes(selectedSubject)) {
      setSelectedSubject && setSelectedSubject(orderedSubjects[0]);
    }
  }, [orderedSubjects, selectedSubject, setSelectedSubject]);

  // Active tab for mobile view (top-level hook)
  const [selectedTab, setSelectedTab] = React.useState('yetToDecide');

  const keyForLabel = (label) => {
    if (label === 'Focus Zone') return 'yetToDecide';
    if (label === 'Steady Zone') return 'keyStrengths';
    return 'yetToDecide';
  };

  const keyToLabel = (key) => {
    if (key === 'yetToDecide') return 'Focus Zone';
    if (key === 'keyStrengths') return 'Steady Zone';
    return 'Focus Zone';
  };

  const activeLabel = keyToLabel(selectedTab);

  // --- Conditional Rendering for Loading and Error States ---

  // Display the shared loading page while data is being fetched.
  // Render the loader non-fixed inside a relative container so it sits below
  // header/sidebar layers (which typically have higher z-index in the layout).
  if (loading) {
    return (
      <div className="relative min-h-screen">
        {/* translucent white overlay inside the page area */}
        <LoadingPage fixed={false} className="bg-white/80 dark:bg-gray-900/80 z-10" />
      </div>
    );
  }

  // Display an error message if data fetching failed.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="alert alert-error max-w-md shadow-lg">
          <AlertCircle className="stroke-current shrink-0 h-6 w-6" />
          <div>
            <h3 className="font-bold">Error</h3>
            <div className="text-xs">{String(error)}</div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Component Render (after loading and error checks) ---
  return (
    <div className="md:mt-12 lg:px-4 lg:space-y-6">
      {/* Selector Section */}
      <div className="hidden lg:flex lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-4 mb-4 pb-4 bg-white lg:pt-4 px-4 pt-2 rounded-xl shadow-xl">
        <Filter className="text-gray-400 w-5 h-5" />
        {/* Desktop: keep original Select dropdowns */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 min-w-max pl-1">Test</span>
          <Select value={selectedTest} onValueChange={(v) => setSelectedTest && setSelectedTest(v)}>
            <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-full lg:w-auto text-start">
              <SelectValue placeholder="Select Test" />
            </SelectTrigger>
            <SelectContent side="bottom" align="end">
              {testOptions.map(opt => (
                <SelectItem key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-gray-400 min-w-max pl-1">Subject</span>
          <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject && setSelectedSubject(v)}>
            <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-full lg:w-auto text-start">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent side="bottom" align="end">
              {subjectOptions.map(opt => (
                <SelectItem key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile: compact tabbed UI modeled after student mobile (subject tabs, zone tabs, topic list) */}
      <div className="lg:hidden">
        <div>
          <div className="flex w-full bg-white px-3 border-b justify-between items-center">
            <div className="text-left py-4">
              <h1 className="text-2xl font-bold text-gray-800">Test wise analysis</h1>
            </div>
            <div className="py-4">
              <Select value={selectedTest} onValueChange={(v) => setSelectedTest && setSelectedTest(v)}>
                <SelectTrigger className="btn btn-sm justify-start rounded-lg text-sm w-auto">
                  <SelectValue placeholder="Select Test" />
                  <ChevronDown size={16} className="ml-1" />
                </SelectTrigger>
                <SelectContent side="bottom" align="end">
                  {testOptions.map(opt => (
                    <SelectItem key={String(opt.value)} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject Tabs */}
          <div className="flex bg-white border-b relative pb-1 overflow-x-auto">
            {orderedSubjects.map((subject, idx) => {
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
                  onClick={() => setSelectedSubject(subject)}
                  className={`flex-1 pt-2 px-1 text-center text-sm font-medium flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isSelected ? 'text-gray-800' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <div className={`${isSelected ? activeBg : baseBg} rounded-lg p-2 mb-1 transform ${isSelected ? 'scale-105 shadow-md' : 'scale-100'}`}>
                    {icon}
                  </div>
                  <span className={`${isSelected ? 'font-semibold' : 'font-medium'}`}>{shortName}</span>
                </button>
              );
            })}

            {/* Animated underline indicator */}
            {orderedSubjects.length > 0 && (
              <motion.div
                className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full"
                style={{ width: `${100 / (orderedSubjects.length || 1)}%` }}
                animate={{ left: `${(Math.max(0, orderedSubjects.indexOf(selectedSubject || orderedSubjects[0])) * (100 / (orderedSubjects.length || 1)))}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
            )}
          </div>

          {/* Zone Tabs */}
          <div className="max-w-2xl mx-auto px-3">
            {/* Modern Tabs */}
            {(() => {
              const tabs = [
                { key: 'yetToDecide', label: 'Focus Zone' },
                { key: 'keyStrengths', label: 'Steady Zone' }
              ];

              return (
                <>
                  <div className="flex space-x-3 mt-3 mb-2">
                    {tabs.map((tab) => {
                      const isActive = selectedTab === tab.key;
                      let activeClasses = '';
                      if (isActive) {
                        if (tab.key === 'keyStrengths') {
                          activeClasses = 'bg-green-100 text-green-900 shadow-sm shadow-green-200/50 border border-green-300';
                        } else if (tab.key === 'yetToDecide') {
                          activeClasses = 'bg-orange-100 text-orange-900 shadow-sm shadow-orange-200/60 border border-orange-300';
                        }
                      }
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setSelectedTab(tab.key)}
                          aria-pressed={isActive}
                          role="tab"
                          className={`flex-1 py-2 px-2 text-sm font-semibold rounded-xl transition-all duration-300 ease-out transform scale-[1.02] ${isActive
                            ? activeClasses
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 active:scale-95'
                            }`}
                        >
                          <div className="text-center">
                            <div className={`font-semibold text-sm ${isActive ? '' : 'text-gray-600'}`}>
                              {tab.label}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Topic List */}
                  <div className="mt-3">
                    {(() => {
                      const activeSection = sections.find(s => s.displayLabel === activeLabel) || sections[0];
                      const zoneData = filteredSwotData?.[selectedSubject]?.[activeSection.label] || [];
                      const allTopics = zoneData.flatMap(item => item.topics || []);

                      if (allTopics.length > 0) {
                        return (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <ul className="divide-y divide-gray-100/80">
                              {allTopics.map((topic, i) => (
                                <li
                                  key={`${activeLabel}-${selectedSubject}-${i}`}
                                  className="py-1 px-4 text-gray-700 hover:bg-gray-50/50 transition-colors duration-200 group"
                                >
                                  <div className="flex items-start space-x-2">
                                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-primary rounded-full mt-2 transform transition-transform duration-300" />
                                    <span className="text-sm leading-relaxed transition-colors">
                                      {topic}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }

                      return (
                        <div className="text-center py-8 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200/70">
                          <div className="w-10 h-10 mx-auto mb-3 bg-gray-100/70 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm font-medium">No insights available</p>
                          <p className="text-gray-400 text-xs mt-1">Check back later for updates</p>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Desktop/large screens: stacked vertical layout to make it look more filled */}
      <div className="hidden lg:flex flex-col space-y-6">
        {sections.map(({ label, displayLabel, icon, color, border }) => (
          <SwotSection
            key={displayLabel}
            label={label}
            displayLabel={displayLabel}
            icon={icon}
            color={color}
            border={border}
            data={filteredSwotData}
            selectedSubject={selectedSubject}
          />
        ))}
      </div>
    </div>
  );
};

export default ESWOT;