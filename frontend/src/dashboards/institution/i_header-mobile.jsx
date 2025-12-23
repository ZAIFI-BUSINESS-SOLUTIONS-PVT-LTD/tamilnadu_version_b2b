import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderBase from '../components/header/HeaderBase.jsx';
import UserDropdown from '../components/header/UserDropDown.jsx';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';
import Logo from '../../assets/images/logo.svg';
import { useInstitution } from './index.jsx';
import FilterDrawer from '../../components/ui/filter-drawer.jsx';
import { Button } from '../../components/ui/button.jsx';
import { ChevronDown } from 'lucide-react';

/**
 * InstitutionHeaderMobile
 * Minimal mobile header for the institution dashboard.
 */
const InstitutionHeaderMobile = () => {
    const navigate = useNavigate();
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        navigate('/auth/institution/login');
    };

    return (
        <>
            <HeaderBase isMobile>
                <div className="flex items-center justify-between w-full py-3">
                    <div className="flex items-center">
                        <img src={Logo} alt="InzightEd Logo" className="h-7 pt-1" />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Classroom / Educator selector for mobile */}
                        <div className="w-36">
                            <MobileEducatorSelect />
                        </div>

                        <UserDropdown
                            userInfo={{ name: 'Institution Admin', inst: 'Institution' }}
                            onLogout={handleLogout}
                            onFeedback={() => setShowFeedbackModal(true)}
                            type="educator"
                        />
                    </div>
                </div>
            </HeaderBase>

            {showFeedbackModal && (
                <FeedbackModal onClose={() => setShowFeedbackModal(false)} userType="institution" />
            )}
        </>
    );
};

// Mobile select component for choosing educator/classroom
const MobileEducatorSelect = () => {
    const { educators, selectedEducatorId, setSelectedEducatorId } = useInstitution();
    const [open, setOpen] = useState(false);

    const sorted = useMemo(() => {
        if (!Array.isArray(educators)) return [];
        return [...educators].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [educators]);

    const selectedName = useMemo(() => {
        const sel = sorted.find((s) => String(s.id) === String(selectedEducatorId));
        return sel ? sel.name : '';
    }, [sorted, selectedEducatorId]);

    const panels = [
        {
            key: 'educator',
            label: 'Classroom',
            options: sorted.map((edu) => ({ value: edu.id, label: edu.name })),
            selected: selectedEducatorId,
            onSelect: (v) => (setSelectedEducatorId ? setSelectedEducatorId(v ?? null) : null),
        },
    ];

    return (
        <>
            <button
                className="btn btn-sm bg-gray-200 inline-flex items-center gap-2 rounded-xl"
                onClick={() => setOpen(true)}
                aria-label="Open filters"
            >
                <span className="text-sm">{selectedName || 'Classroom'}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
                    <path d="M6 9l6 6 6-6" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>


            <FilterDrawer
                open={open}
                onOpenChange={setOpen}
                panels={panels}
                initialActivePanel="educator"
                title="Select Classroom"
            />
        </>
    );
};

export default InstitutionHeaderMobile;
