import { useQuery } from '@tanstack/react-query';
import { getStudentDashboardData, getStudentPerformanceData, fetchStudentSWOT, fetchAvailableSwotTests, fetchstudentdetail } from '../utils/api.js';

export function useStudentDashboard(options = {}) {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => getStudentDashboardData(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (renamed from cacheTime in v5)
    retry: 1,
    ...options,
  });
}

export function useStudentSWOT(testNum = 0, options = {}) {
  return useQuery({
    queryKey: ['student', 'swot', testNum],
    queryFn: async () => fetchStudentSWOT(testNum),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    enabled: typeof testNum !== 'undefined',
    ...options,
  });
}

export function useAvailableSwotTests(options = {}) {
  return useQuery({
    queryKey: ['student', 'available-swot-tests'],
    queryFn: async () => fetchAvailableSwotTests(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    ...options,
  });
}

export function useStudentPerformance(options = {}) {
  return useQuery({
    queryKey: ['student', 'performance'],
    queryFn: async () => getStudentPerformanceData(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    ...options,
  });
}

export function useStudentDetails(options = {}) {
  return useQuery({
    queryKey: ['student', 'details'],
    queryFn: async () => fetchstudentdetail(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    ...options,
  });
}

export default useStudentDashboard;
