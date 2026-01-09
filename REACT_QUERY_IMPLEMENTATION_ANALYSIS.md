# React Query Cache Implementation Analysis & Roadmap

## Executive Summary
Your frontend has **50+ API endpoints** with repetitive `useState`/`useEffect` patterns causing redundant data fetching. Implementing React Query will eliminate this by caching data automatically, making users see instant results on subsequent visits.

**Time to implement:** 2-3 days for full coverage | **Quick win version:** 1 day (5-8 key pages)

---

## Current State Analysis

### Problem Areas
1. **Manual caching**: Each component manages its own `useState` for data
2. **Duplicate fetches**: Same data fetched multiple times across pages
3. **No persistence**: All data lost on page refresh
4. **Poor user experience**: Users wait for full data loads every time

### Examples from your codebase:

**Student SWOT Component** (`s_swot.jsx`):
```jsx
const [swotData, setSwotData] = useState({});
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchSwot = async () => {
    setLoading(true);
    const response = await fetchStudentSWOT(testNum);
    setSwotData(response.swot);
    setLoading(false);
  };
  fetchSwot();
}, [selectedTest]);
```

**Student Dashboard** (`s_dashboard.jsx`):
```jsx
const [dashboardData, setDashboardData] = useState({ ... });

useEffect(() => {
  const fetchData = async () => {
    const data = await getStudentDashboardData();
    setDashboardData(data);
  };
  fetchData();
}, []);
```

Every component repeats this pattern → **inefficient and unmaintainable**.

---

## React Query Advantages for Your App

| Feature | Benefit | Your Use Case |
|---------|---------|---------------|
| **Automatic Caching** | Data cached by query key | Student views SWOT → navigates away → returns instantly |
| **Background Refetch** | Updates without full reload | New test scores appear automatically |
| **Deduplication** | Same API call made once if triggered multiple times | Multiple components requesting student data |
| **Stale-While-Revalidate** | Shows cached data, updates in background | Fast page loads, fresh data in background |
| **Persistence** | Optional localStorage/sessionStorage | Data survives page refresh |
| **DevTools** | Visual debugging of cache state | Track what's cached, when fetches happen |

---

## Implementation Roadmap: Two Approaches

### Approach 1: **QUICK WIN** (1 day - Recommended for time-constrained)
Wrap your existing API functions in React Query for 5-8 most-visited pages:
- Student Dashboard
- Student SWOT
- Educator Dashboard  
- Institution Dashboard
- Test Results

**Expected impact:** 60% of user wait times eliminated

---

### Approach 2: **COMPLETE REFACTOR** (2-3 days - Enterprise-grade)
Restructure all 50+ API calls with proper cache invalidation, optimistic updates, and persistence.

---

## QUICK WIN IMPLEMENTATION (Recommended First Step)

### Step 1: Install Dependencies
```bash
cd frontend
npm install @tanstack/react-query
npm install -D @tanstack/eslint-plugin-query
```

### Step 2: Wrap Your App with QueryClient
**File:** `frontend/src/main.jsx`
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when user clicks back
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <StrictMode>
      <App />
    </StrictMode>
  </QueryClientProvider>
);
```

### Step 3: Create Custom Hooks for Common Queries

**File:** `frontend/src/hooks/useStudentData.js`
```javascript
import { useQuery } from '@tanstack/react-query';
import { getStudentDashboardData, getStudentPerformanceData, fetchstudentdetail } from '../utils/api';

// Hook for Student Dashboard (cached for 5 mins)
export const useStudentDashboardData = () => {
  return useQuery({
    queryKey: ['studentDashboard'], // Unique cache key
    queryFn: getStudentDashboardData,
    staleTime: 5 * 60 * 1000, // Cache valid for 5 minutes
  });
};

// Hook for Student SWOT (cached per test number)
export const useStudentSWOT = (testNum) => {
  return useQuery({
    queryKey: ['studentSWOT', testNum], // Different cache for each test
    queryFn: () => fetchStudentSWOT(testNum),
    staleTime: 10 * 60 * 1000,
    enabled: testNum !== undefined, // Don't fetch until testNum is set
  });
};

// Hook for Available Tests
export const useAvailableSwotTests = () => {
  return useQuery({
    queryKey: ['availableSwotTests'],
    queryFn: fetchAvailableSwotTests,
    staleTime: 30 * 60 * 1000, // Tests change infrequently
  });
};

