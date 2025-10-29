import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TextAlignLeft,
  House,
  UploadSimple,
  Student,
  SignOut,
  Files,
  CaretDown,
  CaretRight,
  ChalkboardTeacher,
  Target,
  Bell,
  List
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from 'framer-motion';
import { useUserData } from '../components/hooks/z_header/z_useUserData';
import { fetcheducatordetail, fetchAvailableSwotTests_Educator, fetcheducatorstudent } from '../../utils/api';
import HeaderBase from '../shared/header/HeaderBase.jsx';
import UserDropdown from '../shared/header/UserDropDown.jsx';
import DesktopSidebar from '../shared/header/DesktopSidebar.jsx';
import MobileSidebar from '../shared/header/MobileSideBar.jsx';
import TeacherReportModal from './components/e_teacherreport.jsx';
import StudentReportModal from './components/e_studentreport.jsx';

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

  // State for controlling the visibility of the mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States for controlling the visibility of report modals
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);

  // State for controlling the collapsed state of the 'Reports' section in the sidebar
  const [isReportsCollapsed, setIsReportsCollapsed] = useState(true);

  // States for managing notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // State for student list and test list for the report modal
  const [students, setStudents] = useState([]);
  const [availableTests, setAvailableTests] = useState(['Overall']);

  // React Router hooks for navigation and current location
  const navigate = useNavigate();
  const location = useLocation(); // Used by child components, but not directly in EducatorHeader's JSX logic

  /**
   * Mocks notification data on component mount.
   * In a real application, this useEffect would be used to fetch
   * notifications from an API endpoint.
   */
  useEffect(() => {
    setNotifications([
      { id: 1, text: 'New student assessment uploaded', time: '10m ago', read: false },
      { id: 2, text: 'Monthly reports are ready for review', time: '1h ago', read: false },
      { id: 3, text: 'Staff meeting scheduled for tomorrow', time: '2h ago', read: true }
    ]);
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * Calculates the number of unread notifications.
   * @type {number}
   */
  const unreadCount = notifications.filter(n => !n.read).length;

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
      text: 'Dashboard',
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
      text: 'SWOT Analysis',
      activePattern: /^\/educator\/swot/
    },
    {
      to: '/educator/students',
      icon: <Student weight="regular" size={20} />,
      text: 'Students',
      activePattern: /^\/educator\/students/
    },
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
      children: isReportsCollapsed ? [] : reportItems
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
   * Marks all current notifications as read.
   * In a real app, this would typically send an API request to update notification status on the server.
   */
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
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

      {/* Mobile Header (visible on small screens) */}
      <HeaderBase isMobile>
        <div className="flex items-center justify-between w-full px-4 py-3">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="btn btn-ghost flex items-center justify-center rounded-xl p-2 hover:bg-gray-100 transition-colors"
            aria-label="Open sidebar"
          >
            <List size={24} className="text-gray-700" />
          </button>

          {/* App Logo for Mobile */}
          <div className="flex-1 text-center">
            <span className="font-semibold text-gray-800 text-lg">
              Inzight<span className="bg-gradient-to-br from-blue-600 to-blue-400 text-transparent bg-clip-text">Ed</span>
            </span>
          </div>

          {/* Mobile Notification and User Dropdown */}
          <div className="flex items-center gap-3">
            {/* Notifications Bell Icon and Dropdown */}
            <div className="relative">
              <button
                className="btn btn-ghost rounded-xl relative hover:bg-gray-100 transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
                // Provide an accessible label for screen readers
                aria-label={unreadCount > 0 ? `Notifications - ${unreadCount} unread` : "No new notifications"}
              >
                <Bell size={22} className="text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Content (animated) */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                    role="menu" // ARIA role for dropdown menu
                    aria-orientation="vertical"
                  >
                    <div className="flex justify-between items-center p-3 border-b">
                      <h3 className="font-medium">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                            role="menuitem" // ARIA role for menu item
                          >
                            <p className="text-sm">{notification.text}</p>
                            <p className="text-sm text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No notifications
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-center border-t">
                      <button
                        className="text-sm text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setShowNotifications(false); // Close dropdown before navigating
                          navigate('/educator/notifications');
                        }}
                        role="menuitem" // ARIA role for menu item
                      >
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Dropdown for Mobile */}
            <UserDropdown
              userInfo={educatorInfo}
              onLogout={handleLogout}
              type="educator"
            />
          </div>
        </div>
      </HeaderBase>

      {/* Mobile Sidebar Component */}
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        items={sidebarItems}
        additionalItems={additionalItems}
        onLogout={handleLogout}
        userInfo={educatorInfo}
      />

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
          className="bg-white fixed top-0 right-0 z-30 h-20 flex items-center justify-between transition-all duration-300 px-8 border-b border-gray-200" // Added border-b for better separation
          style={{
            left: isSidebarCollapsed ? "5rem" : "16rem", // Adjusts based on sidebar collapse state
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
                {getGreeting()}, <span className="text-blue-600">{isLoading ? "Educator" : educatorInfo.name.split(' ')[0]}</span>
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Bell Icon and Dropdown (Desktop) */}
            <div className="relative">
              <button
                className="btn btn-ghost btn-circle relative hover:bg-gray-100 transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
                // Provide an accessible label for screen readers
                aria-label={unreadCount > 0 ? `Notifications - ${unreadCount} unread` : "No new notifications"}
              >
                <Bell size={22} className="text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Content (animated) */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <div className="flex justify-between items-center p-3 border-b">
                      <h3 className="font-medium">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                            role="menuitem"
                          >
                            <p className="text-sm">{notification.text}</p>
                            <p className="text-sm text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No notifications
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-center border-t">
                      <button
                        className="text-sm text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setShowNotifications(false); // Close dropdown before navigating
                          navigate('/educator/notifications');
                        }}
                        role="menuitem"
                      >
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
    </>
  );
};

export default EducatorHeader;