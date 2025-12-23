import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import IHeader from './i_header.jsx';
import { ILayout as ILayoutMobile } from './index-mobile.jsx';
import { fetchInstitutionEducators } from '../../utils/api';

export const InstitutionContext = createContext();

export const useInstitution = () => useContext(InstitutionContext);

export const ILayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [educators, setEducators] = useState([]);
  const [selectedEducatorId, setSelectedEducatorId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';

  useEffect(() => {
    const loadEducators = async () => {
      try {
        const data = await fetchInstitutionEducators();
        if (data && !data.error) {
            // Assuming data is an array or has an educators property
            const eduList = Array.isArray(data) ? data : (data.educators || []);
            setEducators(eduList);
            if (eduList.length > 0) {
                setSelectedEducatorId(eduList[0].id); // Default to first educator
            }
        }
      } catch (err) {
        console.error("Failed to load educators", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEducators();
  }, []);

  return (
    <InstitutionContext.Provider value={{ educators, selectedEducatorId, setSelectedEducatorId, isLoading }}>
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex h-screen bg-gray-50 text-text">
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
