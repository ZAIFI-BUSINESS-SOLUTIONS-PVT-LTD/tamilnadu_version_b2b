import { useState, useEffect, useCallback } from 'react';
import { fetchTests } from '../../../../utils/api';
import { toast } from 'react-hot-toast';

export const useTests = (educatorId = null, { enabled = true } = {}) => {
  // State to hold the list of tests
  const [tests, setTests] = useState([]);

  // useCallback hook to load tests from the API
  const loadTests = useCallback(async () => {
    if (!enabled && educatorId === null) return; // Don't fetch if disabled, unless it's the default educator case (where enabled is true by default)
    // Actually, if enabled is false, we should probably not fetch at all.
    
    try {
      // Fetch tests from the API
      const fetched = await fetchTests(educatorId);

      // Handle cases where the fetch failed or the data is invalid
      if (!fetched || fetched.error || !Array.isArray(fetched.tests)) {
        // Only show error if it's not just "no tests found" but an actual error, 
        // but here we assume empty array is success.
        // If fetched.error exists, it's an error.
        if (fetched?.error) {
             toast.error(`Failed to fetch tests: ${fetched.error}`);
        }
        setTests([]);
        return;
      }

      // Process the fetched test data to the desired format
      const processedTests = fetched.tests.map((test) => ({
        test_num: test.test_num,
        test_name: test.test_name, // Include test name for duplicate validation
        createdAt: test.date,
        progress: test.status?.toLowerCase(), // Convert status to lowercase
      }));

      // Update the tests state with the processed data
      setTests(processedTests);
    } catch (error) {
      // Display an error toast and log the error if the fetch fails
      toast.error('Error loading tests');
      console.error('Error fetching tests:', error);
    }
  }, [educatorId]); // Re-run if educatorId changes

  // useEffect hook to load tests on component mount and set up a polling interval
  useEffect(() => {
    if (!enabled) return;

    // Load tests when the component mounts
    loadTests();

    // Set up an interval to load tests every 30 seconds (30000 milliseconds)
    const interval = setInterval(loadTests, 30000);

    // Clean up the interval when the component unmounts to prevent memory leaks
    return () => clearInterval(interval);
  }, [loadTests, enabled]); // Re-run the effect if the loadTests function reference changes

  // Return the tests state and the loadTests function
  return { tests, loadTests };
};