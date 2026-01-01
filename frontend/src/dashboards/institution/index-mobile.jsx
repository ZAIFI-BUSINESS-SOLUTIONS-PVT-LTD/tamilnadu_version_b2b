import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Target, User, UploadCloud, FileText } from 'lucide-react';

import { useInstitution } from './index.jsx';
import {
  fetchAvailableSwotTests_Educator,
  fetchInstitutionEducatorStudents,
} from '../../utils/api.js';

import MobileDock from '../components/header/MobileDock.jsx';
import TeacherReportModal from './components/i_teacherreport.jsx';
import StudentReportModal from './components/i_studentreport.jsx';
import InstitutionHeaderMobile from './i_header-mobile.jsx';

// Mobile ILayout component
export const ILayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedEducatorId } = useInstitution();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);
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
      to: '/institution/upload',
      icon: <UploadCloud size={20} />,
      text: 'Upload',
      activePattern: /^\/institution\/upload/
    },
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
    localStorage.removeItem('userRole');
    navigate('/auth/institution/login');
  };

  useEffect(() => {
    async function loadStudents() {
      try {
        if (!selectedEducatorId) {
          setStudents([]);
          return;
        }
        const data = await fetchInstitutionEducatorStudents(selectedEducatorId);
        setStudents(Array.isArray(data?.students) ? data.students : []);
      } catch (_err) {
        setStudents([]);
      }
    }

    async function loadTests() {
      try {
        const tests = await fetchAvailableSwotTests_Educator();
        const uniqueTests = [...new Set(tests)].filter((num) => num !== 0);
        setAvailableTests(['Overall', ...uniqueTests.map((num) => `Test ${num}`)]);
      } catch (_err) {
        setAvailableTests(['Overall']);
      }
    }

    loadStudents();
    loadTests();
  }, [selectedEducatorId, location.pathname]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Modals */}
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

      <InstitutionHeaderMobile />

      <MobileDock
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        items={sidebarItems}
        additionalItems={additionalItems}
        onLogout={handleLogout}
        userInfo={{ name: 'Institution Admin', inst: 'Institution' }}
      />

      <main className="flex-1 flex flex-col pt-14 pb-24 overflow-auto">
        <div style={{ maxWidth: '1500px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

