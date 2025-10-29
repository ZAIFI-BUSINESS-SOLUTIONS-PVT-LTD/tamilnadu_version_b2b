import { useState, useEffect } from 'react';
import { fetcheducatorstudent } from '../../../../utils/api';

const useStudentDetails = () => {
  // State to hold the list of students
  const [students, setStudents] = useState([]);
  // State to track the loading status of the data fetch
  const [loading, setLoading] = useState(true);
  // State to hold any error that occurs during data fetching
  const [error, setError] = useState(null);

  // useEffect hook to fetch student data when the component mounts
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Set loading to true before starting the data fetch
        setLoading(true);
        // Reset any previous error
        setError(null);
        // Call the API to fetch educator's students
        const response = await fetcheducatorstudent();
        // Update the students state with the fetched data, defaulting to an empty array if response.students is undefined
        setStudents(response.students || []);
      } catch (err) {
        // If an error occurs, set the error state with a user-friendly message
        setError('Failed to load student data. Please try again.');
        // Log the error for debugging purposes
        console.error('Error fetching students:', err);
      } finally {
        // Set loading to false once the data fetch is complete (success or failure)
        setLoading(false);
      }
    };

    // Call the fetchStudents function when the component mounts (empty dependency array)
    fetchStudents();
  }, []);

  // Return the state variables to be used by the consuming component
  return { students, loading, error };
};

export default useStudentDetails;