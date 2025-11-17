import React from 'react';
import { CheckCircle, XCircle, ArrowCircleUp, WarningCircle } from '@phosphor-icons/react';
import { fetchEducatorSWOT, fetchAvailableSwotTests_Educator } from '../../utils/api';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../components/ui/dropdown-menu.jsx';
import useSwotData from '../components/hooks/z_swot/z_useSwotData';
import SwotSection from '../shared/SWOT.jsx';
import { Button } from '../../components/ui/button.jsx';

// Static list of subjects available for SWOT analysis.
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
    availableTests = [],
    swotData,
    loading,
    error
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

  // Active tab for mobile view (top-level hook)
  const [activeTab, setActiveTab] = React.useState(sections[0].label);

  // Map each section to its active color and focus ring classes
  const tabStyles = {
    Strengths: { bg: 'bg-green-600 text-white', icon: 'text-white' },
    Weaknesses: { bg: 'bg-yellow-500 text-white', icon: 'text-white' },
    Opportunities: { bg: 'bg-orange-500 text-white', icon: 'text-white' },
    Threats: { bg: 'bg-purple-600 text-white', icon: 'text-white' }
  };

  // Lightweight dropdown built from the project's dropdown-menu primitives.
  const DropdownSelect = ({ options = [], selectedValue, onSelect, buttonClassName }) => {
    const selected = options.find(o => o.value === selectedValue);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" asChild className={buttonClassName || 'justify-start truncate'}>
            <button>
              {selected ? selected.label : 'Select'}
            </button>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {options.map(opt => (
            <DropdownMenuItem key={String(opt.value)} onClick={() => onSelect && onSelect(opt.value)}>
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // --- Conditional Rendering for Loading and Error States ---

  // Display a loading indicator while data is being fetched.
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <svg
          className="animate-spin h-8 w-8 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <p className="text-gray-600">Loading SWOT insights...</p>
      </div>
    );
  }

  // Display an error message if data fetching failed.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="alert alert-error max-w-md shadow-lg">
          <WarningCircle className="stroke-current shrink-0 h-6 w-6" weight="bold" />
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
    <div className="mt-6 sm:p-6 space-y-4">
      {/* Filters Section: Test and Subject Selectors */}
      <div className="flex items-center space-x-4 mb-4 border-b border-base-200 pb-4">
        <span className="text-sm text-gray-400">Test</span>
        <DropdownSelect
          options={testOptions}
          selectedValue={selectedTest}
          onSelect={setSelectedTest}
          buttonClassName="justify-start truncate m-1"
        />
        <span className="text-sm text-gray-400">Subject</span>
        <DropdownSelect
          options={subjectOptions}
          selectedValue={selectedSubject}
          onSelect={setSelectedSubject}
          buttonClassName="justify-start truncate m-1"
        />
      </div>

      {/* Mobile: tabbed view for SWOT categories */}
      <div className="lg:hidden">
        {/** activeTab controls which category is shown on small screens **/}
        <div>
          <div className="flex space-x-2 overflow-x-auto pb-2 px-1" role="tablist" aria-label="SWOT categories">
            {sections.map(({ label, icon }) => {
              const isActive = activeTab === label;
              const styles = tabStyles[label] || {};
              return (
                <Button
                  key={label}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(label)}
                  size="sm"
                  className={`flex items-center gap-2 shadow-none border border-gray-300 h-10 whitespace-nowrap px-4 py-2 rounded-full text-sm ${isActive ? `${styles.bg}` : 'bg-white text-gray-600'}`}>
                  {React.cloneElement(icon, { className: `mr-1 ${isActive ? styles.icon : 'text-gray-500'}` })}
                  <span className="font-medium">{label}</span>
                </Button>
              );
            })}
          </div>

          <div className="mt-2">
            {(() => {
              const activeSection = sections.find(s => s.label === activeTab) || sections[0];
              return (
                <SwotSection
                  label={activeSection.label}
                  icon={activeSection.icon}
                  color={activeSection.color}
                  border={activeSection.border}
                  data={swotData}
                  selectedSubject={selectedSubject}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* SWOT Sections Grid */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
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