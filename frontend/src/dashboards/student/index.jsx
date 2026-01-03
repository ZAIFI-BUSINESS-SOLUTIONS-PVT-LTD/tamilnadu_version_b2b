import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SHeader from './s_header.jsx';
import { SLayout as SLayoutMobile } from './index-mobile.jsx';

// SLayout component merged from s_layout.jsx
export const SLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
    const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';
    const location = useLocation();
    const isChatbot = location.pathname.includes('chatbot');

    return (
        <>
            {/* Desktop Layout */}
            <div className="hidden md:block">
                <div className="flex h-screen bg-background text-foreground">
                    <SHeader
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
                <SLayoutMobile />
            </div>
        </>
    );
};

// Export all student dashboard components for easy import
export { default as SDashboard } from './s_dashboard.jsx';
export { default as SSWOT } from './s_analysis.jsx';
export { default as SPerformance } from './s_performance.jsx';
