import axios from 'axios';


export const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Detects if the current environment is the production gateway domain.
 * 
 * Uses TWO signals (both must be true):
 * 1. Runtime hostname matches 'web.inzighted.com'
 * 2. VITE_API_URL points to production API (not dev)
 * 
 * Why both checks:
 * - Hostname alone could be spoofed or misconfigured
 * - API URL is injected by GitHub Actions workflow at build time
 * - Dev builds use tamilnaduapi.inzighted.com
 * - Prod builds use api.inzighted.com
 * 
 * Note: Cannot use import.meta.env.MODE (always "production" for both builds)
 * 
 * @returns {boolean} - True if on production gateway, false otherwise
 */
export const isProductionGateway = () => {
  try {
    const currentHostname = window.location.hostname;
    const apiUrl = API_BASE_URL || '';
    
    // Check 1: Must be on web.inzighted.com frontend domain
    const isWebDomain = currentHostname === 'web.inzighted.com';
    
    // Check 2: Must be using production API (not dev API)
    // Dev API: https://tamilnaduapi.inzighted.com/api
    // Prod API: https://api.inzighted.com/api
    const isProdApi = apiUrl.includes('api.inzighted.com') && !apiUrl.includes('tamilnaduapi');
    
    return isWebDomain && isProdApi;
  } catch (error) {
    return false; // Fail safe: no redirect on error
  }
};

/**
 * Handles production-only institute subdomain redirection after successful login.
 * 
 * Redirect conditions (ALL must be true):
 * 1. Environment is production gateway (checked via isProductionGateway)
 * 2. Backend response includes 'institute_subdomain' field
 * 3. Current hostname is NOT already the institute subdomain
 * 
 * @param {Object} loginResponse - The backend login response object
 * @returns {boolean} - Returns true if redirect was triggered, false otherwise
 * 
 * Safety features:
 * - Uses dual-signal environment detection (hostname + API URL)
 * - Dev (tamilnadu.inzighted.com) never triggers redirect
 * - Prevents infinite loops by checking current hostname
 * - Preserves full URL context (pathname, query, hash)
 * - Tokens stored in localStorage before this runs
 * - Missing institute_subdomain = no-op (safe fallback)
 */
export const handleInstituteRedirect = (loginResponse) => {
  try {
    // Safety check: Only proceed if we're on production gateway
    if (!isProductionGateway()) {
      return false; // Dev or other environment - no redirect
    }
    
    // Extract institute subdomain from backend response
    const instituteSubdomain = loginResponse?.institute_subdomain;
    
    // Validate subdomain exists and is a valid string
    if (!instituteSubdomain || typeof instituteSubdomain !== 'string' || !instituteSubdomain.trim()) {
      return false; // Backend doesn't support multi-tenant yet, or no subdomain assigned
    }
    
    // Get current hostname
    const currentHostname = window.location.hostname;
    
    // Construct target subdomain
    const targetHostname = `${instituteSubdomain.trim()}.inzighted.com`;
    
    // Prevent redirect if we're already on the target subdomain
    if (currentHostname === targetHostname) {
      return false; // Already on correct subdomain (should never happen from web.inzighted.com)
    }
    
    // Build full redirect URL, preserving pathname, query params, and hash
    const targetUrl = `${window.location.protocol}//${targetHostname}${window.location.pathname}${window.location.search}${window.location.hash}`;
    
    window.location.href = targetUrl;
    
    return true; // Redirect triggered
  } catch (error) {
    return false; // On error, don't redirect (fail safe)
  }
};

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
    
    // Check for production institute subdomain redirect
    // Note: Redirect will happen inside handleInstituteRedirect if conditions are met
    // The redirect is non-blocking for the return statement since it's a full page navigation
    handleInstituteRedirect(data);
    
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
    
    // Check for production institute subdomain redirect
    // Note: Redirect will happen inside handleInstituteRedirect if conditions are met
    // The redirect is non-blocking for the return statement since it's a full page navigation
    handleInstituteRedirect(data);
    
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
    return data;
  } catch (error) {
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
    return data;
  } catch (error) {
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

    return res.data.available_tests ?? [];
  } catch (error) {
    return [];
  }
};

/**
 * Fetch Student Insights for Educator
 */
