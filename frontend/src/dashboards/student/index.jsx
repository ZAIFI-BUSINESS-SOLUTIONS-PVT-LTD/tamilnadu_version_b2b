import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SHeader from './s_header.jsx';
import { SLayout as SLayoutMobile } from './index-mobile.jsx';

// SLayout component merged from s_layout.jsx
export const SLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
    const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';

    return (
        <>
            {/* Desktop Layout */}
            <div className="hidden md:block">
                <div className="flex h-screen bg-gray-100 text-text">
                    <SHeader
                        isSidebarCollapsed={isSidebarCollapsed}
                        toggleSidebarCollapse={toggleSidebarCollapse}
                    />
                    <main
                        className={`flex-1 flex flex-col pt-14 pb-20 md:pb-6 transition-all duration-300 overflow-auto md:px-6 ${sidebarMarginClass}`}
                    >
                        <div style={{ maxWidth: '1500px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden">
                <SLayoutMobile />
            </div>
        </>
    );
};

// Export all student dashboard components for easy import
export { default as SDashboard } from './s_dashboard.jsx';
export { default as SSWOT } from './s_swot';
export { default as SPerformance } from './s_performance/s_performance.jsx';