// Hook for Student Performance
export const useStudentPerformanceData = () => {
  return useQuery({
    queryKey: ['studentPerformance'],
    queryFn: getStudentPerformanceData,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for Student Details
export const useStudentDetail = () => {
  return useQuery({
    queryKey: ['studentDetail'],
    queryFn: fetchstudentdetail,
    staleTime: 15 * 60 * 1000, // Profile data changes rarely
  });
};
```

### Step 4: Refactor Student Dashboard Component

**Before (Old Code):**
```jsx
function SDashboard() {
  const [dashboardData, setDashboardData] = useState({ isLoading: true });
  
  useEffect(() => {
    getStudentDashboardData().then(data => setDashboardData(data));
  }, []);
  
  if (dashboardData.isLoading) return <PageLoader />;
  return <div>...</div>;
}
```

**After (With React Query):**
```jsx
import { useStudentDashboardData } from '../../hooks/useStudentData';

function SDashboard() {
  const { data: dashboardData, isLoading, error } = useStudentDashboardData();
  
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorComponent error={error} />;
  
  return <div>...</div>;
}
```

**That's it! 3 lines of change = automatic caching, retry logic, and background updates.**

---

### Step 5: Refactor Student SWOT Component

**Before:**
```jsx
const useSwotData = (fetchSwotData, fetchAvailableTestsData) => {
    const [selectedTest, setSelectedTest] = useState('Overall');
    const [swotData, setSwotData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAvailableTests = async () => {
            const tests = await fetchAvailableTestsData();
            setAvailableTests([...new Set(tests)]);
        };
        loadAvailableTests();
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchSwotData(testNum).then(response => {
            setSwotData(response.swot);
            setLoading(false);
        });
    }, [selectedTest]);
};
```

**After:**
```jsx
import { useStudentSWOT, useAvailableSwotTests } from '../../hooks/useStudentData';

function SSWOT() {
    const [selectedTest, setSelectedTest] = useState('Overall');
    const [selectedSubject, setSelectedSubject] = useState('');

    // Extract test number from selected test
    const testNum = selectedTest !== 'Overall' 
        ? parseInt(String(selectedTest).match(/(\d+)/)?.[1] || 0) 
        : 0;

    // Query hooks handle all caching automatically
    const { data: availableTests = [], isLoading: testsLoading } = useAvailableSwotTests();
    const { data: swotResponse, isLoading: swotLoading } = useStudentSWOT(testNum);

    const loading = testsLoading || swotLoading;
    
    if (loading) return <LoadingPage />;
    
    const swotData = swotResponse?.swot || {};
    
    return <div>...</div>;
}
```

**Benefit:** Custom hook eliminated, 60 lines → 25 lines, auto-caching enabled

---

## Implementation Timeline: 1-Day Quick Win

| Time | Task | File(s) |
|------|------|---------|
| **15 min** | Install React Query | `package.json` |
| **15 min** | Wrap App with QueryClientProvider | `main.jsx` |
| **20 min** | Create custom hooks | `hooks/useStudentData.js` |
| **15 min** | Refactor Student Dashboard | `dashboards/student/s_dashboard.jsx` |
| **15 min** | Refactor Student SWOT | `dashboards/student/s_swot.jsx` |
| **10 min** | Test in browser + DevTools | Local dev |
| **10 min** | Create educator hooks | `hooks/useEducatorData.js` |
| **20 min** | Refactor Educator Dashboard | `dashboards/educator/e_dashboard.jsx` |

**Total: ~2 hours of work for dramatic UX improvement**

---

## Cache Strategy for Your Use Cases

### For Student Data
```javascript
// Time-based caching (5 min)
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// Key structure: ['studentDashboard', studentId]
// User takes test → data becomes stale → auto-refetch in background
```

### For Test Results
```javascript
// Longer cache for test data (15 min) - less frequently updated
staleTime: 15 * 60 * 1000,
gcTime: 30 * 60 * 1000,

// Key: ['testResults', testId, studentId]
// Same test viewed multiple times → instant load
```

### For Static Lists (Available Tests)
```javascript
// Very long cache (30 min)
staleTime: 30 * 60 * 1000,
gcTime: 60 * 60 * 1000,

// Key: ['availableTests']
// Only refetch if user's been idle > 30 mins
```

---

## Complete File Structure for Custom Hooks

```
frontend/src/
├── hooks/
│   ├── useStudentData.js      (Student queries)
│   ├── useEducatorData.js     (Educator queries)
│   ├── useInstitutionData.js  (Institution queries)
│   └── useAuthData.js         (Auth/user queries)
├── main.jsx                   (QueryProvider wrapper)
└── dashboards/
    ├── student/
    │   ├── s_dashboard.jsx    (Refactored)
    │   ├── s_swot.jsx         (Refactored)
    │   └── ...
    └── educator/
        ├── e_dashboard.jsx    (Refactored)
        └── ...
```

---

## Caching Tips for Your Specific Scenarios

### Scenario 1: Student Navigates Away & Returns
```javascript
// User views dashboard (cached)
// User goes to SWOT page (separate cache)
// User returns to dashboard → instant load (cache hit)
const { data, isLoading } = useStudentDashboardData();
// Component renders with cached data immediately, refetch happens in background
```

### Scenario 2: Multiple Components Need Same Data
```javascript
// Student Dashboard Component
const { data: performance } = useStudentPerformanceData();

// Performance Chart Component (different page)
const { data: performance } = useStudentPerformanceData(); // Shares same cache!
// React Query ensures only ONE API call made, result shared

```

### Scenario 3: Test Results Update (New Test Taken)
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function TestUpload() {
  const queryClient = useQueryClient();
  const { mutate: uploadTest } = useMutation({
    mutationFn: uploadTestFile,
    onSuccess: () => {
      // Invalidate dashboard cache when new test uploaded
      queryClient.invalidateQueries({ 
        queryKey: ['studentDashboard']
      });
      // Data will auto-refetch and update UI
    }
  });
  
  return <button onClick={() => mutate(file)}>Upload Test</button>;
}
```

---

## Implementation Checklist for Quick Win

- [ ] Install `@tanstack/react-query`
- [ ] Create `hooks/useStudentData.js` with 5 custom hooks
- [ ] Wrap `main.jsx` with `QueryClientProvider`
- [ ] Refactor `s_dashboard.jsx`
- [ ] Refactor `s_swot.jsx`
- [ ] Test in browser (data should load instantly on revisit)
- [ ] Install [React Query DevTools](https://tanstack.com/query/latest/docs/devtools) to visualize cache
- [ ] Create similar hooks for educator dashboard
- [ ] Refactor educator pages
- [ ] Deploy and monitor

---

## Performance Metrics (Expected Results)

### Before React Query
- Student Dashboard first load: **2-3 seconds**
- Navigate to SWOT: **1-2 seconds**
- Return to Dashboard: **2-3 seconds** ❌ (full reload)

### After React Query
- Student Dashboard first load: **2-3 seconds**
- Navigate to SWOT: **1-2 seconds**
- Return to Dashboard: **<100ms** ✅ (instant cache hit)
- Navigate to new SWOT test: **instant** if in cache, **1-2 sec** if new

**Net improvement: 60-80% reduction in perceived wait times**

---

## Advanced Features (Optional, Day 2+)

### 1. Persistent Cache (Survives Refresh)
```javascript
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
});
```

### 2. Optimistic Updates (Instant UI Response)
```javascript
const { mutate: updateStudent } = useMutation({
  mutationFn: updateStudentAPI,
  onMutate: async (newData) => {
    // Update UI immediately while request in flight
    await queryClient.cancelQueries({ queryKey: ['studentDetail'] });
    const previousData = queryClient.getQueryData(['studentDetail']);
    queryClient.setQueryData(['studentDetail'], newData);
    return { previousData };
  },
  onError: (err, newData, context) => {
    // Revert on failure
    queryClient.setQueryData(['studentDetail'], context.previousData);
  },
});
```

### 3. Refetch on Window Focus
```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Re-fetch when user switches tabs
    },
  },
});
```

---

## Potential Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Stale data after test upload | Cache TTL too long | Invalidate on mutation |
| Too many requests | Cache TTL too short | Increase to 5-15 mins |
| Memory bloat | Old cached queries kept | Set `gcTime` appropriately |
| Inconsistent data | Multiple cache keys for same data | Standardize key structure |

---

## Key Files to Modify (Quick Win)

### 1. `frontend/package.json`
Add dependency:
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.28.0"
  }
}
```

### 2. `frontend/src/main.jsx`
Wrap with provider (5 lines)

### 3. `frontend/src/hooks/useStudentData.js`
New file (create custom hooks)

### 4. `frontend/src/dashboards/student/s_dashboard.jsx`
Remove `useState`/`useEffect`, use custom hook

### 5. `frontend/src/dashboards/student/s_swot.jsx`
Simplify custom hook usage

---

## Recommendation

**Start with Quick Win (Approach 1):**
1. Implement React Query with custom hooks for student pages
2. Deploy and measure time improvements
3. Celebrate 60%+ speed improvement
4. Gradually expand to educator/institution pages
5. Add persistence and advanced features as needed

This approach:
- ✅ Takes ~2 hours
- ✅ Provides immediate value
- ✅ Easy to understand and debug
- ✅ Can be expanded incrementally
- ✅ Minimal breaking changes

---

## Next Steps

1. **Confirm this roadmap** - Do you want to proceed with Quick Win?
2. **I'll provide code files** - Ready to write hooks and refactored components
3. **Setup React Query** - Walk through installation and wrapping App
4. **Test implementation** - Verify caching works in DevTools

Would you like me to start implementing this now?
