import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  House,
  Target,
  ChartBar,
  SignOut,
  Files,
  Bell,
  TextAlignLeft,
  CaretDown, // Not explicitly used for collapsible items in StudentHeader, but imported.
  CaretRight // Not explicitly used for collapsible items in StudentHeader, but imported.
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from 'framer-motion';
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';
import { fetchstudentdetail } from '../../utils/api.js';
import HeaderBase from '../shared/header/HeaderBase.jsx';
import UserDropdown from '../shared/header/UserDropDown.jsx';
import DesktopSidebar from '../shared/header/DesktopSidebar.jsx';
import MobileSidebar from '../shared/header/MobileSideBar.jsx';
import DownloadReportModal from './components/s_studentreport.jsx';

/**
 * StudentHeader Component
 *
 * This component serves as the main header and navigation control for the student's dashboard.
 * It provides responsive layouts for mobile and desktop, including sidebar toggling,
 * student information display, notifications, and navigation links to various sections relevant to a student.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isSidebarCollapsed - Controls the collapsed state of the desktop sidebar.
 * @param {function} props.toggleSidebarCollapse - Function to toggle the collapse state of the desktop sidebar.
 * @returns {JSX.Element} The rendered StudentHeader component.
 */
const StudentHeader = ({ isSidebarCollapsed, toggleSidebarCollapse }) => {
  // Fetch student user data using a custom hook
  const { userData: studentInfo, isLoading } = useUserData(fetchstudentdetail, { name: '', student_id: '' });

  // State for controlling the visibility of the mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State for controlling the visibility of the student report download modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // States for managing notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // React Router hooks for navigation and current location
  const navigate = useNavigate();
  const location = useLocation(); // This hook is likely used by child components like DesktopSidebar and MobileSidebar to determine active links.

  /**
   * Mocks notification data on component mount.
   * In a real application, this useEffect would be used to fetch
   * notifications from an API endpoint specific to the student.
   */
  useEffect(() => {
    setNotifications([
      { id: 1, text: 'New assessment results available', time: '15m ago', read: false },
      { id: 2, text: 'Teacher feedback on your last submission', time: '2h ago', read: false },
      { id: 3, text: 'Upcoming deadline for assignment', time: '1d ago', read: true }
    ]);
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * Calculates the number of unread notifications.
   * @type {number}
   */
  const unreadCount = notifications.filter(n => !n.read).length;

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
      text: 'Dashboard',
      activePattern: /^\/student\/dashboard/
    },
    {
      to: '/student/swot',
      icon: <Target weight="regular" size={20} />,
      text: 'SWOT Analysis',
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
   * Marks all current notifications as read.
   * In a real app, this would typically send an API request to update notification status on the server.
   */
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
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
                // Provide an accessible label for screen readers, dynamically updated
                aria-label={unreadCount > 0 ? `Notifications - ${unreadCount} unread` : "No new notifications"}
              >
                <Bell size={22} className="text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Content (animated using Framer Motion) */}
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
                            role="menuitem" // ARIA role for each notification item
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
                          navigate('/student/notifications');
                        }}
                        role="menuitem" // ARIA role for the "View all" button
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
              userInfo={studentInfo}
              onLogout={handleLogout}
              type="student"
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
        userInfo={studentInfo}
      />

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
              <h1 className="text-xl font-semibold text-gray-800 font-poppins"> {/* Changed text-2xl to text-xl for slightly smaller heading */}
                {getGreeting()}, <span className="text-blue-600">{isLoading ? "Student" : studentInfo.name.split(' ')[0]}</span>
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
                // Provide an accessible label for screen readers, dynamically updated
                aria-label={unreadCount > 0 ? `Notifications - ${unreadCount} unread` : "No new notifications"}
              >
                <Bell size={22} className="text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Content (animated using Framer Motion) */}
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
                          navigate('/student/notifications');
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
                userInfo={studentInfo}
                onLogout={handleLogout}
                type="student"
              />
            </div>
          </div>
        </header>
      </div>
    </>
  );
};

export default StudentHeader;