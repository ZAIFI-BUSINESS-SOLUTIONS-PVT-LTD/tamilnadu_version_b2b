import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlignLeft, Home, User, FileText, Target, UploadCloud, ChevronRight, ChevronDown, BarChart3 } from 'lucide-react';
import { useInstitution } from './index.jsx';
import DesktopSidebar from '../components/header/DesktopSidebar.jsx';
import UserDropdown from '../components/header/UserDropDown.jsx';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';
// Classroom selector moved to individual pages
import { fetchAvailableSwotTests_Educator, fetchInstitutionEducatorStudents } from '../../utils/api.js';
import TeacherReportModal from './components/i_teacherreport.jsx';
import StudentReportModal from './components/i_studentreport.jsx';

const InstitutionHeader = ({ isSidebarCollapsed, toggleSidebarCollapse }) => {
  const { selectedEducatorId } = useInstitution();
  const navigate = useNavigate();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);
  const [isReportsCollapsed, setIsReportsCollapsed] = useState(true);
  const [students, setStudents] = useState([]);
  const [availableTests, setAvailableTests] = useState(['Overall']);

  const sidebarItems = [
    {
      to: '/institution/dashboard',
      icon: <Home size={20} />,
      text: 'Home',
      activePattern: /^\/institution\/dashboard/
    },
    {
      to: '/institution/analysis',
      icon: <Target size={20} />,
      text: 'Analysis',
      activePattern: /^\/institution\/analysis/
    },
    {
      to: '/institution/students',
      icon: <User size={20} />,
      text: 'Classrooms',
      activePattern: /^\/institution\/students/
    },
    {
      to: '/institution/test-performance',
      icon: <BarChart3 size={20} />,
      text: 'Test Performance',
      activePattern: /^\/institution\/test-performance/
    },
    {
      to: '/institution/upload',
      icon: <UploadCloud size={20} />,
      text: 'Upload',
      activePattern: /^\/institution\/upload/
    },
  ];

  const reportItems = [
    {
      icon: <User size={20} />,
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

  useEffect(() => {
    async function loadStudents() {
      try {
        if (!selectedEducatorId) {
          setStudents([]);
          return;
        }
        const data = await fetchInstitutionEducatorStudents(selectedEducatorId);
        setStudents(Array.isArray(data?.students) ? data.students : []);
      } catch {
        setStudents([]);
      }
    }

    async function loadTests() {
      try {
        const tests = await fetchAvailableSwotTests_Educator();
        const uniqueTests = [...new Set(tests)].filter((num) => num !== 0);
        setAvailableTests(['Overall', ...uniqueTests.map((num) => `Test ${num}`)]);
      } catch {
        setAvailableTests(['Overall']);
      }
    }

    if (selectedEducatorId) {
      loadStudents();
      loadTests();
    } else {
      setStudents([]);
      setAvailableTests(['Overall']);
    }
  }, [selectedEducatorId]);

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
      <header className={`fixed top-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30 transition-all duration-300 flex items-center justify-between px-6 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
        <div className="flex items-center gap-4">
          {/* Mobile toggle (visible on small screens) */}
          <button onClick={toggleSidebarCollapse} className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden">
            <AlignLeft size={24} />
          </button>

          {/* Desktop toggle (visible on md+) - matches educator header styling */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden md:inline-flex btn btn-sm h-10 w-10 btn-square bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 items-center justify-center transition-colors"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <AlignLeft size={20} />
          </button>

          <div className="hidden md:flex flex-col">
            <h1 className="text-2xl font-semibold text-gray-800 font-poppins">
              {getGreeting()}, <span className="text-blue-600">Institution Admin</span>
            </h1>
            <p className="text-sm text-gray-500">
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
