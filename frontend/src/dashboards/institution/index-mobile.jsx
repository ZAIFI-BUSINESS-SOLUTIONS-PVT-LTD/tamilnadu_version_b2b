import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Home, Target, User, UploadCloud, FileText } from 'lucide-react';

import { useInstitution } from './index.jsx';
import { useInstitutionEducatorStudents, useAvailableSwotTestsEducator } from '../../hooks/useInstitutionData.js';

import MobileDock from '../components/header/MobileDock.jsx';
import TeacherReportModal from './components/i_teacherreport.jsx';
import StudentReportModal from './components/i_studentreport.jsx';
import InstitutionHeaderMobile from './i_header-mobile.jsx';

// Mobile ILayout component
export const ILayout = () => {
  const navigate = useNavigate();
  const { selectedEducatorId } = useInstitution();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);

  const { data: studentsData } = useInstitutionEducatorStudents(selectedEducatorId);
  const { data: availableTestsData } = useAvailableSwotTestsEducator();

  const students = React.useMemo(() => {
    return Array.isArray(studentsData?.students) ? studentsData.students : [];
  }, [studentsData]);

  const availableTests = React.useMemo(() => {
    if (!availableTestsData) return ['Overall'];
    const uniqueTests = [...new Set(availableTestsData)].filter((num) => num !== 0);
    return ['Overall', ...uniqueTests.map((num) => `Test ${num}`)];
  }, [availableTestsData]);

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

