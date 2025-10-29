import React from "react";
import { Routes, Route } from "react-router-dom";
import { Index, Contact, PricingPage, FAQPage } from "./landing page/pages/index";
import LoginOptions from './auth/loginoptions';
import StudentLogin from './auth/student/studentlogin';
import EducatorLogin from './auth/educator/educatorlogin';
import EducatorRegister from './auth/educator/educatorregister';
import AdminLogin from './auth/admin/adminlogin.jsx';
import Unauthorized from './auth/Unauthorized';
import ErrorPage from "./auth/ErrorPage";
import WaitingPage from "./auth/WaitingPage";
import './App.css';
import ScrollToTop from './dashboards/components/ScrollToTop';
import Report from './dashboards/educator/Report.jsx';
import TeacherReport from './dashboards/educator/TeacherReport.jsx';
import StudentReport from './dashboards/student/StudentReport.jsx';

// Import educator layout and nested pages
import {
  ELayout,
  EDashboard,
  ESWOT,
  EUpload,
  EResults
} from './dashboards/educator';

// Import student layout and nested pages
import {
  SLayout,
  SDashboard,
  SSWOT,
  SPerformance
} from './dashboards/student';


function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/faq" element={<FAQPage />} />

        <Route path="/report" element={<Report />} />
        <Route path="/teacher-report" element={<TeacherReport />} />
        <Route path="/student-report" element={<StudentReport />} />

        <Route path="/auth" element={<LoginOptions />} />
        <Route path="/auth/student/login" element={<StudentLogin />} />
        <Route path="/auth/educator/login" element={<EducatorLogin />} />
        <Route path="/auth/admin/login" element={<AdminLogin />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/register" element={<EducatorRegister />} />
        <Route path="/wait" element={<WaitingPage />} />
        <Route path="/csverror" element={<ErrorPage />} />

        {/* Educator protected pages via layout */}
        <Route path="/educator/*" element={<ELayout />}>
          <Route path="dashboard" element={<EDashboard />} />
          <Route path="upload" element={<EUpload />} />
          <Route path="swot" element={<ESWOT />} />
          <Route path="students" element={<EResults />} />
        </Route>
        {/* Student protected pages via layout */}
        <Route path="/student/*" element={<SLayout />}>
          <Route path="dashboard" element={<SDashboard />} />
          <Route path="swot" element={<SSWOT />} />
          <Route path="performance" element={<SPerformance />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;