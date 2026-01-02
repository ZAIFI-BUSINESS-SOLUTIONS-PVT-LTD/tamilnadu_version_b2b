import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlignLeft, Home, UsersRound, FileText, WandSparkles, UploadCloud, ChevronRight, ChevronDown, NotepadText } from 'lucide-react';
import { useInstitution } from './index.jsx';
import DesktopSidebar from '../components/header/DesktopSidebar.jsx';
import UserDropdown from '../components/header/UserDropDown.jsx';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';
// Classroom selector moved to individual pages
import TeacherReportModal from './components/i_teacherreport.jsx';
import StudentReportModal from './components/i_studentreport.jsx';
import { useInstitutionEducatorStudents, useAvailableSwotTestsEducator } from '../../hooks/useInstitutionData.js';

const InstitutionHeader = ({ isSidebarCollapsed, toggleSidebarCollapse }) => {
  const { selectedEducatorId } = useInstitution();
  const navigate = useNavigate();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);
  const [isReportsCollapsed, setIsReportsCollapsed] = useState(true);

  // Use React Query hooks for cached data
  const { data: studentsData } = useInstitutionEducatorStudents(selectedEducatorId);
  const { data: availableTestsData } = useAvailableSwotTestsEducator();

  // Extract data with fallbacks
  const students = studentsData?.students || [];
  const availableTests = availableTestsData ? ['Overall', ...[...new Set(availableTestsData)].filter((num) => num !== 0).map((num) => `Test ${num}`)] : ['Overall'];

  const sidebarItems = [
    {
      to: '/institution/dashboard',
      icon: <Home size={20} />,
      text: 'Home',
      activePattern: /^\/institution\/dashboard/
    },
    {
      to: '/institution/students',
      icon: <UsersRound size={20} />,
      text: 'Classrooms',
      activePattern: /^\/institution\/students/
    },
    {
      to: '/institution/upload',
      icon: <UploadCloud size={20} />,
      text: 'Upload',
      activePattern: /^\/institution\/upload/
    },
    {
      to: '/institution/analysis',
      icon: <WandSparkles size={20} />,
      text: 'AI Analysis',
      activePattern: /^\/institution\/analysis/
    },
    {
      to: '/institution/test-performance',
      icon: <NotepadText size={20} />,
      text: 'Test Performance',
      activePattern: /^\/institution\/test-performance/
    },
  ];

  const reportItems = [
    {
      icon: <UsersRound size={20} />,
      text: 'Student Report',
      onClick: () => setShowStudentReportModal(true)
    },
    {
      icon: <Home size={20} />,
      text: 'Teacher Report',
      onClick: () => setShowTeacherReportModal(true)
    }
  ];

  const additionalItems = [
    {
      icon: <FileText size={20} />,
      text: 'Reports',
      isParent: true,
      isCollapsed: isReportsCollapsed,
      onClick: () => {
        if (isSidebarCollapsed) {
          toggleSidebarCollapse();
          setTimeout(() => setIsReportsCollapsed(false), 300);
        } else {
          setIsReportsCollapsed(!isReportsCollapsed);
        }
      },
      caretIcon: isReportsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />,
      children: reportItems
    },
    // Feedback moved into user dropdown
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/auth/institution/login');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      {/* Conditional rendering of report modals (Institution) */}
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
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} userType="institution" />
      )}

      <DesktopSidebar
        items={sidebarItems}
        additionalItems={additionalItems}
        isCollapsed={isSidebarCollapsed}
        onLogout={handleLogout}
        userInfo={{ name: 'Institution Admin', inst: 'Institution' }}
      />

      {/* Top Bar */}
      <header className={`fixed top-0 right-0 h-20 bg-card border-b border-foreground/10 z-30 transition-all duration-300 flex items-center justify-between px-6 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
        <div className="flex items-center gap-4">
          {/* Mobile toggle (visible on small screens) */}
          <button onClick={toggleSidebarCollapse} className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden focus:outline-none focus:ring-0">
            <AlignLeft size={24} />
          </button>

          {/* Desktop toggle (visible on md+) - matches educator header styling */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-0"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <AlignLeft size={20} />
          </button>

          <div className="hidden md:flex flex-col">
            <h1 className="text-2xl font-semibold text-foreground font-poppins">
              {getGreeting()}, <span className="text-blue-600">Institution Admin</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UserDropdown
            userInfo={{ name: 'Institution Admin', inst: 'Institution' }}
            onLogout={handleLogout}
            onFeedback={() => setShowFeedbackModal(true)}
            type="educator"
          />
        </div>
      </header>
    </>
  );
};

export default InstitutionHeader;