export const fetchEducatorStudentInsights = async (student_id, test_num) => {
  const token = localStorage.getItem('token');

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
    return response.data;

  } catch (error) {
    // Return a more specific error if available from the backend response
    return { error: error.response?.data?.error || 'Failed to fetch all student results' };
  }
};

/**
 * Generate PDF Report for Student (Teacher View)
 */
export const generatePdfReport = async (studentId, testId, classId = null, educatorId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    let url = `${PDF_SERVICE_URL}/generate-pdf?studentId=${encodeURIComponent(studentId)}&testId=${encodeURIComponent(testId)}`;
    if (classId) {
      url += `&classId=${encodeURIComponent(classId)}`;
    }
    if (educatorId) {
      url += `&educatorId=${encodeURIComponent(educatorId)}`;
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

/**
 * Generate Bulk PDF Reports as a Zip File for Multiple Students
 */
export const generateBulkPdfReportsZip = async (studentIds, testId, classId = null, educatorId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    const body = { studentIds, testId };
    if (classId) {
      body.classId = classId;
    }
    if (educatorId) {
      body.educatorId = educatorId;
    }
    
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
    
    // Check if response is JSON (S3 presigned URL) or blob (streaming)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // S3 presigned URL response
      const data = await response.json();
      
      if (data.downloadUrl) {
        // Trigger download from S3 URL
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || 'reports.zip';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true, s3Download: true, downloadUrl: data.downloadUrl, filename: data.filename };
      }
    }
    
    // Fallback: blob response (streaming)
    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error('Received empty ZIP file from server');
    }
    
    return blob;
  } catch (error) {
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
    
    // Check for production institute subdomain redirect
    // Note: Redirect will happen inside handleInstituteRedirect if conditions are met
    // The redirect is non-blocking for the return statement since it's a full page navigation
    handleInstituteRedirect(data);
    
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
    
    // Check for production institute subdomain redirect
    // Note: Redirect will happen inside handleInstituteRedirect if conditions are met
    // The redirect is non-blocking for the return statement since it's a full page navigation
    handleInstituteRedirect(data);
    
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
      if (metadata.test_name && metadata.test_name !== undefined) {
        formData.append('test_name', metadata.test_name);
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
 * Update Test Name
 * @param {number} testNum - Test number to update
 * @param {string} testName - New test name
 * @param {string|number} educatorId - Optional educator ID for institution view
 */
export const updateTestName = async (testNum, testName, educatorId = null) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_BASE_URL}/educator/tests/${testNum}/`,
      { test_name: testName, educator_id: educatorId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.error || 'Failed to update test name' };
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

    return [];
  }
};

/**
 * Generate PDF Report for Teacher Self-Download
 */
export const generateTeacherSelfPdfReport = async (testId, classId = null, educatorId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    let url = `${PDF_SERVICE_URL}/generate-teacher-pdf?testId=${encodeURIComponent(testId)}`;
    if (classId) {
      url += `&classId=${encodeURIComponent(classId)}`;
    }
    if (educatorId) {
      url += `&educatorId=${encodeURIComponent(educatorId)}`;
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

    return [];
  }
};

/**
 * Fetch Institution Educator Student Insights (for PDF reports)
 */
export const fetchInstitutionEducatorStudentInsights = async (educatorId, studentId, testNum) => {
  try {
    const token = localStorage.getItem('token');

    
    const response = await axios.post(
      `${API_BASE_URL}/institution/educator/${educatorId}/students/insights/`,
      {
        student_id: studentId,
        test_num: testNum
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {

    return { error: 'Failed to fetch student insights' };
  }
};

/**
 * Fetch Institution Student Insights (direct, institution-wide access)
 */
export const fetchInstitutionStudentInsights = async (studentId, testNum, educatorId = null) => {
  try {
    const token = localStorage.getItem('token');

    
    const body = {
      student_id: studentId,
      test_num: testNum
    };
    
    if (educatorId) {
      body.educator_id = educatorId;
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/institution/students/insights/`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {

    return { error: 'Failed to fetch student insights' };
  }
};

/**
 * Fetch All Students in Institution (institution-wide)
 */
export const fetchInstitutionStudents = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/institution/students/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {

    return { error: 'Failed to fetch students' };
  }
};

/**
 * Fetch All Student Results in Institution
 * Optional filters: educatorId or classId to scope to a single classroom
 */
