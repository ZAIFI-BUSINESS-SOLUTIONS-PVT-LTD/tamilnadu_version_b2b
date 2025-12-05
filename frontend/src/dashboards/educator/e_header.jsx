import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextAlignLeft,
  House,
  UploadSimple,
  Student,
  Files,
  CaretDown,
  CaretRight,
  ChalkboardTeacher,
  Target,
  ChatCircleDots,
  List
} from "@phosphor-icons/react";
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';
import { fetcheducatordetail, fetchAvailableSwotTests_Educator, fetcheducatorstudent } from '../../utils/api.js';
import UserDropdown from '../components/header/UserDropDown.jsx';
import DesktopSidebar from '../components/header/DesktopSidebar.jsx';
import TeacherReportModal from './components/e_teacherreport.jsx';
import StudentReportModal from './components/e_studentreport.jsx';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';
import EducatorHeaderMobile from './e_header-mobile.jsx';

/**
 * EducatorHeader Component
 *
 * This component serves as the main header and navigation control for the educator's dashboard.
 * It provides responsive layouts for mobile and desktop, including sidebar toggling,
 * user information display, notifications, and navigation links to various sections.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isSidebarCollapsed - Controls the collapsed state of the desktop sidebar.
 * @param {function} props.toggleSidebarCollapse - Function to toggle the collapse state of the desktop sidebar.
 * @returns {JSX.Element} The rendered EducatorHeader component.
 */
const EducatorHeader = ({ isSidebarCollapsed, toggleSidebarCollapse }) => {
  // Fetch educator user data using a custom hook
  const { userData: educatorInfo, isLoading } = useUserData(fetcheducatordetail, { name: '', inst: '' });

  // States for controlling the visibility of report modals
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // State for controlling the collapsed state of the 'Reports' section in the sidebar
  const [isReportsCollapsed, setIsReportsCollapsed] = useState(true);

  // States for managing notifications
  // notifications removed from header UI

  // State for student list and test list for the report modal
  const [students, setStudents] = useState([]);
  const [availableTests, setAvailableTests] = useState(['Overall']);

  // React Router hooks for navigation
  const navigate = useNavigate();


  /**
   * Defines the main navigation items for the sidebar.
   * Each item specifies a path, icon, display text, and a regex pattern
   * to determine if the link is currently active.
   * @type {Array<object>}
   */
  const sidebarItems = [
    {
      to: '/educator/dashboard',
      icon: <House weight="regular" size={20} />,
      text: 'Home',
      activePattern: /^\/educator\/dashboard/
    },
    {
      to: '/educator/upload',
      icon: <UploadSimple weight="regular" size={20} />,
      text: 'Upload',
      activePattern: /^\/educator\/upload/
    },
    {
      to: '/educator/swot',
      icon: <Target weight="regular" size={20} />,
      text: 'Analysis',
      activePattern: /^\/educator\/swot/
    },
    {
      to: '/educator/students',
      icon: <Student weight="regular" size={20} />,
      text: 'Students',
      activePattern: /^\/educator\/students/
    },
    // {
    //   to: '/educator/chatbot',
    //   icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="4" stroke="currentColor" strokeWidth="2"/><circle cx="8.5" cy="12" r="1.5" fill="currentColor"/><circle cx="15.5" cy="12" r="1.5" fill="currentColor"/></svg>,
    //   text: 'Chatbot',
    //   activePattern: /^\/educator\/chatbot/
    // },
  ];

  /**
   * Defines the sub-items for the 'Reports' section.
   * These items trigger modal displays rather than direct navigation.
   * @type {Array<object>}
   */
  const reportItems = [
    {
      icon: <Student size={20} />,
      text: 'Student Report',
      onClick: () => setShowStudentReportModal(true)
    },
    {
      icon: <ChalkboardTeacher size={20} />,
      text: 'Teacher Report',
      onClick: () => setShowTeacherReportModal(true)
    }
  ];

  /**
   * Defines additional sidebar items, including collapsible sections like 'Reports'.
   * @type {Array<object>}
   */
  const additionalItems = [
    {
      icon: <Files size={20} weight={isReportsCollapsed ? 'regular' : 'fill'} />,
      text: 'Reports',
      isParent: true,
      isCollapsed: isReportsCollapsed,
      onClick: () => {
        if (isSidebarCollapsed) {
          toggleSidebarCollapse(); // Expand the sidebar
          setTimeout(() => setIsReportsCollapsed(false), 300); // Wait for animation, then expand subitems
        } else {
          setIsReportsCollapsed(!isReportsCollapsed);
        }
      },
      caretIcon: isReportsCollapsed ? <CaretRight size={16} /> : <CaretDown size={16} />,
      // Always provide the children for mobile dock popups. Desktop will respect `isCollapsed`.
      children: reportItems
    },
    {
      icon: <ChatCircleDots weight="regular" size={20} />,
      text: 'Feedback',
      onClick: () => setShowFeedbackModal(true)
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
   * @returns {string} The appropriate greeting.
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    // Fetch students for dropdown
    async function loadStudents() {
      try {
        // Use fetcheducatorstudent instead of fetchEducatorStudents
        const data = await fetcheducatorstudent();
        // The API returns an object with a 'students' array
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (err) {
        setStudents([]);
      }
    }
    // Fetch available tests for dropdown
    async function loadTests() {
      try {
        const tests = await fetchAvailableSwotTests_Educator();
        const uniqueTests = [...new Set(tests)].filter((num) => num !== 0);
        setAvailableTests(['Overall', ...uniqueTests.map((num) => `Test ${num}`)]);
      } catch (err) {
        setAvailableTests(['Overall']);
      }
    }
    loadStudents();
    loadTests();
  }, []);

  return (
    <>
      {/* Conditional rendering of report modals */}
      {showStudentReportModal && (
        <StudentReportModal
          onClose={() => setShowStudentReportModal(false)}
          students={students}
          availableTests={availableTests}
        />
      )}
      {showTeacherReportModal && (
        <TeacherReportModal onClose={() => setShowTeacherReportModal(false)} />
      )}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} userType="educator" />
      )}

      {/* Desktop Layout (visible on medium and larger screens) */}
      <div className="hidden md:flex">
        {/* Desktop Sidebar Component */}
        <DesktopSidebar
          items={sidebarItems}
          additionalItems={additionalItems}
          isCollapsed={isSidebarCollapsed}
          onLogout={handleLogout}
          userInfo={educatorInfo}
        />

        {/* Desktop Header Bar */}
        <header
          className="bg-white fixed top-0 right-0 z-30 h-20 flex items-center justify-between transition-all duration-300 px-8 border-b border-gray-200"
          style={{
            left: isSidebarCollapsed ? "5rem" : "16rem",
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
                {getGreeting()}, <span className="text-blue-600">{isLoading ? "Educator" : (educatorInfo?.name?.split?.(' ')[0] ?? 'Educator')}</span>
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Separator */}
            <div className="h-8 w-px bg-gray-200 mx-1"></div>

            {/* User Dropdown for Desktop */}
            <div className="relative">
              <UserDropdown
                userInfo={educatorInfo}
                onLogout={handleLogout}
                type="educator"
              />
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Header component (kept separate) */}
      <EducatorHeaderMobile />
    </>
  );
};

export default EducatorHeader;