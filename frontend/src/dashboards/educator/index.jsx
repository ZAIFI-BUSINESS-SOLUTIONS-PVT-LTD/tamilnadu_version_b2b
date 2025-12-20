import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import EHeader from './e_header.jsx';
import { ELayout as ELayoutMobile } from './index-mobile.jsx';

// ELayout component (desktop + delegates mobile to index-mobile.jsx)
export const ELayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';
  const location = useLocation();
  const isChatbot = location.pathname.includes('chatbot');

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex h-screen bg-gray-50 text-text">
          <EHeader
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebarCollapse={toggleSidebarCollapse}
          />
          <main
            className={`flex-1 flex flex-col pt-14 pb-24 md:pb-6 transition-all duration-300 ${isChatbot ? sidebarMarginClass + ' overflow-hidden' : 'overflow-auto px-4 md:px-6 ' + sidebarMarginClass}`}
          >
            {isChatbot ? (
              <div style={{ width: '100%', height: '100%', margin: 0, maxWidth: '100vw' }}>
                <Outlet />
              </div>
            ) : (
              <div style={{ maxWidth: '1500px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
                <Outlet />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <ELayoutMobile />
      </div>
    </>
  );
};

// Export all educator dashboard components for easy import
export { default as EDashboard } from './e_dashboard.jsx';
export { default as ESWOT } from './e_analysis.jsx';
export { default as EUpload } from './e_upload.jsx';
export { default as EResults } from './e_studentdetails';
export { default as EChatbot } from './e_chatbot.jsx';
