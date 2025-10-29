import axios from 'axios';


export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Helper to get PDF service URL with fallback
const PDF_SERVICE_URL = import.meta.env.VITE_PDF_SERVICE_URL || 'http://localhost:8080';

/**
 * Admin Login
 */
export const adminLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: 'Network error, please try again' };
  }
};

/**
 * Educator Login
 */
export const educatorLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/educator/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: 'Network error, please try again' };
  }
};

/**
 * Student Login
 */
export const studentLogin = async (studentId, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/student/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentId, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: 'Network error, please try again' };
  }

};

/**
 * Register Educator (Handles CSV Upload)
 */
export const registerEducator = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/educator/register/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error('Error registering educator:', error);
    return { error: error.response?.data?.error || 'Failed to register educator' };
  }
};

/**
 * Upload Test Files (Question Paper, Answer Key, Answer Sheet)
 */
export const uploadTest = async (questionPaper, answerKey, answerSheet) => {
  try {
    const token = localStorage.getItem('token'); // ✅ Get Token from Storage
    if (!token) return { error: 'Unauthorized: No Token Found' };

    const formData = new FormData();
    formData.append('question_paper', questionPaper);
    formData.append('answer_key', answerKey);
    formData.append('answer_sheet', answerSheet);

    const response = await axios.post(`${API_BASE_URL}/upload_test/`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`, // ✅ Send Token
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    return { error: error.response?.data?.error || 'Upload failed' };
  }
};

/**
 * Fetch Tests for an Educator
 */
export const fetchTests = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/educator/tests/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { tests: response.data.tests }; // 👈 return wrapped object
  } catch (error) {
    return { error: error.response?.data?.error || 'Failed to fetch tests' };
  }
};


export const getStudentPerformanceData = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/student/performance/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.data;
    return data;
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return { error: 'Failed to fetch performance data' };
  }
};

export const getStudentDashboardData = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/student/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.data;
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { error: 'Failed to fetch dashboard data' };
  }
};


export const getEducatorDashboardData = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/educator/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.data;
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { error: 'Failed to fetch dashboard data' };
  }
};


export const fetchStudentSWOT = async (testNum) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/student/swot/`,
      { test_num: testNum },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.data;
    return data;
  } catch (error) {
    console.error('Error fetching SWOT data:', error);
    return { error: 'Failed to fetch SWOT data' };
  }
};


export const fetchAvailableSwotTests = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/student/swot/tests/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data?.available_tests || [];
  } catch (error) {
    console.error('Error fetching available SWOT tests:', error);
    return [];
  }
};

export const fetchEducatorSWOT = async (testNum) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/educator/swot/`,
      { test_num: testNum },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.data;
    return data;
  } catch (error) {
    console.error('Error fetching SWOT data:', error);
    return { error: 'Failed to fetch SWOT data' };
  }
};


export const fetchAvailableSwotTests_Educator = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/educator/swot/tests/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data?.available_tests || [];
  } catch (error) {
    console.error('Error fetching available SWOT tests:', error);
    return [];
  }
};

export const fetchstudentdetail = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/student/details/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data
  } catch (error) {
    console.error('Error fetching student name:', error);
    return [];
  }
};

export const fetcheducatordetail = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/educator/details/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data
  } catch (error) {
    console.error('Error fetching student name:', error);
    return [];
  }
};

export const fetcheducatorstudent = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/educator/students/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data
  } catch (error) {
    console.error('Error fetching student name:', error);
    return [];
  }
};

export const fetchEducatorStudentTests = async (studentId) => {
  try {
    const token = localStorage.getItem('token');
    console.log('Fetching tests for student with ID:', studentId);

    const res = await axios.post(
      `${API_BASE_URL}/educator/students/tests/`,
      { student_id: studentId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Received tests response:', res.data);
    return res.data.available_tests ?? [];
  } catch (error) {
    console.error('Error fetching student tests:', error);
    console.error('Error response:', error.response?.data);
    return [];
  }
};

export const fetchEducatorStudentInsights = async (student_id, test_num) => {
  const token = localStorage.getItem('token');
  console.log('[API] fetchEducatorStudentInsights →', { student_id, test_num, token });

  const response = await axios.post(
    `${API_BASE_URL}/educator/students/insights/`,
    {
      student_id,
      test_num
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

export const fetchEducatorAllStudentResults = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { error: 'Unauthorized: No Token Found' };
    }

    const response = await axios.get(`${API_BASE_URL}/educator/students/results/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // The backend should return the data directly in response.data
    console.log('Fetched all student results:', response.data);
    return response.data;

  } catch (error) {
    console.error('Error fetching all student results for educator:', error);
    // Return a more specific error if available from the backend response
    return { error: error.response?.data?.error || 'Failed to fetch all student results' };
  }
};

/**
 * Generate PDF report using backend APIs (new approach)
 * Updated: Now uses the new /generate-pdf endpoint (frontend-driven)
 */
export const generatePdfReport = async (studentId, testId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    const response = await fetch(
      `${PDF_SERVICE_URL}/generate-pdf?studentId=${encodeURIComponent(studentId)}&testId=${encodeURIComponent(testId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate bulk PDF reports as a zip file for multiple students
 * @param {Array<string>} studentIds
 * @param {string} testId
 * @returns {Promise<Blob>}
 */
export const generateBulkPdfReportsZip = async (studentIds, testId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    const response = await fetch(
      `${PDF_SERVICE_URL}/generate-bulk-pdf`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentIds, testId })
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate PDF report for student self-download (student login)
 */
export const generateStudentSelfPdfReport = async (testId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    const response = await fetch(
      `${PDF_SERVICE_URL}/generate-student-pdf?testId=${encodeURIComponent(testId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate PDF report for teacher self-download (teacher login)
 */
export const generateTeacherSelfPdfReport = async (testId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    const response = await fetch(
      `${PDF_SERVICE_URL}/generate-teacher-pdf?testId=${encodeURIComponent(testId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error) {
    throw error;
  }
};