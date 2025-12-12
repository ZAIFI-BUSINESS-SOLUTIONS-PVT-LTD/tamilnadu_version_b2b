import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Upload,
  Users,
  FileText,
  Target
} from "lucide-react";
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';
import { fetcheducatordetail, fetchAvailableSwotTests_Educator, fetcheducatorstudent } from '../../utils/api.js';
import MobileDock from '../components/header/MobileDock.jsx';
import TeacherReportModal from './components/e_teacherreport.jsx';
import StudentReportModal from './components/e_studentreport.jsx';
import EducatorHeaderMobile from './e_header-mobile.jsx';

// Mobile ELayout component
export const ELayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hideHeaderRoutes = ['/educator/swot', '/educator/upload'];
  const shouldShowHeader = !hideHeaderRoutes.some(prefix => location.pathname.startsWith(prefix));

  // Fetch educator user data
  const { userData: educatorInfo, isLoading } = useUserData(fetcheducatordetail, { name: '', inst: '' });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [availableTests, setAvailableTests] = useState(['Overall']);

  const sidebarItems = [
    {
      to: '/educator/dashboard',
      icon: <Home size={20} />,
      text: 'Home',
      activePattern: /^\/educator\/dashboard/
    },
    {
      to: '/educator/upload',
      icon: <Upload size={20} />,
      text: 'Upload',
      activePattern: /^\/educator\/upload/
    },
    {
      to: '/educator/swot',
      icon: <Target size={20} />,
      text: 'SWOT',
      activePattern: /^\/educator\/swot/
    },
    {
      to: '/educator/students',
      icon: <Users size={20} />,
      text: 'Students',
      activePattern: /^\/educator\/students/
    }
  ];

  const additionalItems = [
    {
      icon: <FileText size={20} />,
      text: 'Student Report',
      onClick: () => setShowStudentReportModal(true)
    },
    {
      icon: <FileText size={20} />,
      text: 'Teacher Report',
      onClick: () => setShowTeacherReportModal(true)
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('first_time_login');
    navigate('/auth');
  };

  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await fetcheducatorstudent();
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (err) {
        setStudents([]);
      }
    }

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
    <div className="flex h-screen bg-gray-50 text-text">
      {/* Modals */}
      {showStudentReportModal && (
        <StudentReportModal onClose={() => setShowStudentReportModal(false)} students={students} availableTests={availableTests} />
      )}
      {showTeacherReportModal && (
        <TeacherReportModal onClose={() => setShowTeacherReportModal(false)} />
      )}

      {shouldShowHeader && <EducatorHeaderMobile />}

      <MobileDock
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        items={sidebarItems}
        additionalItems={additionalItems}
        onLogout={handleLogout}
        userInfo={educatorInfo}
      />

      <main className={`flex-1 flex flex-col ${shouldShowHeader ? 'pt-14 pb-24' : 'pt-0 pb-24'} overflow-auto`}>
        <div style={{ maxWidth: '1500px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Export educator pages for easy import
export { default as EDashboard } from './e_dashboard.jsx';
export { default as ESWOT } from './e_analysis.jsx';
export { default as EUpload } from './e_upload.jsx';
export { default as EResults } from './e_studentdetails.jsx';
export { default as EChatbot } from './e_chatbot.jsx';
