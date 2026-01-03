import { useQuery } from '@tanstack/react-query';
import {
  getEducatorDashboardData,
  fetchEducatorAllStudentResults,
  fetcheducatorstudent,
  fetchEducatorSWOT,
  fetchAvailableSwotTests_Educator,
} from '../utils/api';

// Shared query options to keep data warm but avoid excessive refetching.
const DEFAULT_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
  refetchOnWindowFocus: false,
};

// Hook for fetching educator's own dashboard data
export const useEducatorDashboard = () => {
  return useQuery({
    queryKey: ['educator', 'dashboard'],
    queryFn: getEducatorDashboardData,
    ...DEFAULT_OPTIONS,
  });
};

// Hook for fetching educator's all student results
export const useEducatorResults = () => {
  return useQuery({
    queryKey: ['educator', 'results'],
    queryFn: fetchEducatorAllStudentResults,
    ...DEFAULT_OPTIONS,
    staleTime: 10 * 60 * 1000,
  });
};

// Hook for fetching educator's students
export const useEducatorStudents = () => {
  return useQuery({
    queryKey: ['educator', 'students'],
    queryFn: fetcheducatorstudent,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// Hook for fetching available SWOT tests for educator
export const useAvailableSwotTestsEducator = () => {
  return useQuery({
    queryKey: ['educator', 'availableSwotTests'],
    queryFn: fetchAvailableSwotTests_Educator,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook for fetching educator's SWOT data for a specific test
export const useEducatorSwot = (testNum) => {
  const enabled = testNum !== undefined && testNum !== null;
  return useQuery({
    queryKey: ['educator', 'swot', testNum],
    queryFn: () => fetchEducatorSWOT(testNum),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
