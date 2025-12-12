import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderBase from '../components/header/HeaderBase.jsx';
import UserDropdown from '../components/header/UserDropDown.jsx';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';
import Logo from '../../assets/images/logo.svg';
import { useInstitution } from './index.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';

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

    const sorted = useMemo(() => {
        if (!Array.isArray(educators)) return [];
        return [...educators].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [educators]);

    return (
        <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Classroom" />
            </SelectTrigger>
            <SelectContent>
                {sorted.map((edu) => (
                    <SelectItem key={edu.id} value={String(edu.id)}>
                        {edu.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default InstitutionHeaderMobile;
