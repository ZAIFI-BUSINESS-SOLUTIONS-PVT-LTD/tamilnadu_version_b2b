import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  House,
  Target,
  ChartBar,
  Files,
  TextAlignLeft
} from "@phosphor-icons/react";
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';
import { fetchstudentdetail } from '../../utils/api.js';
import DesktopSidebar from '../components/header/DesktopSidebar.jsx';
import UserDropdown from '../components/header/UserDropDown.jsx';
import DownloadReportModal from './components/s_studentreport.jsx';
import StudentHeaderMobile from './s_header-mobile.jsx';

/**
 * StudentHeader Component
 *
 * This component serves as the desktop header and navigation control for the student's dashboard.
 * It provides the desktop layout, including sidebar toggling,
 * student information display, and navigation links to various sections relevant to a student.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isSidebarCollapsed - Controls the collapsed state of the desktop sidebar.
 * @param {function} props.toggleSidebarCollapse - Function to toggle the collapse state of the desktop sidebar.
 * @returns {JSX.Element} The rendered StudentHeader component.
 */
const StudentHeader = ({ isSidebarCollapsed, toggleSidebarCollapse }) => {
  // Fetch student user data using a custom hook
  const { userData: studentInfo, isLoading } = useUserData(fetchstudentdetail, { name: '', student_id: '' });

  // State for controlling the visibility of the student report download modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // React Router hooks for navigation and current location
  const navigate = useNavigate();
  const location = useLocation(); // This hook is likely used by child components like DesktopSidebar and MobileSidebar to determine active links.

  /**
   * Defines the main navigation items for the sidebar specific to a student.
   * Each item specifies a path, icon, display text, and a regex pattern
   * to determine if the link is currently active.
   * @type {Array<object>}
   */
  const sidebarItems = [
    {
      to: '/student/dashboard',
      icon: <House weight="regular" size={20} />,
      text: 'Home',
      activePattern: /^\/student\/dashboard/
    },
    {
      to: '/student/swot',
      icon: <Target weight="regular" size={20} />,
      text: 'Analysis',
      activePattern: /^\/student\/swot/
    },
    {
      to: '/student/performance',
      icon: <ChartBar weight="regular" size={20} />,
      text: 'Performance',
      activePattern: /^\/student\/performance/
    },
  ];

  /**
   * Defines additional sidebar items, such as the "Download Report" option.
   * This component uses a flat list for additional items, unlike the EducatorHeader
   * which features a collapsible section.
   * @type {Array<object>}
   */
  const additionalItems = [
    {
      icon: <Files weight="regular" size={20} />,
      text: 'Download Report',
      onClick: () => setShowDownloadModal(true) // Triggers the DownloadReportModal
    }
  ];

  /**
   * Handles the user logout process.
   * Clears authentication tokens from local storage and navigates to the authentication page.
   */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("first_time_login");
    navigate("/auth");
  };

  /**
   * Returns a time-based greeting (Good morning, Good afternoon, Good evening).
   * The greeting adjusts based on the current hour.
   * @returns {string} The appropriate greeting.
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <>
      {/* Conditional rendering of the DownloadReportModal */}
      {showDownloadModal && (
        <DownloadReportModal onClose={() => setShowDownloadModal(false)} />
      )}

      {/* Desktop Layout (hidden on small screens, visible on medium and larger) */}
      <div className="hidden md:flex">
        {/* Desktop Sidebar Component */}
        <DesktopSidebar
          items={sidebarItems}
          additionalItems={additionalItems}
          isCollapsed={isSidebarCollapsed}
          onLogout={handleLogout}
          userInfo={studentInfo}
        />

        {/* Desktop Header Bar */}
        <header
          className="bg-white fixed top-0 right-0 z-30 h-20 flex items-center justify-between transition-all duration-300 px-8 border-b border-gray-200" // Added border-b for consistency
          style={{
            left: isSidebarCollapsed ? "5rem" : "16rem", // Dynamically adjusts based on sidebar collapse state
          }}
        >
          <div className="flex items-center gap-4">
            {/* Toggle Sidebar Collapse Button */}
            <button
              onClick={toggleSidebarCollapse}
              className="btn btn-sm h-10 w-10 btn-square bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <TextAlignLeft size={20} />
            </button>

            {/* Greeting and Current Date */}
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-gray-800 font-poppins">
                {getGreeting()}, <span className="text-blue-600">{isLoading ? "Student" : studentInfo.name.split(' ')[0]}</span>
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Dropdown for Desktop */}
            <div className="relative">
              <UserDropdown
                userInfo={studentInfo}
                onLogout={handleLogout}
                type="student"
              />
            </div>
          </div>
        </header>
      </div>

      <StudentHeaderMobile />
    </>
  );
};

export default StudentHeader;