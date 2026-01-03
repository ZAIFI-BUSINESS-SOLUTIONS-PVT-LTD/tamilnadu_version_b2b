import { useQuery } from '@tanstack/react-query';
import { fetchTests } from '../../../../utils/api';
import { toast } from 'react-hot-toast';

export const useTests = (educatorId = null, { enabled = true, refetchInterval = 30000 } = {}) => {
  const queryEnabled = enabled && Boolean(educatorId);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['institution', 'tests', educatorId],
    enabled: queryEnabled,
    queryFn: async () => {
      const fetched = await fetchTests(educatorId);
      if (!fetched || fetched.error) {
        const message = fetched?.error || 'Failed to fetch tests';
        toast.error(message);
        throw new Error(message);
      }
      if (!Array.isArray(fetched.tests)) return [];
      return fetched.tests.map((test) => ({
        test_num: test.test_num,
        test_name: test.test_name,
        createdAt: test.date,
        progress: test.status?.toLowerCase(),
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: queryEnabled ? refetchInterval : false,
  });

  return {
    tests: data || [],
    isLoading,
    isFetching,
    refetch,
  };
};