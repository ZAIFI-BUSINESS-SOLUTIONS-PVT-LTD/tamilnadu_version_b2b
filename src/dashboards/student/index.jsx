import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SHeader from './s_header.jsx';

// SLayout component merged from s_layout.jsx
export const SLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
    const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';
    return (
        <div className="flex h-screen bg-gray-100 text-text">
            <SHeader
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

// Export all student dashboard components for easy import
export { default as SDashboard } from './s_dashboard.jsx';
export { default as SSWOT } from './s_swot';
export { default as SPerformance } from './s_performance/s_performance.jsx';
