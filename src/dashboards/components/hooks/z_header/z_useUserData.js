import { useState, useEffect } from 'react';

// A generic custom hook to fetch user-related data
export const useUserData = (fetchFunction, defaultData = {}) => {
  // State to hold the fetched user data, initialized with defaultData
  const [userData, setUserData] = useState(defaultData);
  // State to track the loading status of the data fetch
  const [loading, setLoading] = useState(true);
  // State to hold any error that occurs during the data fetching process
  const [error, setError] = useState(null);

  // useEffect hook to perform the data fetching when the component mounts or when fetchFunction changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the provided fetchFunction to get the user data
        const data = await fetchFunction();
        // If data is successfully fetched, update the userData state
        if (data) {
          setUserData(data);
        }
      } catch (err) {
        // If an error occurs during fetching, set the error state and log the error
        setError(err);
        console.error(`Failed to fetch user data:`, err);
      } finally {
        // After the fetch operation (success or failure), set loading to false
        setLoading(false);
      }
    };

    // Call the fetchData function when the component using this hook mounts
    fetchData();
    // The effect depends on the fetchFunction. If fetchFunction changes, the data will be refetched.
  }, [fetchFunction]);

  // Return the fetched user data, loading status, and any error that occurred
  return { userData, loading, error };
};