import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';
import { fetchstudentdetail } from '../../utils/api.js';
import HeaderBase from '../shared/header/HeaderBase.jsx';
import UserDropdown from '../shared/header/UserDropDown.jsx';
import Logo from '../../assets/images/logo.svg';

/**
 * StudentHeaderMobile Component
 *
 * This component serves as the mobile header bar for the student's dashboard.
 * It provides the top bar with logo and user dropdown.
 *
 * @returns {JSX.Element} The rendered StudentHeaderMobile component.
 */
const StudentHeaderMobile = () => {
  // Fetch student user data using a custom hook
  const { userData: studentInfo, isLoading } = useUserData(fetchstudentdetail, { name: '', student_id: '' });

  // React Router hook for navigation
  const navigate = useNavigate();

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
    <>
      {/* Mobile Header (visible on small screens) */}
      <HeaderBase isMobile>
        <div className="flex items-center justify-between w-full py-3">
          {/* App Logo for Mobile (moved to the leftmost side) */}
          <div className="flex items-center">
            <img
              src={Logo}
              alt="InzightEd Logo"
              className="h-7 pt-1"
            />
          </div>

          {/* Mobile User Dropdown */}
          <div className="flex">
            {/* User Dropdown for Mobile */}
            <UserDropdown
              userInfo={studentInfo}
              onLogout={handleLogout}
              type="student"
            />
          </div>
        </div>
      </HeaderBase>
    </>
  );
};

export default StudentHeaderMobile;