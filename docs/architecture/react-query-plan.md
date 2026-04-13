# React Query Migration Plan

## Status: Planned (not yet implemented)

The frontend has 50+ API endpoints using manual `useState`/`useEffect` patterns. This document outlines the plan for migrating to TanStack React Query (already installed as `@tanstack/react-query: ^5.28.0`).

---

## Problem

Each component manages its own fetch state:
```jsx
const [data, setData] = useState({});
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetchData().then(d => { setData(d); setLoading(false); });
}, [dep]);
```

Consequences: duplicate API calls, no caching, full reload on navigation, hard to maintain.

---

## Quick Win (Recommended First Step — ~2 hours)

Target the 5 most-visited pages:
1. Student Dashboard (`s_dashboard.jsx`)
2. Student SWOT (`s_swot.jsx`)
3. Educator Dashboard (`e_dashboard.jsx`)
4. Institution Dashboard
5. Test Results

**Expected impact:** 60–80% reduction in perceived wait time.

### Setup

`frontend/src/main.jsx` — wrap with `QueryClientProvider`:
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min
      gcTime: 10 * 60 * 1000,          // 10 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
// wrap <App /> with <QueryClientProvider client={queryClient}>
```

### Custom Hooks — `frontend/src/hooks/useStudentData.js`

```javascript
export const useStudentDashboardData = () =>
  useQuery({ queryKey: ['studentDashboard'], queryFn: getStudentDashboardData, staleTime: 5 * 60 * 1000 });

export const useStudentSWOT = (testNum) =>
  useQuery({ queryKey: ['studentSWOT', testNum], queryFn: () => fetchStudentSWOT(testNum),
             staleTime: 10 * 60 * 1000, enabled: testNum !== undefined });

export const useAvailableSwotTests = () =>
  useQuery({ queryKey: ['availableSwotTests'], queryFn: fetchAvailableSwotTests, staleTime: 30 * 60 * 1000 });

export const useStudentPerformanceData = () =>
  useQuery({ queryKey: ['studentPerformance'], queryFn: getStudentPerformanceData, staleTime: 5 * 60 * 1000 });
```

### Before/After — Student Dashboard

```jsx
// Before
const [dashboardData, setDashboardData] = useState({ isLoading: true });
useEffect(() => { getStudentDashboardData().then(d => setDashboardData(d)); }, []);

// After
const { data: dashboardData, isLoading } = useStudentDashboardData();
```

---

## Cache Strategy

| Data type | staleTime | gcTime | Key pattern |
|-----------|-----------|--------|-------------|
| Dashboard | 5 min | 10 min | `['studentDashboard']` |
| SWOT | 10 min | 20 min | `['studentSWOT', testNum]` |
| Available tests | 30 min | 60 min | `['availableTests']` |
| Profile/details | 15 min | 30 min | `['studentDetail']` |

### Cache invalidation on mutation (e.g., test upload)

```javascript
const queryClient = useQueryClient();
const { mutate } = useMutation({
  mutationFn: uploadTestFile,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studentDashboard'] }),
});
```

---

## Hooks File Structure

```
frontend/src/hooks/
├── useStudentData.js       # Student queries
├── useEducatorData.js      # Educator queries
├── useInstitutionData.js   # Institution queries
└── useAuthData.js          # Auth/user queries
```

---

## Advanced (Day 2+)

- **Persistent cache** (survives page refresh): `@tanstack/query-sync-storage-persister` + localStorage
- **Optimistic updates**: `onMutate` sets cache immediately, `onError` reverts
- **DevTools**: `@tanstack/react-query-devtools` — visual cache state debugger

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Stale data after upload | Cache TTL too long | Invalidate on mutation |
| Too many requests | TTL too short | Increase to 5–15 min |
| Inconsistent data | Multiple keys for same data | Standardize key structure |
