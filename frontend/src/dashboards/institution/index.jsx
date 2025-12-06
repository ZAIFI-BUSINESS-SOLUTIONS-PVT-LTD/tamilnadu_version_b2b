import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import IHeader from './i_header.jsx';
import { fetchInstitutionEducators } from '../../utils/api';

export const InstitutionContext = createContext();

export const useInstitution = () => useContext(InstitutionContext);

export const ILayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [educators, setEducators] = useState([]);
  const [selectedEducatorId, setSelectedEducatorId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const sidebarMarginClass = isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';

  useEffect(() => {
    const loadEducators = async () => {
      try {
        const data = await fetchInstitutionEducators();
        if (data && !data.error) {
            // Assuming data is an array or has an educators property
            const eduList = Array.isArray(data) ? data : (data.educators || []);
            setEducators(eduList);
            if (eduList.length > 0) {
                setSelectedEducatorId(eduList[0].id); // Default to first educator
            }
        }
      } catch (err) {
        console.error("Failed to load educators", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEducators();
  }, []);

  return (
    <InstitutionContext.Provider value={{ educators, selectedEducatorId, setSelectedEducatorId, isLoading }}>
      <div className="flex h-screen bg-gray-50 text-text">
        <IHeader
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebarCollapse={toggleSidebarCollapse}
        />
        <main
          className={`flex-1 flex flex-col pt-14 pb-24 md:pb-6 transition-all duration-300 overflow-auto px-4 md:px-6 ${sidebarMarginClass}`}
        >
          <div style={{ maxWidth: '1500px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
             <Outlet />
          </div>
        </main>
      </div>
    </InstitutionContext.Provider>
  );
};

export { default as IDashboard } from './i_dashboard.jsx';
export { default as IAnalysis } from './i_analysis.jsx';
export { default as IStudentDetails } from './i_studentdetails.jsx';
export { default as IUpload } from './i_upload.jsx';
