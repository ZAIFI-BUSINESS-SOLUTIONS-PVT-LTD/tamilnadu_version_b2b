import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Filter, ChevronDown, Target, Zap } from 'lucide-react';
import useStudentDashboard, { useStudentSWOT, useAvailableSwotTests } from '../../hooks/useStudentData';
// import FilterDrawer from '../../components/ui/filter-drawer.jsx'; // Removed for desktop
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '../../components/ui/select.jsx';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
import Alert from '../../components/ui/alert.jsx';
// import { Button } from '../../components/ui/button.jsx'; // Removed for desktop
// Import mobile component
import SSWOTMobile from './s_analysis-mobile.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import QuestionBreakdownCard from './components/QuestionBreakdownCard.jsx';
// Custom hook to fetch and manage SWOT analysis data
const useSwotData = () => {
    // State for the currently selected subject. Start empty and set after data loads.
    const [selectedSubject, setSelectedSubject] = useState('');
    // State for the currently selected test
    const [selectedTest, setSelectedTest] = useState('Overall');
    // State to hold the list of available tests
    const [availableTests, setAvailableTests] = useState(['Overall']);
    // State to store the organized SWOT data
    const [swotData, setSwotData] = useState({});
    // State to track the loading status of the data fetch (derived from queries below)
    // State for error handling
    const [error, setError] = useState(null);

    // Use cached queries for available tests and SWOT data
    // Determine numeric test id from selectedTest string
    let testNum = 0;
    if (selectedTest !== 'Overall') {
        const m = String(selectedTest).match(/(\d+)/);
        testNum = m ? parseInt(m[1], 10) : 0;
    }

    const availableTestsQuery = useAvailableSwotTests();
    const swotQuery = useStudentSWOT(testNum);

    // Process available tests when loaded
    useEffect(() => {
        try {
            const tests = Array.isArray(availableTestsQuery.data) ? availableTestsQuery.data : [];
            const uniqueTests = [...new Set(tests)].filter((num) => num !== 0).sort((a, b) => Number(b) - Number(a));
            const formatted = ['Overall', ...uniqueTests.map((num) => `Test ${num}`)];
            setAvailableTests(formatted.length ? formatted : ['Overall']);
            if (availableTestsQuery.error) setError(availableTestsQuery.error);
            else setError(null);
        } catch (e) {
            console.error('Error processing available tests:', e);
            setAvailableTests(['Overall']);
            setError(e);
        }
    }, [availableTestsQuery.data, availableTestsQuery.error]);

    // Process SWOT response when loaded
    useEffect(() => {
        try {
            const response = swotQuery.data;
            if (!swotQuery.error && response?.swot) {
                const formatted = organizeSwotData(response.swot);
                setSwotData(formatted);
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
                setError(null);
            } else if (swotQuery.error) {
                console.error('Error fetching SWOT data:', swotQuery.error);
                setSwotData({});
                setError(swotQuery.error);
            } else {
                setSwotData({});
            }
        } catch (e) {
            console.error('Error processing SWOT response:', e);
            setSwotData({});
            setError(e);
        }
    }, [swotQuery.data, swotQuery.error]);

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
    const loading = Boolean(availableTestsQuery.isLoading || swotQuery.isLoading);

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

    const subtitle = zoneSubtitleMap[label] || '';

    return (
        // Let the card size to its content without forcing full height
        <Card className="bg-card rounded-2xl overflow-hidden border-none py-0">
            <CardHeader className="px-0 pt-0 pb-2">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                        <div>
                            <CardTitle className={`${color} font-semibold items-center my-0 text-lg`}>{label}</CardTitle>
                            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="border border-border rounded-2xl bg-muted/60">
                    {itemsToRender.length > 0 ? (
                        <div className="divide-y divide-border/70">
                            {itemsToRender.map((item, idx) => (
                                <div
                                    key={item.id || `${label}-${selectedSubject}-${item.title || ''}-${idx}`}
                                    className="px-4 py-3 border-t border-border/70 first:border-t-0"
                                >
                                    {item.topics && item.topics.length > 0 ? (
                                        <div className="divide-y divide-border/70">
                                            {item.topics.map((topic, i) => (
                                                <div
                                                    key={`${item.id || item.title || ''}-topic-${topic}-${i}`}
                                                    className="flex items-start gap-2 py-2 text-sm md:text-base text-foreground"
                                                >
                                                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden="true" />
                                                    <span className="leading-relaxed break-words whitespace-pre-wrap">{topic}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No data available for this category.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="px-4 py-3 text-sm text-muted-foreground italic">No data available for this category.</p>
                    )}
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
    } = useSwotData();

    // Use cached dashboard hook for subject-wise mapping (avoids duplicate fetch)
    const { data: dashboardDataFromHook = {}, isLoading: dashboardLoading = false } = useStudentDashboard();

    const subjectWiseDataMapping = Array.isArray(dashboardDataFromHook?.subjectWiseDataMapping)
        ? dashboardDataFromHook.subjectWiseDataMapping
        : [];
    const mappingLoading = dashboardLoading;

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
                <div className="max-w-md w-full">
                    <Alert
                        variant="destructive"
                        icon={<AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden />}
                        className="shadow-sm"
                    >
                        <div className="font-semibold text-sm">Error</div>
                        <div className="text-xs text-rose-800/80 break-words">{String(error)}</div>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="block md:hidden">
                <SSWOTMobile />
            </div>
            <div className="hidden md:block mt-14">
                <div className="px-0 lg:px-4 w-full max-w-full space-y-6">
                    {/* Header and selector controls */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-2xl font-semibold text-foreground">Test Wise Analysis</h2>
                            <p className="text-sm text-muted-foreground">Review focus and steady zones by subject and test.</p>
                        </div>
                        <div className="flex items-start gap-4 flex-wrap justify-end">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground min-w-max pl-1">Test</span>
                                <Select value={selectedTest} onValueChange={(v) => setSelectedTest && setSelectedTest(v)}>
                                    <SelectTrigger className="m-1 w-full lg:w-auto justify-start truncate text-start bg-card border border-border">
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

                                <span className="text-sm text-muted-foreground min-w-max pl-1">Subject</span>
                                <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject && setSelectedSubject(v)}>
                                    <SelectTrigger className="m-1 w-full lg:w-auto justify-start truncate text-start bg-card border border-border">
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
                    </div>

                    {/* Desktop layout: left column stacked SWOT sections, right column Question Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="flex flex-col space-y-4 lg:col-span-3 bg-card border border-border p-4 rounded-2xl h-fit">
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
                                <Card className="w-full rounded-2xl border border-border bg-card p-6">
                                    <div className="text-sm text-muted-foreground">Loading question breakdown…</div>
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