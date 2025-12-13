import axios from 'axios';


export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Helper to get PDF service URL with fallback.
// Priority order:
// 1. `VITE_PDF_SERVICE_URL` if explicitly provided (useful for staging/testing)
// 2. In development: `http://localhost:8080` (local pdf_service container)
// 3. In production: use the nginx proxy path `/pdf` so requests are
//    same-origin and forwarded to the `pdf_service` container by nginx.
const computePdfServiceUrl = () => {
  const explicit = import.meta.env.VITE_PDF_SERVICE_URL;
  if (explicit) return explicit;

  // Vite exposes flags for the current mode
  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }

  // Production default: rely on backend/nginx proxy at `/pdf`.
  // Using a relative path keeps requests same-origin and routes
  // them through the existing `nginx` proxy (`location /pdf/`).
  return '/pdf';
};

const PDF_SERVICE_URL = computePdfServiceUrl();

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

// =============================================================================
// 1. STUDENT DATA AVAILABLE IN STUDENT LOGIN
// =============================================================================

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
 * Fetch Student Performance Data
 */
export const getStudentPerformanceData = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/student/performance/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.data;
    console.log('All data from getStudentPerformanceData:', data);
    return data;
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return { error: 'Failed to fetch performance data' };
  }
};

/**
 * Fetch Student Dashboard Data
 */
export const getStudentDashboardData = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/student/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.data;
    console.log('All data from getStudentDashboardData:', data);
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { error: 'Failed to fetch dashboard data' };
  }
};

/**
 * Fetch Student SWOT Analysis
 */
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

/**
 * Fetch Available SWOT Tests for Student
 */
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

/**
 * Fetch Student Details
 */
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

/**
 * Generate PDF Report for Student Self-Download
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

// =============================================================================
// 2. STUDENT DATA AVAILABLE IN TEACHER LOGIN
// =============================================================================

/**
 * Fetch Tests for a Specific Student (Teacher View)
 */
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

/**
 * Fetch Student Insights for Educator
 */
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

/**
 * Fetch All Student Results for Educator
 */
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
 * Generate PDF Report for Student (Teacher View)
 */
export const generatePdfReport = async (studentId, testId, classId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    let url = `${PDF_SERVICE_URL}/generate-pdf?studentId=${encodeURIComponent(studentId)}&testId=${encodeURIComponent(testId)}`;
    if (classId) {
      url += `&classId=${encodeURIComponent(classId)}`;
    }
    console.log('generatePdfReport called with:', { studentId, testId, classId, finalUrl: url });
    const response = await fetch(
      url,
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
    console.error('generatePdfReport error:', error);
    throw error;
  }
};

/**
 * Generate Bulk PDF Reports as a Zip File for Multiple Students
 */
export const generateBulkPdfReportsZip = async (studentIds, testId, classId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    const body = { studentIds, testId };
    if (classId) {
      body.classId = classId;
    }
    console.log('generateBulkPdfReportsZip called with:', { studentIds, testId, classId, body });
    const response = await fetch(
      `${PDF_SERVICE_URL}/generate-bulk-pdf`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('generateBulkPdfReportsZip error:', error);
    throw error;
  }
};

// =============================================================================
// 3. TEACHER DATA AVAILABLE IN TEACHER LOGIN
// =============================================================================

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
 * Institution Login
 */
export const institutionLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/institution/login/`, {
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
 * @param {File} questionPaper - Question paper PDF file
 * @param {File} answerKey - Answer key CSV file
 * @param {File} answerSheet - Answer sheet CSV file
 * @param {Object} metadata - Optional metadata object with pattern, subject_order, total_questions, section_counts
 * @param {string|number} educatorId - Optional educator ID for institution uploads
 */
export const uploadTest = async (questionPaper, answerKey, answerSheet, metadata = null, educatorId = null) => {
  try {
    const token = localStorage.getItem('token'); // ✅ Get Token from Storage
    if (!token) return { error: 'Unauthorized: No Token Found' };
    // DEBUG: log metadata being sent (no files)
    try {
      console.debug('uploadTest metadata:', metadata, 'educatorId:', educatorId);
    } catch (e) {
      // ignore logging errors
    }

    const formData = new FormData();
    formData.append('question_paper', questionPaper);
    formData.append('answer_key', answerKey);
    formData.append('answer_sheet', answerSheet);

    if (educatorId) {
      formData.append('educator_id', educatorId);
    }

    // Add metadata fields if provided (only append if value is defined and not null)
    if (metadata) {
      if (metadata.pattern && metadata.pattern !== undefined) {
        formData.append('pattern', metadata.pattern);
      }
      if (metadata.subject_order && metadata.subject_order !== undefined) {
        formData.append('subject_order', JSON.stringify(metadata.subject_order));
      }
      if (metadata.total_questions !== undefined && metadata.total_questions !== null) {
        formData.append('total_questions', metadata.total_questions.toString());
      }
      if (metadata.section_counts && metadata.section_counts !== undefined) {
        formData.append('section_counts', JSON.stringify(metadata.section_counts));
      }
    }

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
 * @param {string|number} educatorId - Optional educator ID for institution view
 */
export const fetchTests = async (educatorId = null) => {
  try {
    const token = localStorage.getItem('token');
    let url = `${API_BASE_URL}/educator/tests/`;
    if (educatorId) {
      url += `?educator_id=${educatorId}`;
    }
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { tests: response.data.tests }; // 👈 return wrapped object
  } catch (error) {
    return { error: error.response?.data?.error || 'Failed to fetch tests' };
  }
};

/**
 * Fetch Educator Dashboard Data
 */
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

/**
 * Fetch Educator SWOT Analysis
 */
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

/**
 * Fetch Available SWOT Tests for Educator
 */
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

/**
 * Fetch Educator Details
 */
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

/**
 * Fetch Educator's Students
 */
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

/**
 * Generate PDF Report for Teacher Self-Download
 */
export const generateTeacherSelfPdfReport = async (testId, classId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    let url = `${PDF_SERVICE_URL}/generate-teacher-pdf?testId=${encodeURIComponent(testId)}`;
    if (classId) {
      url += `&classId=${encodeURIComponent(classId)}`;
    }
    const response = await fetch(
      url,
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

// =============================================================================
// 4. INSTITUTION DATA
// =============================================================================

/**
 * Fetch Institution Educators
 */
export const fetchInstitutionEducators = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/institution/educators/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching institution educators:', error);
    return { error: 'Failed to fetch educators' };
  }
};

/**
 * Fetch Dashboard Data for a specific Educator (Institution View)
 */
export const getInstitutionEducatorDashboardData = async (educatorId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/institution/educator/${educatorId}/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching educator dashboard data:', error);
    return { error: 'Failed to fetch dashboard data' };
  }
};

/**
 * Fetch All Student Results for a specific Educator (Institution View)
 */
export const fetchInstitutionEducatorAllStudentResults = async (educatorId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/institution/educator/${educatorId}/students/results/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching educator student results:', error);
    return { error: 'Failed to fetch student results' };
  }
};

/**
 * Fetch Institution Educator SWOT Analysis
 */
export const fetchInstitutionEducatorSWOT = async (educatorId, testNum) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/institution/educator/${educatorId}/swot/`,
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

