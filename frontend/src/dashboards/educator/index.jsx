import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import EHeader from './e_header.jsx';

// ELayout component merged from e_layout.jsx
export const ELayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';
  return (
    <div className="flex h-screen bg-gray-100 text-text">
      <EHeader
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebarCollapse={toggleSidebarCollapse}
      />
      <main
        className={`flex-1 flex flex-col overflow-auto pt-12 px-4 transition-all duration-300 ${sidebarMarginClass}`}
      >
        <Outlet />
      </main>
    </div>
  );
};

// Export all educator dashboard components for easy import
export { default as EDashboard } from './e_dashboard.jsx';
export { default as ESWOT } from './e_swot.jsx';
export { default as EUpload } from './e_upload.jsx';
export { default as EResults } from './e_studentdetails';
