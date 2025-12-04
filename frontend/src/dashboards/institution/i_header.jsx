import React from 'react';
import { useNavigate } from 'react-router-dom';
import { House, Target, Student, List } from "@phosphor-icons/react";
import { useInstitution } from './index.jsx';
import DesktopSidebar from '../components/header/DesktopSidebar.jsx';
import UserDropdown from '../components/header/UserDropDown.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';

const InstitutionHeader = ({ isSidebarCollapsed, toggleSidebarCollapse }) => {
  const { educators, selectedEducatorId, setSelectedEducatorId } = useInstitution();
  const navigate = useNavigate();

  const sidebarItems = [
    {
      to: '/institution/dashboard',
      icon: <House weight="regular" size={20} />,
      text: 'Home',
      activePattern: /^\/institution\/dashboard/
    },
    {
      to: '/institution/analysis',
      icon: <Target weight="regular" size={20} />,
      text: 'Analysis',
      activePattern: /^\/institution\/analysis/
    },
    {
      to: '/institution/students',
      icon: <Student weight="regular" size={20} />,
      text: 'Students',
      activePattern: /^\/institution\/students/
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/auth/institution/login');
  };

  return (
    <>
      <DesktopSidebar
        items={sidebarItems}
        isCollapsed={isSidebarCollapsed}
        onLogout={handleLogout}
        userInfo={{ name: 'Institution Admin', inst: 'Institution' }}
      />
      
      {/* Top Bar */}
      <header className={`fixed top-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30 transition-all duration-300 flex items-center justify-between px-6 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
        <div className="flex items-center gap-4">
            <button onClick={toggleSidebarCollapse} className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden">
                <List size={24} />
            </button>
            
            {/* Educator Selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Educator:</span>
                <Select value={selectedEducatorId ? String(selectedEducatorId) : undefined} onValueChange={setSelectedEducatorId}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Educator" />
                    </SelectTrigger>
                    <SelectContent>
                        {educators.map((edu) => (
                            <SelectItem key={edu.id} value={String(edu.id)}>
                                {edu.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="flex items-center gap-4">
             <UserDropdown 
                userInfo={{ name: 'Institution Admin', inst: 'Institution' }} 
                onLogout={handleLogout}
             />
        </div>
      </header>
    </>
  );
};

export default InstitutionHeader;
