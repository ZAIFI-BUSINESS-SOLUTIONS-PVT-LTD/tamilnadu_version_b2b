import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Index, Contact, PricingPage, BlogPage, BlogPostPage } from "./landing page/pages/index";
import LoginOptions from './auth/loginoptions';
import StudentLogin from './auth/student/studentlogin';
import EducatorLogin from './auth/educator/educatorlogin';
import InstitutionLogin from './auth/institution/institutionlogin';
import EducatorRegister from './auth/educator/educatorregister';
import AdminLogin from './auth/admin/adminlogin.jsx';
import Unauthorized from './auth/Unauthorized';
import ErrorPage from "./auth/ErrorPage";
import WaitingPage from "./auth/WaitingPage";
import './App.css';
import ScrollToTop from './dashboards/components/ScrollToTop';
import PageLoader from './components/ui/PageLoader';
import Report from './dashboards/educator/Report.jsx';
import TeacherReport from './dashboards/educator/TeacherReport.jsx';
import StudentReport from './dashboards/student/StudentReport.jsx';
import ForgotPassword from './auth/ForgotPassword';
import ResetPassword from './auth/ResetPassword';

// Import educator layout and nested pages
import {
  ELayout,
  EDashboard,
  ESWOT,
  EUpload,
  EResults,
  EChatbot
} from './dashboards/educator';

// Import student layout and nested pages
import {
  SLayout,
  SDashboard,
  SSWOT,
  SPerformance
} from './dashboards/student';

// Import institution layout and nested pages
import {
  ILayout,
  IDashboard,
  IAnalysis,
  IStudentDetails,
  IUpload
} from './dashboards/institution';


function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader />}>
              <Index />
            </Suspense>
          }
        />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />

        <Route path="/report" element={<Report />} />
        <Route path="/teacher-report" element={<TeacherReport />} />
        <Route path="/student-report" element={<StudentReport />} />

        <Route path="/auth" element={<LoginOptions />} />
        <Route path="/auth/student/login" element={<StudentLogin />} />
        <Route path="/auth/educator/login" element={<EducatorLogin />} />
        <Route path="/auth/institution/login" element={<InstitutionLogin />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="chatbot" element={<EChatbot />} />
        </Route>
        {/* Student protected pages via layout */}
        <Route path="/student/*" element={<SLayout />}>
          <Route path="dashboard" element={<SDashboard />} />
          <Route path="swot" element={<SSWOT />} />
          <Route path="performance" element={<SPerformance />} />
        </Route>

        {/* Institution protected pages via layout */}
        <Route path="/institution/*" element={<ILayout />}>
          <Route path="dashboard" element={<IDashboard />} />
          <Route path="analysis" element={<IAnalysis />} />
          <Route path="students" element={<IStudentDetails />} />
          <Route path="upload" element={<IUpload />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;