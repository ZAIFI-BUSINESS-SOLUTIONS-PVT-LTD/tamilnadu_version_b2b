import React from 'react';
import {
    CheckCircle,
    XCircle,
    ArrowCircleUp,
    WarningCircle,
    Funnel
} from '@phosphor-icons/react';
import { fetchStudentSWOT, fetchAvailableSwotTests } from '../../utils/api';
import SelectDropdown from '../components/ui/dropdown.jsx';
import useSwotData from '../components/hooks/z_swot/z_useSwotData';
import SwotSection from '../shared/SWOT.jsx';

/**
 * Hardcoded list of subjects. In a production environment, this might ideally be fetched from an API.
 * @type {string[]}
 */
const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

/**
 * SSWOT Component
 *
 * This component is responsible for displaying the Student's SWOT (Strengths, Weaknesses, Opportunities, Threats)
 * analysis based on selected test and subject. It integrates several child components and a custom hook
 * to manage data fetching and display.
 *
 * @returns {JSX.Element} The rendered SWOT analysis dashboard.
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
        availableTests,
        swotData,
        loading
    } = useSwotData(fetchStudentSWOT, fetchAvailableSwotTests);

    /**
     * Defines the configuration for each SWOT section, including label, icon, and styling.
     * @type {Array<Object>}
     */
    const sections = [
        {
            label: 'Strengths',
            icon: <CheckCircle className="mr-2" />,
            color: 'text-green-600',
            border: 'border-green-100'
        },
        {
            label: 'Weaknesses',
            icon: <XCircle className="mr-2" />,
            color: 'text-red-600',
            border: 'border-red-100'
        },
        {
            label: 'Opportunities',
            icon: <ArrowCircleUp className="mr-2" />,
            color: 'text-accent', // Assuming 'text-accent' is a defined Tailwind color for blue-like shades
            border: 'border-blue-100'
        },
        {
            label: 'Threats',
            icon: <WarningCircle className="mr-2" />,
            color: 'text-yellow-500',
            border: 'border-yellow-100'
        }
    ];

    /**
     * Transforms the raw `availableTests` array into an array of objects
     * compatible with the `SelectDropdown` component's `options` prop.
     * @type {Array<{value: string, label: string}>}
     */
    const testOptions = availableTests.map(test => ({
        value: test,
        label: test
    }));
    // Transform subjects into options for SelectDropdown
    const subjectOptions = subjects.map(subject => ({
        value: subject,
        label: subject
    }));

    // Display a loading message while data is being fetched.
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg font-semibold text-gray-700">
                    Loading SWOT insights...
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 p-6 space-y-4">
            {/* Filter and Selector Section */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 border-b border-base-200 pb-4">
                <Funnel className="text-gray-400 w-5 h-5" />
                <span className="text-sm text-gray-400 min-w-max">Test</span>
                <SelectDropdown
                    options={testOptions}
                    selectedValue={selectedTest}
                    onSelect={setSelectedTest}
                    buttonClassName="btn btn-sm justify-start truncate m-1 flex-grow"
                    placeholder="Select Test" // Added placeholder for clarity
                />
                <span className="text-sm text-gray-400 min-w-max">Subject</span>
                <SelectDropdown
                    options={subjectOptions}
                    selectedValue={selectedSubject}
                    onSelect={setSelectedSubject}
                    buttonClassName="btn btn-sm justify-start truncate m-1 flex-grow"
                    placeholder="Select Subject" // Added placeholder for clarity
                />
            </div>

            {/* SWOT Sections Display Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sections.map(({ label, icon, color, border }) => (
                    <SwotSection
                        key={label} // Unique key for list rendering
                        label={label}
                        icon={icon}
                        color={color}
                        border={border}
                        data={swotData}
                        selectedSubject={selectedSubject}
                    />
                ))}
            </div>
        </div>
    );
};

export default SSWOT;