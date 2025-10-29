import React from 'react';
import {
  CheckCircle,
  XCircle,
  ArrowCircleUp,
  WarningCircle,
  Spinner, // Added Spinner for loading state
  WarningCircle as ErrorIcon // Aliased WarningCircle for clarity in error state
} from '@phosphor-icons/react';
import { fetchEducatorSWOT, fetchAvailableSwotTests_Educator } from '../../utils/api';
import SelectDropdown from '../components/ui/dropdown.jsx';
import useSwotData from '../components/hooks/z_swot/z_useSwotData';
import SwotSection from '../shared/SWOT.jsx';

// Define the static list of subjects available for SWOT analysis.
const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

/**
 * ESWOT component displays the SWOT (Strengths, Weaknesses, Opportunities, Threats)
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
    availableTests,
    swotData,
    loading,
    error // Assuming the useSwotData hook also returns an error state
  } = useSwotData(fetchEducatorSWOT, fetchAvailableSwotTests_Educator);

  // Configuration for each SWOT section, including labels, icons, and styling.
  const sections = [
    {
      label: 'Strengths',
      icon: <CheckCircle className="mr-2" />, color: 'text-green-600', border: 'border-green-100'
    },
    {
      label: 'Weaknesses',
      icon: <XCircle className="mr-2" />, color: 'text-red-600', border: 'border-red-100'
    },
    {
      label: 'Opportunities',
      icon: <ArrowCircleUp className="mr-2" />, color: 'text-accent', border: 'border-blue-100'
    },
    {
      label: 'Threats',
      icon: <WarningCircle className="mr-2" />, color: 'text-yellow-500', border: 'border-yellow-100'
    }
  ];

  // Transform available test data into options format suitable for SelectDropdown.
  const testOptions = availableTests.map(test => ({
    value: test,
    label: test
  }));
  // Transform subjects into options for SelectDropdown
  const subjectOptions = subjects.map(subject => ({
    value: subject,
    label: subject
  }));

  // --- Conditional Rendering for Loading and Error States ---

  // Display a loading indicator while data is being fetched.
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <Spinner className="animate-spin h-8 w-8 text-primary" />
        <p className="text-gray-600">Loading SWOT insights...</p>
      </div>
    );
  }

  // Display an error message if data fetching failed.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="alert alert-error max-w-md shadow-lg">
          <ErrorIcon className="stroke-current shrink-0 h-6 w-6" weight="bold" />
          <div>
            <h3 className="font-bold">Error!</h3>
            {/* Display the specific error message, assuming it's user-friendly */}
            <div className="text-xs">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Component Render (after loading and error checks) ---
  return (
    <div className="mt-6 p-6 space-y-4">
      {/* Filters Section: Test and Subject Selectors */}
      <div className="flex items-center space-x-4 mb-4 border-b border-base-200 pb-4">
        <span className="text-sm text-gray-400">Test</span>
        <SelectDropdown
          options={testOptions}
          selectedValue={selectedTest}
          onSelect={setSelectedTest}
          buttonClassName="btn btn-sm justify-start truncate m-1"
        />
        <span className="text-sm text-gray-400">Subject</span>
        <SelectDropdown
          options={subjectOptions}
          selectedValue={selectedSubject}
          onSelect={setSelectedSubject}
          buttonClassName="btn btn-sm justify-start truncate m-1"
        />
      </div>

      {/* SWOT Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map(({ label, icon, color, border }) => (
          <SwotSection
            key={label} // Unique key for list rendering
            label={label}
            icon={icon}
            color={color}
            border={border}
            data={swotData} // Pass the entire swotData to the section for rendering relevant content
            selectedSubject={selectedSubject}
          />
        ))}
      </div>
    </div>
  );
};

export default ESWOT;