export const fetchInstitutionAllStudentResults = async (educatorId = null, classId = null) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/institution/students/results/`, {
      params: {
        ...(educatorId ? { educator_id: educatorId } : {}),
        ...(classId ? { classId, class_id: classId } : {})
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {

    return { error: 'Failed to fetch results' };
  }
};

/**
 * Fetch Institution Teacher Dashboard (for PDF reports)
 */
export const fetchInstitutionTeacherDashboard = async (educatorId, testId, classId = null) => {
  try {
    const token = localStorage.getItem('token');

    
    const response = await axios.get(
      `${API_BASE_URL}/institution/teacher/dashboard/`,
      {
        params: {
          educator_id: educatorId,
          testId: testId,
          ...(classId ? { classId, class_id: classId } : {})
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {

    return { error: 'Failed to fetch teacher dashboard' };
  }
};

/**
 * Fetch Institution Teacher SWOT (for PDF reports)
 */
export const fetchInstitutionTeacherSWOT = async (educatorId, testId, classId = null) => {
  try {
    const token = localStorage.getItem('token');

    
    const response = await axios.get(
      `${API_BASE_URL}/institution/teacher/swot/`,
      {
        params: {
          educator_id: educatorId,
          testId: testId,
          ...(classId ? { classId, class_id: classId } : {})
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {

    return { error: 'Failed to fetch teacher SWOT' };
  }
};

/**
 * Fetch Test Student Performance (Institution View)
 * Returns detailed question-level data for all students who attended a specific test
 */
export const fetchInstitutionTestStudentPerformance = async (educatorId, testNum, classId = null) => {
  try {
    const token = localStorage.getItem('token');

    
    const response = await axios.get(
      `${API_BASE_URL}/institution/educator/${educatorId}/test/${testNum}/student-performance/`,
      {
        params: {
          ...(classId ? { classId } : {})
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;

    // Extract a lightweight schema (keys and nested types/sample shapes) without logging full data
    const extractSchema = (obj) => {
      if (obj === null) return 'null';
      if (obj === undefined) return 'undefined';
      if (Array.isArray(obj)) {
        const sample = obj.find(item => item !== null && item !== undefined) ?? obj[0];
        return [extractSchema(sample)];
      }
      if (typeof obj === 'object') {
        const schema = {};
        Object.keys(obj).forEach((k) => {
          const val = obj[k];
          if (Array.isArray(val)) {
            const sample = val.find(item => item !== null && item !== undefined) ?? val[0];
            schema[k] = [extractSchema(sample)];
          } else if (val && typeof val === 'object') {
            schema[k] = extractSchema(val);
          } else {
            schema[k] = typeof val;
          }
        });
        return schema;
      }
      return typeof obj;
    };

    const schema = extractSchema(data);

    // Print ONLY the schema object to the console (no raw data)
    try {

    } catch (e) {
      // fallback to simple log if stringify fails for some reason

    }

    return data;
  } catch (error) {

    return { error: error.response?.data?.error || 'Failed to fetch test performance data' };
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

    return { error: error.response?.data?.error || 'Failed to delete student' };
  }
};

/**
 * Delete a specific test for a student (Institution View)
 * @param {number} educatorId - ID of the educator
 * @param {string} studentId - Student's ID
 * @param {number} testNum - Test number to delete
 */
export const deleteInstitutionStudentTest = async (educatorId, studentId, testNum) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(
      `${API_BASE_URL}/institution/educator/${educatorId}/students/${encodeURIComponent(studentId)}/tests/${testNum}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {

    return { error: error.response?.data?.error || 'Failed to delete test' };
  }
};

/**
 * Re-upload and reprocess responses for a single student (Institution View)
 * Used when a student's responses were wrongly uploaded
 * @param {number} educatorId - ID of the educator
 * @param {string} studentId - Student's ID  
 * @param {number} testNum - Test number
 * @param {File} csvFile - CSV file with student responses
 * @param {string} classId - Optional class ID (defaults to educator's class)
 */
export const reuploadInstitutionStudentResponses = async (educatorId, studentId, testNum, csvFile, classId = null) => {
  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('test_num', testNum);
    formData.append('response_csv', csvFile);
    if (classId) {
      formData.append('class_id', classId);
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/institution/educator/${educatorId}/students/reupload-responses/`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  } catch (error) {

    return { error: error.response?.data?.error || 'Failed to re-upload responses' };
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

    throw error;
  }
};
