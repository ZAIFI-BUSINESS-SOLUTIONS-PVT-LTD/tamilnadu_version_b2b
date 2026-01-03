import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    House,
    Target,
    ChartBar,
    Files
} from "@phosphor-icons/react";
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';
import { fetchstudentdetail } from '../../utils/api.js';
import MobileDock from '../components/header/MobileDock.jsx';
import DownloadReportModal from './components/s_studentreport.jsx';
import StudentHeaderMobile from './s_header-mobile.jsx';

// SLayout component merged from s_layout.jsx
export const SLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const hideHeaderRoutes = ['/student/swot', '/student/performance'];
    const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

    // Fetch student user data using a custom hook
    const { userData: studentInfo, isLoading } = useUserData(fetchstudentdetail, { name: '', student_id: '' });

    // State for controlling the visibility of the mobile sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // State for controlling the visibility of the student report download modal
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    /**
     * Defines the main navigation items for the sidebar specific to a student.
     * Each item specifies a path, icon, display text, and a regex pattern
     * to determine if the link is currently active.
     * @type {Array<object>}
     */
    const sidebarItems = [
        {
            to: '/student/dashboard',
            icon: <House weight="regular" size={20} />,
            text: 'Home',
            activePattern: /^\/student\/dashboard/
        },
        {
            to: '/student/swot',
            icon: <Target weight="regular" size={20} />,
            text: 'Analysis',
            activePattern: /^\/student\/swot/
        },
        {
            to: '/student/performance',
            icon: <ChartBar weight="regular" size={20} />,
            text: 'Deep Dive',
            activePattern: /^\/student\/performance/
        },
    ];

    /**
     * Defines additional sidebar items, such as the "Download Report" option.
     * This component uses a flat list for additional items, unlike the EducatorHeader
     * which features a collapsible section.
     * @type {Array<object>}
     */
    const additionalItems = [
        {
            icon: <Files weight="regular" size={20} />,
            text: 'Download Report',
            onClick: () => setShowDownloadModal(true) // Triggers the DownloadReportModal
        }
    ];

    /**
     * Handles the user logout process.
     * Clears authentication tokens from local storage and navigates to the authentication page.
     */
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("first_time_login");
        navigate("/auth");
    };

    return (
        <div className="flex h-screen bg-gray-100 text-text">
            {/* Conditional rendering of the DownloadReportModal */}
            {showDownloadModal && (
                <DownloadReportModal onClose={() => setShowDownloadModal(false)} />
            )}

            {shouldShowHeader && <StudentHeaderMobile />}

            <MobileDock
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                items={sidebarItems}
                additionalItems={additionalItems}
                onLogout={handleLogout}
                userInfo={studentInfo}
            />
            <main
                className={`flex-1 flex flex-col ${shouldShowHeader ? 'pt-14 pb-20' : 'pt-0 pb-20'} overflow-auto`}
            >
                <div style={{ maxWidth: '1500px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

// Export all student dashboard components for easy import
export { default as SDashboard } from './s_dashboard.jsx';
export { default as SSWOT } from './s_swot.jsx';
export { default as SPerformance } from './s_performance.jsx';
