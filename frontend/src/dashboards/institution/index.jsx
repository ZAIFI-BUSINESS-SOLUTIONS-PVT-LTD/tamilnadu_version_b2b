import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import IHeader from './i_header.jsx';
import { ILayout as ILayoutMobile } from './index-mobile.jsx';
import { useInstitutionEducators } from '../../hooks/useInstitutionData';

export const InstitutionContext = createContext();

export const useInstitution = () => useContext(InstitutionContext);

export const ILayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedEducatorId, setSelectedEducatorId] = useState(null);
  const { data: educatorsData, isLoading } = useInstitutionEducators();

  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';

  const educators = React.useMemo(() => {
    if (!educatorsData || educatorsData.error) return [];
    return Array.isArray(educatorsData) ? educatorsData : (educatorsData.educators || []);
  }, [educatorsData]);

  useEffect(() => {
    if (!selectedEducatorId && educators.length > 0) {
      setSelectedEducatorId(educators[0].id);
    }
  }, [educators, selectedEducatorId]);

  return (
    <InstitutionContext.Provider value={{ educators, selectedEducatorId, setSelectedEducatorId, isLoading }}>
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex h-screen bg-background text-foreground">
          <IHeader
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebarCollapse={toggleSidebarCollapse}
          />
          <main
            className={`flex-1 flex flex-col pt-14 pb-24 md:pb-6 transition-all duration-300 overflow-auto px-4 md:px-6 ${sidebarMarginClass}`}
          >
            <div style={{ maxWidth: '1500px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <ILayoutMobile />
      </div>
    </InstitutionContext.Provider>
  );
};

import IDashboardDesktop from './i_dashboard.jsx';
import IDashboardMobile from './i_dashboard-mobile.jsx';

// Responsive wrapper for institution dashboard: renders mobile version on small screens
export const IDashboard = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return isMobile ? <IDashboardMobile /> : <IDashboardDesktop />;
};
export { default as IAnalysis } from './i_analysis.jsx';
export { default as IStudentDetails } from './i_studentdetails.jsx';
export { default as IUpload } from './i_upload.jsx';
export { default as ITestPerformance } from './i_testperformance.jsx';
