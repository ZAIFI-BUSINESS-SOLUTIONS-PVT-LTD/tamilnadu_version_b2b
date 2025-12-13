import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ArrowUpCircle, AlertTriangle, Filter, ChevronDown, Target, Zap } from 'lucide-react';
import { fetchStudentSWOT, fetchAvailableSwotTests, getStudentDashboardData } from '../../utils/api';
// import FilterDrawer from '../../components/ui/filter-drawer.jsx'; // Removed for desktop
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '../../components/ui/select.jsx';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
// import { Button } from '../../components/ui/button.jsx'; // Removed for desktop
// Import mobile component
import SSWOTMobile from './s_swot-mobile.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import QuestionBreakdownCard from './components/QuestionBreakdownCard.jsx';
// Custom hook to fetch and manage SWOT analysis data
const useSwotData = (fetchSwotData, fetchAvailableTestsData) => {
    // State for the currently selected subject. Start empty and set after data loads.
    const [selectedSubject, setSelectedSubject] = useState('');
    // State for the currently selected test
    const [selectedTest, setSelectedTest] = useState('Overall');
    // State to hold the list of available tests
    const [availableTests, setAvailableTests] = useState(['Overall']);
    // State to store the organized SWOT data
    const [swotData, setSwotData] = useState({});
    // State to track the loading status of the data fetch
    const [loading, setLoading] = useState(true);
    // State for error handling
    const [error, setError] = useState(null);

    // useEffect hook to load the list of available tests on component mount
    useEffect(() => {
        const loadAvailableTests = async () => {
            try {
                // Fetch the available test numbers
                const tests = await fetchAvailableTestsData();
                // Filter out duplicate test numbers, remove any '0' values and sort descending
                const uniqueTests = [...new Set(tests)].filter((num) => num !== 0).sort((a, b) => Number(b) - Number(a));
                // Format the test numbers into displayable strings with 'Overall' at the top
                const formatted = ['Overall', ...uniqueTests.map((num) => `Test ${num}`)];
                // Update the availableTests state
                setAvailableTests(formatted);
                setError(null); // Clear any previous errors
            } catch (error) {
                console.error('Error loading available tests:', error);
                setError(error);
            }
        };

        loadAvailableTests();
    }, [fetchAvailableTestsData]); // Fetch available tests only once on mount

    // useEffect hook to fetch SWOT data whenever the selected test changes
    useEffect(() => {
        const fetchSwot = async () => {
            setLoading(true);
            setError(null); // Clear previous errors
            try {
                // Determine the test number to fetch (0 for 'Overall')
                const testNum = selectedTest === 'Overall' ? 0 : parseInt(selectedTest.split(' ')[1]);
                // Fetch the SWOT data for the selected test
                const response = await fetchSwotData(testNum);
                // Debug: expose the raw response for debugging in browser console
                try { console.log('fetchStudentSWOT response:', response); } catch (e) { /* ignore logging errors */ }
                // If the response is successful and contains SWOT data
                if (!response?.error && response?.swot) {
                    // Organize the raw SWOT data into a more structured format
                    const formatted = organizeSwotData(response.swot);
                    // Update the swotData state
                    setSwotData(formatted);
                    // If there's no selected subject yet or the currently selected subject
                    // is not present in the new data, pick the first available subject.
                    const keys = Object.keys(formatted);
                    if (keys.length > 0 && (!selectedSubject || !keys.includes(selectedSubject))) {
                        // Preferred ordering for subjects
                        const preferredOrder = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
                        // Pick the first subject present in formatted data according to preferred order
                        let pick = keys[0];
                        for (const name of preferredOrder) {
                            const match = keys.find(k => k.toLowerCase() === name.toLowerCase());
                            if (match) {
                                pick = match;
                                break;
                            }
                        }
                        setSelectedSubject(pick);
                    }
                } else if (response?.error) {
                    console.error('Error fetching SWOT data:', response.error);
                    setSwotData({}); // Clear previous data on error
                    setError(response.error);
                } else {
                    setSwotData({}); // Clear data if no SWOT data is present
                }
            } catch (error) {
                console.error('Error fetching SWOT data:', error);
                setSwotData({}); // Clear previous data on error
                setError(error);
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
                        'Focus Zone': [],
                        'Steady Zone': [],
                    };
                }
                // Only include Focus and Steady zone items; drop other categories (e.g., Edge/Opportunities)
                if (category === 'Focus Zone' || category === 'Steady Zone') {
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
        error,
    };
};

// Mapping of API metric keys to SWOT categories, titles, and descriptions
const metricToCategoryMap = {
    TW_MCT: ['Focus Zone', 'Most Challenging Topics', 'Topics where the student has struggled:'],
    TO_RLT: ['Opportunities', 'Rapid Learning Topics', 'Topics that can be quickly improved with targeted practice:'],
    TS_BPT: ['Steady Zone', 'Best Performing Topics', 'Areas where the student excels:'],
};

const SwotSection = ({ label, icon, color, border, data, selectedSubject }) => {
    // Safely access the data for the selected subject and the current label.
    // Fallback to an empty array if the path doesn't exist to prevent errors.
    const itemsToRender = data?.[selectedSubject]?.[label] || [];

    // Small subtitle mapping for each zone (used under the title in mobile view)
    const zoneSubtitleMap = {
        'Focus Zone': 'Areas to improve',
        'Opportunities': 'Quick wins',
        'Steady Zone': 'Strong areas',
    };

    // Gradient/background map for each zone
    const zoneBgMap = {
        'Focus Zone': 'bg-gradient-to-br from-pink-100 via-pink-50 to-pink-50',
        'Opportunities': 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-50',
        'Steady Zone': 'bg-gradient-to-br from-green-100 via-green-50 to-green-50',
    };

    const subtitle = zoneSubtitleMap[label] || '';
    const outerBg = zoneBgMap[label] || 'bg-base-100';

    return (
        // Make card a column flex container and full height so siblings in the desktop grid can match heights
        // Add a thin border whose color is provided via the `border` prop so the border is slightly
        // darker than the background gradient.
        <Card className={`${outerBg} rounded-2xl overflow-hidden flex flex-col border ${border}`}>
            <CardHeader className="px-4 py-2">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                        <div>
                            <CardTitle className={`${color} font-semibold items-center mb-0 text-lg`}>{label}</CardTitle>
                            {subtitle && <div className="text-sm text-gray-700">{subtitle}</div>}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-0 flex-1 min-h-0">
                {/* Inner white rounded box that holds the items (matches design in screenshot) */}
                <div className="bg-white p-4 rounded-lg flex flex-col min-h-0">
                    <div className="space-y-4">
                        {itemsToRender.length > 0 ? (
                            itemsToRender.map((item, idx) => (
                                <div key={item.id || `${label}-${selectedSubject}-${item.title || ''}-${idx}`} className={`p-3 rounded-lg`}>
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
    icon: PropTypes.element.isRequired,
    color: PropTypes.string.isRequired,
    border: PropTypes.string.isRequired,
    selectedSubject: PropTypes.string.isRequired,
    data: PropTypes.objectOf(
        PropTypes.objectOf(
            PropTypes.arrayOf(
                PropTypes.shape({
                    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    title: PropTypes.string.isRequired,
                    description: PropTypes.string.isRequired,
                    topics: PropTypes.arrayOf(PropTypes.string).isRequired,
                })
            )
        )
    ).isRequired,
};

/**
 * Subjects are determined dynamically from the fetched `swotData`.
 * If there's no data yet, fall back to a sensible default list to keep the UI usable.
 */

/**
 * SSWOT Component
 *
 * This component is responsible for displaying the Student's Focus Zone, Edge Zone, and Steady Zone
 * analysis based on selected test and subject. It integrates several child components and a custom hook
 * to manage data fetching and display.
 *
 * @returns {JSX.Element} The rendered analysis dashboard.
 */
const SSWOT = () => {
    /**
     * Custom hook `useSwotData` handles the logic for fetching SWOT data and available tests,
     * as well as managing the `selectedSubject`, `selectedTest`, `availableTests`, and `swotData` states.
     *
     * @param {function} fetchSwotFunction - The API function to fetch SWOT details (e.g., `WorkspaceStudentSWOT`).
     * @param {function} fetchAvailableTestsFunction - The API function to fetch available test names (e.g., `WorkspaceAvailableSwotTests`).
     */
    const {
        selectedSubject,
        setSelectedSubject,
        selectedTest,
        setSelectedTest,
        availableTests = [],
        swotData,
        loading,
        error
    } = useSwotData(fetchStudentSWOT, fetchAvailableSwotTests);

    // Fetch subject-wise mapping once for the Question Breakdown card
    const [subjectWiseDataMapping, setSubjectWiseDataMapping] = useState([]);
    const [mappingLoading, setMappingLoading] = useState(true);

    useEffect(() => {
        const fetchMapping = async () => {
            setMappingLoading(true);
            try {
                const data = await getStudentDashboardData();
                const mapping = Array.isArray(data?.subjectWiseDataMapping) ? data.subjectWiseDataMapping : [];
                setSubjectWiseDataMapping(mapping);
            } catch (e) {
                console.error('Error loading subjectWiseDataMapping for Question Breakdown:', e);
                setSubjectWiseDataMapping([]);
            } finally {
                setMappingLoading(false);
            }
        };

        fetchMapping();
    }, []);

    /**
     * Defines the configuration for each SWOT section, including label, icon, and styling.
     * @type {Array<Object>}
     */
    const sections = [
        {
            label: 'Focus Zone',
            icon: <Target className="mr-2" />,
            color: 'text-red-600',
            // slightly darker than the pink/red background
            border: 'border-red-200'
        },
        {
            label: 'Steady Zone',
            icon: <CheckCircle className="mr-2" />,
            color: 'text-green-600',
            // slightly darker than the green background
            border: 'border-green-200'
        }
    ];

    /**
     * Transforms the raw `availableTests` array into an array of objects
     * compatible with the `SelectDropdown` component's `options` prop.
     * @type {Array<{value: string, label: string}>}
     */
    const testOptions = availableTests.map(test => ({ value: test, label: test }));
    // Derive subjects from swotData when available, otherwise fall back to preferred defaults
    const subjectsFromData = Object.keys(swotData || {});
    const preferredOrder = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];

    const subjects = subjectsFromData.length
        ? // sort available subjects by preferredOrder, unknown items go to the end alphabetically
        [...new Set(subjectsFromData)].sort((a, b) => {
            const idxA = preferredOrder.findIndex(x => x.toLowerCase() === a.toLowerCase());
            const idxB = preferredOrder.findIndex(x => x.toLowerCase() === b.toLowerCase());
            if (idxA !== -1 || idxB !== -1) {
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            }
            return a.localeCompare(b);
        })
        : preferredOrder;

    // Transform subjects into options for SelectDropdown
    const subjectOptions = subjects.map(subject => ({ value: subject, label: subject }));

    // Panels for the generic FilterDrawer (keeps component fully generic) - removed for desktop
    // const panels = [
    //     { key: 'test', label: 'Test', options: testOptions, selected: selectedTest, onSelect: setSelectedTest },
    //     { key: 'subject', label: 'Subject', options: subjectOptions, selected: selectedSubject, onSelect: setSelectedSubject },
    // ];

    // Drawer state for filter selection (single common drawer for both Test and Subject) - removed for desktop
    // const [drawerOpen, setDrawerOpen] = React.useState(false);

    // Active panel key for the drawer - removed for desktop
    // const [activePanelKey, setActivePanelKey] = React.useState('test');

    // (no active tab needed for mobile — zones will stack)

    // Loading state
    if (loading) {
        return <LoadingPage />;
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4">
                <div className="alert alert-error max-w-md ">
                    <AlertTriangle className="stroke-current shrink-0 h-6 w-6" />
                    <div>
                        <h3 className="font-bold">Error</h3>
                        <div className="text-xs">{String(error)}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="block md:hidden">
                <SSWOTMobile />
            </div>
            <div className="hidden md:block">
                <div className="lg:mt-12 mt-6 sm:p-6 px-0 w-full max-w-full space-y-6">
                    {/* Selector Section */}
                    <div className="flex flex-col sm:flex-row  items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4 pb-4 bg-white sm:pt-4 px-4 pt-2 rounded-xl border border-gray-200">
                        <Filter className="hidden sm:block text-gray-400 w-5 h-5" />
                        {/* Desktop: keep original Select dropdowns */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 min-w-max pl-1">Test</span>
                            <Select value={selectedTest} onValueChange={(v) => setSelectedTest && setSelectedTest(v)}>
                                <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-full sm:w-auto text-start">
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
                                <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-full sm:w-auto text-start">
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

                    {/* Desktop layout: left column stacked SWOT sections, right column Question Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="flex flex-col space-y-6 lg:col-span-2">
                            {sections.map(({ label, icon, color, border }) => (
                                <SwotSection
                                    key={label}
                                    label={label}
                                    icon={icon}
                                    color={color}
                                    border={border}
                                    data={swotData}
                                    selectedSubject={selectedSubject}
                                />
                            ))}
                        </div>

                        <div className="flex items-stretch lg:col-span-2">
                            {!mappingLoading ? (
                                <div className="w-full h-full">
                                    <QuestionBreakdownCard
                                        subjectWiseDataMapping={subjectWiseDataMapping}
                                        selectedTest={selectedTest}
                                        setSelectedTest={setSelectedTest}
                                        // let QuestionBreakdownCard treat empty subject as "Overall"
                                        selectedSubject={selectedSubject || ''}
                                        setSelectedSubject={setSelectedSubject}
                                        showSelectors={false}
                                    />
                                </div>
                            ) : (
                                <Card className="w-full rounded-2xl border border-gray-250 bg-white p-6">
                                    <div className="text-sm text-gray-500">Loading question breakdown…</div>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SSWOT;