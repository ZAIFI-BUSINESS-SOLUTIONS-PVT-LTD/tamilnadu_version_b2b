import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  WandSparkles,
  Blocks,
  FileText,
  AlignLeft,
  GraduationCap
} from "lucide-react";
import { useStudentDetails } from '../../hooks/useStudentData';
import DesktopSidebar from '../components/header/DesktopSidebar.jsx';
import UserDropdown from '../components/header/UserDropDown.jsx';
import DownloadReportModal from './components/s_studentreport.jsx';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';
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
  // Fetch student user data using cached react-query hook
  const { data: studentInfo = {}, isLoading } = useStudentDetails();

  // State for controlling the visibility of the student report download modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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
      icon: <Home size={20} />,
      text: 'Home',
      activePattern: /^\/student\/dashboard$/
    },
    {
      to: '/student/swot',
      icon: <WandSparkles size={20} />,
      text: 'AI Analysis',
      activePattern: /^\/student\/swot/
    },
    {
      to: '/student/performance',
      icon: <Blocks size={20} />,
      text: 'Chapters & Topics',
      activePattern: /^\/student\/performance/
    },
    {
      to: '/student/report-card',
      icon: <GraduationCap size={20} />,
      text: 'Report Card',
      activePattern: /^\/student\/report-card/
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
      icon: <FileText size={20} />,
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

      {/* Conditional rendering of the FeedbackModal */}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} userType="student" />
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
          className="bg-card fixed top-0 right-0 z-30 h-20 flex items-center justify-between transition-all duration-300 px-8 border-b border-foreground/10"
          style={{
            left: isSidebarCollapsed ? "5rem" : "16rem",
          }}
        >
          <div className="flex items-center gap-4">
            {/* Toggle Sidebar Collapse Button */}
            <button
              onClick={toggleSidebarCollapse}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <AlignLeft size={20} />
            </button>

            {/* Greeting and Current Date */}
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-foreground font-poppins">
                {getGreeting()}, <span className="text-blue-600">{studentInfo?.name?.split?.(' ')[0] || 'Student'}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Separator */}
            <div className="h-8 w-px bg-border mx-1"></div>

            {/* User Dropdown for Desktop */}
            <div className="relative">
              <UserDropdown
                userInfo={studentInfo}
                onLogout={handleLogout}
                type="student"
                onFeedback={() => setShowFeedbackModal(true)}
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