import { useQuery } from '@tanstack/react-query';
import {
  fetchInstitutionEducators,
  getInstitutionEducatorDashboardData,
  fetchInstitutionEducatorAllStudentResults,
  fetchAvailableSwotTests_InstitutionEducator,
  fetchInstitutionTestStudentPerformance,
  fetchInstitutionEducatorStudents,
  fetchAvailableSwotTests_Educator,
  fetchInstitutionEducatorSWOT,
} from '../utils/api';

// Shared query options to keep data warm but avoid excessive refetching.
const DEFAULT_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
  refetchOnWindowFocus: false,
};

export const useInstitutionEducators = () => {
  return useQuery({
    queryKey: ['institution', 'educators'],
    queryFn: fetchInstitutionEducators,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export const useInstitutionEducatorDashboard = (educatorId) => {
  return useQuery({
    queryKey: ['institution', 'dashboard', educatorId],
    queryFn: () => getInstitutionEducatorDashboardData(educatorId),
    enabled: Boolean(educatorId),
    ...DEFAULT_OPTIONS,
  });
};

export const useInstitutionEducatorResults = (educatorId) => {
  return useQuery({
    queryKey: ['institution', 'results', educatorId],
    queryFn: () => fetchInstitutionEducatorAllStudentResults(educatorId),
    enabled: Boolean(educatorId),
    ...DEFAULT_OPTIONS,
    staleTime: 10 * 60 * 1000,
  });
};

export const useAvailableSwotTestsInstitution = (educatorId) => {
  return useQuery({
    queryKey: ['institution', 'availableSwotTests', educatorId],
    queryFn: () => fetchAvailableSwotTests_InstitutionEducator(educatorId),
    enabled: Boolean(educatorId),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useInstitutionEducatorSwot = (educatorId, testNum) => {
  const enabled = Boolean(educatorId) && testNum !== undefined && testNum !== null;
  return useQuery({
    queryKey: ['institution', 'swot', educatorId, testNum],
    queryFn: () => fetchInstitutionEducatorSWOT(educatorId, testNum),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useInstitutionTestPerformance = (educatorId, testNum, classId = null) => {
  return useQuery({
    queryKey: ['institution', 'testPerformance', educatorId, testNum, classId],
    queryFn: () => fetchInstitutionTestStudentPerformance(educatorId, testNum, classId),
    enabled: Boolean(educatorId) && (testNum !== undefined && testNum !== null),
    ...DEFAULT_OPTIONS,
  });
};

// Hook for fetching students for a specific educator (used in header for reports)
export const useInstitutionEducatorStudents = (educatorId) => {
  return useQuery({
    queryKey: ['institution', 'educatorStudents', educatorId],
    queryFn: () => fetchInstitutionEducatorStudents(educatorId),
    enabled: Boolean(educatorId),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// Hook for fetching available SWOT tests for current educator (uses token)
export const useAvailableSwotTestsEducator = () => {
  return useQuery({
    queryKey: ['educator', 'availableSwotTests'],
    queryFn: fetchAvailableSwotTests_Educator,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook for fetching all educator results (for institute overview aggregation)
export const useAllInstitutionEducatorResults = (educators) => {
  return useQuery({
    queryKey: ['institution', 'allEducatorResults', educators?.map(e => e.id).sort()],
    queryFn: async () => {
      if (!educators || educators.length === 0) return [];

      const educatorPromises = educators.map(async (educator) => {
        try {
          const resultsResp = await fetchInstitutionEducatorAllStudentResults(educator.id);
          return { educatorId: educator.id, resultsResp };
        } catch (err) {
          console.error(`Error fetching results for educator ${educator.id}:`, err);
          return { educatorId: educator.id, resultsResp: null };
        }
      });

      return Promise.all(educatorPromises);
    },
    enabled: Boolean(educators && educators.length > 0),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};
