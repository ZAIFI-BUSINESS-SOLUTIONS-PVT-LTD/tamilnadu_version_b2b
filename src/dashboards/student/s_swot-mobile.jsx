import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowUpCircle, AlertCircle, Filter, ChevronDown, Target, Zap, Atom, FlaskConical, Leaf, PawPrint, Microscope } from 'lucide-react';
import { fetchStudentSWOT, fetchAvailableSwotTests, getStudentDashboardData } from '../../utils/api';
import FilterDrawer from '../../components/ui/filter-drawer.jsx';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
// ChartJS for Donut visualization used in Question Breakdown
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);
// Ensure high-DPI (retina) displays render charts sharply by matching
// Chart.js pixel ratio to the devicePixelRatio.
if (typeof window !== 'undefined' && window.devicePixelRatio) {
    ChartJS.defaults.devicePixelRatio = window.devicePixelRatio;
}
// Custom hook to fetch and manage SWOT analysis data


// (use the existing mapping-based helpers and Donut implementation further below)

const useSwotData = (fetchSwotData, fetchAvailableTestsData, fetchDashboardData) => {
    // State for the currently selected subject. Start empty and set after data loads.
    const [selectedSubject, setSelectedSubject] = useState('');
    // State for the currently selected test
    const [selectedTest, setSelectedTest] = useState('Overall');
    // State to hold the list of available tests
    const [availableTests, setAvailableTests] = useState(['Overall']);
    // State to store the organized SWOT data
    const [swotData, setSwotData] = useState({});
    // State to store subject-wise data mapping for Question Breakdown
    const [subjectWiseDataMapping, setSubjectWiseDataMapping] = useState([]);
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
                // Use the same "Test" format as the dashboard mapping (e.g. "Test1")
                // This avoids mismatches between availableTests (select options) and
                // the keys present in `subjectWiseDataMapping` which may be "Test1".
                const formatted = ['Overall', ...uniqueTests.map((num) => `Test${num}`)];
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

    // useEffect hook to fetch dashboard data for subjectWiseDataMapping
    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const dashboardData = await fetchDashboardData();
                if (dashboardData?.subjectWiseDataMapping) {
                    setSubjectWiseDataMapping(dashboardData.subjectWiseDataMapping);
                } else {
                    setSubjectWiseDataMapping([]);
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                setSubjectWiseDataMapping([]);
            }
        };

        loadDashboardData();
    }, [fetchDashboardData]); // Fetch dashboard data only once on mount

    // useEffect hook to fetch SWOT data whenever the selected test changes
    useEffect(() => {
        const fetchSwot = async () => {
            setLoading(true);
            setError(null); // Clear previous errors
            try {
                // Determine the test number to fetch (0 for 'Overall').
                // Use a regex to extract digits so both "Test1" and "Test 1" work.
                let testNum = 0;
                if (selectedTest !== 'Overall') {
                    const m = String(selectedTest).match(/(\d+)/);
                    testNum = m ? parseInt(m[1], 10) : 0;
                }
                // Fetch the SWOT data for the selected test
                const response = await fetchSwotData(testNum);
                // Debug: expose the raw response for debugging in browser console
                try { console.log('fetchStudentSWOT response (mobile):', response); } catch (e) { /* ignore logging errors */ }
                // If the response is successful and contains SWOT data
                if (!response?.error && response?.swot) {
                    // Organize the raw SWOT data into a more structured format
                    const formatted = organizeSwotData(response.swot);
                    // Update the swotData state
                    setSwotData(formatted);
                    // Choose an initial subject based on preferred ordering if none selected
                    const keys = Object.keys(formatted);
                    if (keys.length > 0 && (!selectedSubject || !keys.includes(selectedSubject))) {
                        const preferredOrder = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
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
                        'Edge Zone': [],
                        'Steady Zone': [],
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
        subjectWiseDataMapping,
        loading,
        error,
    };
};

// Mapping of API metric keys to SWOT categories, titles, and descriptions
const metricToCategoryMap = {
    TW_MCT: ['Focus Zone', 'Most Challenging Topics', 'Topics where the student has struggled:'],
    TO_RLT: ['Edge Zone', 'Rapid Learning Topics', 'Topics that can be quickly improved with targeted practice:'],
    TS_BPT: ['Steady Zone', 'Best Performing Topics', 'Areas where the student excels:'],
};

const SwotSection = ({ label, icon, color, border, data, selectedSubject }) => {
    // Safely access the data for the selected subject and the current label.
    // Fallback to an empty array if the path doesn't exist to prevent errors.
    const itemsToRender = data?.[selectedSubject]?.[label] || [];

    // Small subtitle mapping for each zone (used under the title in mobile view)
    const zoneSubtitleMap = {
        'Focus Zone': 'Areas to improve',
        'Edge Zone': 'Quick wins',
        'Steady Zone': 'Strong areas',
    };

    // Gradient/background map for each zone
    const zoneBgMap = {
        'Focus Zone': 'bg-gradient-to-br from-pink-100 via-pink-50 to-pink-50',
        'Edge Zone': 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-50',
        'Steady Zone': 'bg-gradient-to-br from-green-100 via-green-50 to-green-50',
    };

    const subtitle = zoneSubtitleMap[label] || '';
    const outerBg = zoneBgMap[label] || 'bg-base-100';

    return (
        // Make card a column flex container and full height so siblings in the desktop grid can match heights
        // Add a thin border whose color is provided via the `border` prop so the border is slightly
        // darker than the background gradient.
        <Card className={`${outerBg} rounded-2xl overflow-hidden h-full flex flex-col border ${border}`}>
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

            <CardContent className="px-4 pb-4 pt-0 flex-1">
                {/* Inner white rounded box that holds the items (matches design in screenshot) */}
                <div className="bg-white p-4 rounded-lg flex flex-col h-full">
                    <div className="space-y-4 flex-1 overflow-auto">
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
 * If there's no data yet, fall back to the preferred order list.
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
const SSWOTMobile = () => {
    /**
     * Custom hook `useSwotData` handles the logic for fetching SWOT data and available tests,
     * as well as managing the `selectedSubject`, `selectedTest`, `availableTests`, and `swotData` states.
     *
     * @param {function} fetchSwotFunction - The API function to fetch SWOT details (e.g., `WorkspaceStudentSWOT`).
     * @param {function} fetchAvailableTestsFunction - The API function to fetch available test names (e.g., `WorkspaceAvailableSwotTests`).
     * @param {function} fetchDashboardFunction - The API function to fetch dashboard data including subjectWiseDataMapping.
     */
    const {
        selectedSubject,
        setSelectedSubject,
        selectedTest,
        setSelectedTest,
        availableTests = [],
        swotData,
        subjectWiseDataMapping,
        loading,
        error
    } = useSwotData(fetchStudentSWOT, fetchAvailableSwotTests, getStudentDashboardData);

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
            label: 'Edge Zone',
            icon: <Zap className="mr-2" />,
            color: 'text-blue-600',
            // slightly darker than the blue background
            border: 'border-blue-200'
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
    // Determine subjects for tabs from swotData (preferred order fallback)
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

    // Panels for the generic FilterDrawer (keeps component fully generic)
    const panels = [
        { key: 'test', label: 'Test', options: testOptions, selected: selectedTest, onSelect: setSelectedTest },
        // Subject selection moved to tabs, removed from drawer
    ];

    // Drawer state for filter selection (single common drawer for both Test and Subject)
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    // Active panel key for the drawer - default to test since subject moved to tabs
    const [activePanelKey, setActivePanelKey] = React.useState('test');

    // State for selected zone
    const [selectedZone, setSelectedZone] = React.useState('Focus Zone');

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
                    <AlertCircle className="stroke-current shrink-0 h-6 w-6" />
                    <div>
                        <h3 className="font-bold">Error</h3>
                        <div className="text-xs">{String(error)}</div>
                    </div>
                </div>
            </div>
        );
    }

    // Get the data for the selected zone
    const zoneData = swotData?.[selectedSubject]?.[selectedZone] || [];
    // Flatten all topics from all items in the zone
    const allTopics = zoneData.flatMap(item => item.topics || []);

    return (
        <div className="space-y-6 pb-3">
            {/* Header */}
            <div>
                <div className="flex w-full bg-white px-3 border-b justify-between items-center">
                    <div className="text-left py-4">
                        <h1 className="text-2xl font-bold text-gray-800">Test wise analysis</h1>
                    </div>
                    <div className="py-4">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-auto justify-start rounded-lg text-sm"
                            onClick={() => { setActivePanelKey('test'); setDrawerOpen(true); }}
                        >
                            {selectedTest || 'Select Test'}
                            <ChevronDown size={16} className="ml-1" />
                        </Button>
                    </div>
                </div>

                {/* Subject Tabs */}
                <div className="flex bg-white border-b relative pb-1">
                    {subjects.map((subject, idx) => {
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
                    {subjects.length > 0 && (
                        <motion.div
                            className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full"
                            style={{ width: `${100 / (subjects.length || 1)}%` }}
                            animate={{ left: `${(Math.max(0, subjects.indexOf(selectedSubject || subjects[0])) * (100 / (subjects.length || 1)))}%` }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        />
                    )}
                </div>
            </div>

            {/* Zone Tabs - replicated dashboard mobile design (colors & layout only) */}
            <div className="max-w-2xl mx-auto px-3">
                {/* Modern Tabs */}
                {(() => {
                    const tabs = [
                        { key: 'yetToDecide', label: 'Focus Zone' },
                        { key: 'areasForImprovement', label: 'Edge Zone' },
                        { key: 'keyStrengths', label: 'Steady Zone' }
                    ];

                    // map our selectedZone label to the tab key used here
                    const keyForLabel = (label) => {
                        if (label === 'Focus Zone') return 'yetToDecide';
                        if (label === 'Edge Zone') return 'areasForImprovement';
                        if (label === 'Steady Zone') return 'keyStrengths';
                        return 'yetToDecide';
                    };

                    const [selectedTab, setSelectedTab] = [keyForLabel(selectedZone), (k) => { setSelectedZone(k === 'yetToDecide' ? 'Focus Zone' : k === 'areasForImprovement' ? 'Edge Zone' : 'Steady Zone'); }];

                    return (
                        <>
                            <div className="flex space-x-3 mb-2">
                                {tabs.map((tab) => {
                                    const isActive = selectedTab === tab.key;
                                    let activeClasses = '';
                                    if (isActive) {
                                        if (tab.key === 'keyStrengths') {
                                            activeClasses = 'bg-green-100 text-green-900 shadow-sm shadow-green-200/50 border border-green-300';
                                        } else if (tab.key === 'areasForImprovement') {
                                            activeClasses = 'bg-blue-100 text-blue-900 shadow-sm shadow-blue-200/50 border border-blue-300';
                                        } else if (tab.key === 'yetToDecide') {
                                            activeClasses = 'bg-orange-100 text-orange-900 shadow-sm shadow-orange-200/60 border border-orange-300';
                                        }
                                    }
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setSelectedTab(tab.key)}
                                            className={`flex-1 py-2 px-2 text-sm font-semibold rounded-xl transition-all duration-300 ease-out transform scale-[1.02] ${isActive
                                                ? activeClasses
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 active:scale-95'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Content Area (design only) */}
                            <div className="mt-3">
                                {allTopics.length ? (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <ul className="divide-y divide-gray-100/80">
                                            {allTopics.map((topic, i) => (
                                                <li
                                                    key={`${selectedZone}-${selectedSubject}-${i}`}
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
                                ) : (
                                    <div className="text-center py-8 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200/70">
                                        <div className="w-10 h-10 mx-auto mb-3 bg-gray-100/70 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium">No insights available</p>
                                        <p className="text-gray-400 text-xs mt-1">Check back later for updates</p>
                                    </div>
                                )}
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Question Breakdown (moved from SDashboardMobile) - hidden for Overall */}
            {selectedTest !== 'Overall' && (
                <div className="flex flex-col gap-3 mx-3">
                    <div className="w-full flex flex-col justify-between items-start mb-0.5">
                        <div className="flex flex-col items-start justify-start gap-0">
                            <h3 className="text-primary text-lg font-semibold">Question Statistics</h3>
                            <p className="text-gray-500 text-xs mb-3">Correct / Incorrect / Skipped for selected test & subject</p>
                        </div>

                    </div>
                    <div className="flex flex-col gap-1">
                        {/* Donut chart */}
                        <div className="w-full border border-bg-primary rounded-2xl py-4 bg-white flex-1 min-h-[160px] flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #374151, #1f2937)' }}>
                            <DonutChart
                                subjectWiseDataMapping={subjectWiseDataMapping}
                                selectedTest={selectedTest}
                                setSelectedTest={setSelectedTest}
                                selectedSubject={selectedSubject}
                                setSelectedSubject={setSelectedSubject}
                            />
                        </div>

                        {/* Legends */}
                        <div className="w-full mt-3 grid grid-cols-3 gap-2">
                            {
                                (() => {
                                    const mapping = subjectWiseDataMapping;
                                    const testRow = getTestRowFromMapping(mapping, selectedTest);

                                    const subjectsDetails = buildSubjectDetailsFromRow(testRow);
                                    const selectedSubName = selectedSubject || (subjectsDetails[0] && subjectsDetails[0].name) || 'Botany';

                                    let correct = 0;
                                    let incorrect = 0;
                                    let skipped = 0;

                                    if (selectedSubName === 'Overall') {
                                        subjectsDetails.forEach(d => {
                                            if (!d) return;
                                            correct += Number(d.correct || 0);
                                            incorrect += Number(d.incorrect || 0);
                                            skipped += Number(d.unattended ?? d.skipped ?? 0);
                                        });
                                    } else {
                                        const subjectRow = subjectsDetails.find(d => d && (d.name === selectedSubName || d.name?.toLowerCase() === selectedSubName?.toLowerCase())) || {};
                                        correct = Number(subjectRow.correct || 0);
                                        incorrect = Number(subjectRow.incorrect || 0);
                                        skipped = Number(subjectRow.unattended ?? subjectRow.skipped ?? 0);
                                    }

                                    return [
                                        (<div key="c" className="p-2"><div className="p-3 rounded-xl shadow-xl bg-gradient-to-br from-green-400 to-green-700 text-center"><div className="mt-1 text-lg font-semibold text-white">{correct}</div><div className="text-xs text-gray-100">Correct Answers</div></div></div>),
                                        (<div key="i" className="p-2"><div className="p-3 rounded-xl shadow-xl bg-gradient-to-br from-orange-400 to-orange-600 text-center"><div className="mt-1 text-lg font-semibold text-white">{incorrect}</div><div className="text-xs text-gray-100">Incorrect Answers</div></div></div>),
                                        (<div key="s" className="p-2"><div className="p-3 rounded-xl shadow-xl bg-gradient-to-br from-yellow-400 to-yellow-600 text-center"><div className="mt-1 text-lg font-semibold text-white">{skipped}</div><div className="text-xs text-gray-100">Skipped Questions</div></div></div>)
                                    ];
                                })()
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Drawer (shared component) */}
            <FilterDrawer
                open={drawerOpen}
                onOpenChange={(v) => setDrawerOpen(v)}
                panels={panels}
                initialActivePanel={activePanelKey}
                title="Select Test"
            />
        </div>
    );
};

// ----------------------- Question Breakdown helpers & Donut -----------------------
/**
 * Normalize a mapping row into an array of subjectDetails with
 * shape: { name, correct, incorrect, unattended, total }
 */
/**
 * Return a single test row for the given selection. If selectedTest is 'Overall',
 * aggregates all rows in the mapping into a flattened row with per-subject totals
 * (keys like 'Botany__correct', 'Chemistry__incorrect', etc.). This shape is
 * compatible with `buildSubjectDetailsFromRow`.
 */
const getTestRowFromMapping = (mapping = [], selectedTest) => {
    if (!Array.isArray(mapping) || mapping.length === 0) return {};
    if (selectedTest && selectedTest !== 'Overall') {
        return mapping.find(r => (r.Test || '') === selectedTest) || {};
    }

    const subjects = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
    const agg = {};

    mapping.forEach(row => {
        subjects.forEach(s => {
            const correct = Number(row[`${s}__correct`] ?? row[`${s}__correct_count`] ?? 0);
            const incorrect = Number(row[`${s}__incorrect`] ?? row[`${s}__incorrect_count`] ?? 0);
            const unattended = Number(row[`${s}__unattempted`] ?? row[`${s}__skipped`] ?? row[`${s}__unattended`] ?? 0);
            const total = Number(row[s] ?? 0);

            agg[`${s}__correct`] = (agg[`${s}__correct`] || 0) + correct;
            agg[`${s}__incorrect`] = (agg[`${s}__incorrect`] || 0) + incorrect;
            // store under __unattempted key (buildSubjectDetailsFromRow checks this)
            agg[`${s}__unattempted`] = (agg[`${s}__unattempted`] || 0) + unattended;
            agg[s] = (agg[s] || 0) + total;
        });
    });

    agg.Test = 'Overall';
    return agg;
};
const buildSubjectDetailsFromRow = (row = {}) => {
    const subjects = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];

    if (Array.isArray(row?.subjectDetails)) {
        return row.subjectDetails.map(d => ({
            name: d?.name ?? null,
            correct: Number(d?.correct ?? d?.correct_count ?? 0),
            incorrect: Number(d?.incorrect ?? d?.incorrect_count ?? 0),
            unattended: Number(d?.unattended ?? d?.skipped ?? d?.unattempted ?? 0),
            total: Number(d?.total ?? 0)
        }));
    }

    const looksLikeFlattened = subjects.some(s => Object.prototype.hasOwnProperty.call(row, `${s}__correct`));
    if (looksLikeFlattened) {
        return subjects.map(s => ({
            name: s,
            correct: Number(row[`${s}__correct`] || 0),
            incorrect: Number(row[`${s}__incorrect`] || 0),
            unattended: Number(row[`${s}__unattempted`] || row[`${s}__skipped`] || 0),
            total: Number(row[s] || 0)
        }));
    }

    return subjects.map(s => ({
        name: s,
        correct: Number(row[`${s}__correct`] || 0),
        incorrect: Number(row[`${s}__incorrect`] || 0),
        unattended: Number(row[`${s}__unattempted`] || row[`${s}__skipped`] || 0),
        total: Number(row[s] || 0)
    }));
};

const DonutChart = ({ subjectWiseDataMapping = [], selectedTest, setSelectedTest, selectedSubject, setSelectedSubject }) => {
    const testRow = getTestRowFromMapping(subjectWiseDataMapping, selectedTest);
    const subjectDetails = buildSubjectDetailsFromRow(testRow);

    const selectedSubName = selectedSubject || (subjectDetails[0] && subjectDetails[0].name) || 'Physics';

    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    if (selectedSubName === 'Overall') {
        subjectDetails.forEach(d => {
            if (!d) return;
            correct += Number(d.correct || 0);
            incorrect += Number(d.incorrect || 0);
            skipped += Number(d.unattended || d.skipped || 0);
        });
    } else {
        const subjectRow = subjectDetails.find(d => d && (d.name === selectedSubName || d.name?.toLowerCase() === selectedSubName?.toLowerCase())) || {};
        correct = Number(subjectRow.correct || 0);
        incorrect = Number(subjectRow.incorrect || 0);
        skipped = Number(subjectRow.unattended ?? subjectRow.skipped ?? 0);
    }

    const hasData = correct || incorrect || skipped;

    const data = {
        labels: ['Skipped', 'Incorrect', 'Correct'],
        datasets: [{
            data: [skipped, incorrect, correct],
            backgroundColor: ['#F59E0B', '#f97316', '#10B981'], // skipped: lighter yellow, incorrect: orange, correct: green
            borderWidth: 0,
            borderColor: 'transparent'
        }]
    };

    const options = { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } };

    const centerTextPlugin = {
        id: 'centerText',
        afterDraw: (chart) => {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const ds = chart.data && chart.data.datasets && chart.data.datasets[0];
            const values = Array.isArray(ds && ds.data) ? ds.data : [];
            const total = values.reduce((s, v) => s + (Number(v) || 0), 0);

            ctx.save();
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            const baseHeight = (chartArea.bottom - chartArea.top);
            const numberFontSize = Math.max(12, Math.round(baseHeight / 6));
            const labelFontSize = Math.max(10, Math.round(baseHeight / 12));

            ctx.font = `600 ${numberFontSize}px Tenorite, sans-serif`;
            ctx.fillStyle = '#ffffff';  // white for the total number
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(total), centerX, centerY - (labelFontSize * 0.6));

            ctx.font = `500 ${labelFontSize}px Tenorite, sans-serif`;
            ctx.fillStyle = '#d1d5db';  // light gray for the label
            ctx.textBaseline = 'top';
            ctx.fillText('Total Questions', centerX, centerY + (numberFontSize * 0.25));

            ctx.restore();
        }
    };

    return (
        <div className="w-full flex flex-col items-center justify-center">
            <div className="h-44 w-44">
                {hasData ? <Doughnut data={data} options={options} plugins={[centerTextPlugin]} /> : <p className="text-xs text-gray-500 text-center">No question breakdown</p>}
            </div>
        </div>
    );
};

export default SSWOTMobile;