import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';
import { fetcheducatordetail } from '../../utils/api.js';
import HeaderBase from '../shared/header/HeaderBase.jsx';
import UserDropdown from '../shared/header/UserDropDown.jsx';
import Logo from '../../assets/images/logo.svg';

/**
 * EducatorHeaderMobile
 * Minimal mobile header for the educator dashboard.
 */
const EducatorHeaderMobile = () => {
  const { userData: educatorInfo, isLoading } = useUserData(fetcheducatordetail, { name: '', inst: '' });
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('first_time_login');
    navigate('/auth');
  };

  return (
    <HeaderBase isMobile>
      <div className="flex items-center justify-between w-full py-3">
        <div className="flex items-center">
          <img src={Logo} alt="InzightEd Logo" className="h-7 pt-1" />
        </div>

        <div className="flex items-center">
          <UserDropdown userInfo={educatorInfo} onLogout={handleLogout} type="educator" />
        </div>
      </div>
    </HeaderBase>
  );
};

export default EducatorHeaderMobile;