/**
 * Fetch Available SWOT Tests for Institution Educator
 */
export const fetchAvailableSwotTests_InstitutionEducator = async (educatorId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/institution/educator/${educatorId}/swot/tests/`, {
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

/**
 * Fetch Institution Educator's Students
 */
export const fetchInstitutionEducatorStudents = async (educatorId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/institution/educator/${educatorId}/students/`, {
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

/**
 * Create a new student (Institution View)
 */
export const createInstitutionStudent = async (educatorId, payload) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/institution/educator/${educatorId}/students/create/`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating student:', error);
    return { error: error.response?.data?.error || 'Failed to create student' };
  }
};

/**
 * Update a student (Institution View)
 */
export const updateInstitutionStudent = async (educatorId, studentId, payload) => {
  try {
    const token = localStorage.getItem('token');
    // Quick client-side guard: ensure token role is manager to avoid sending wrong-role tokens
    try {
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const body = JSON.parse(atob(parts[1]));
          if (body.role !== 'manager') {
            return { error: 'Forbidden: not logged in as institution manager' };
          }
        }
      }
    } catch (e) {
      // ignore decode errors and proceed to let server validate
    }
    const response = await axios.put(`${API_BASE_URL}/institution/educator/${educatorId}/students/${encodeURIComponent(studentId)}/`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating student:', error);
    return { error: error.response?.data?.error || 'Failed to update student' };
  }
};

/**
 * Delete a student (Institution View)
 */
export const deleteInstitutionStudent = async (educatorId, studentId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_BASE_URL}/institution/educator/${educatorId}/students/${encodeURIComponent(studentId)}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting student:', error);
    return { error: error.response?.data?.error || 'Failed to delete student' };
  }
};

// =============================================================================
// FEEDBACK APIs
// =============================================================================

/**
 * Submit Student Feedback
 */
export const submitStudentFeedback = async (feedbackData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/student/feedback/`, feedbackData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting student feedback:', error);
    return { error: error.response?.data?.error || 'Failed to submit feedback' };
  }
};

/**
 * Submit Educator Feedback
 */
export const submitEducatorFeedback = async (feedbackData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/educator/feedback/`, feedbackData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting educator feedback:', error);
    return { error: error.response?.data?.error || 'Failed to submit feedback' };
  }
};

/**
 * Submit Institution Feedback
 */
export const submitInstitutionFeedback = async (feedbackData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/institution/feedback/`, feedbackData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting institution feedback:', error);
    return { error: error.response?.data?.error || 'Failed to submit feedback' };
  }
};

/**
 * Get My Feedback History
 */
export const getMyFeedbackHistory = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/feedback/history/`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching feedback history:', error);
    return { error: error.response?.data?.error || 'Failed to fetch feedback history' };
  }
};


/**
 * Forgot Password - request reset email
 */
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error) {
    return { error: 'Network error, please try again' };
  }
};

/**
 * Reset Password - consume token and set new password
 */
export const resetPassword = async (email, token, new_password, role) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, new_password, role }),
    });
    return await response.json();
  } catch (error) {
    return { error: 'Network error, please try again' };
  }
};

/**
 * Fetch Educator Details (includes class_id)
 */
export const getEducatorDetails = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/educator/details/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data || {};
  } catch (error) {
    console.error('Error fetching educator details:', error);
    return { error: 'Failed to fetch educator details' };
  }
};

// =============================================================================
// TEACHER MANAGEMENT APIs
// =============================================================================

/**
 * Create a new teacher for a class and subject
 */
export const createTeacher = async (teacherData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/teachers/`,
      teacherData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw error;
  }
};

/**
 * Fetch all teachers for a specific class
 */
export const getTeachersByClass = async (classId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `${API_BASE_URL}/classes/${classId}/teachers/`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }
};

/**
 * Update teacher details (email, phone, test_range, etc.)
 */
export const updateTeacher = async (teacherId, updates) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_BASE_URL}/teachers/${teacherId}/`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw error;
  }
};

/**
 * Delete a teacher
 */
export const deleteTeacher = async (teacherId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(
      `${API_BASE_URL}/teachers/${teacherId}/delete/`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting teacher:', error);
    throw error;
  }
};