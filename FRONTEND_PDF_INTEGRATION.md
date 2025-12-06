# Frontend PDF Service Integration Guide

## Quick Start

The PDF service is now integrated into the backend infrastructure and can be accessed through two methods:

### Method 1: Direct Access (Development)
```javascript
const PDF_SERVICE_URL = 'http://localhost:8080';
```

### Method 2: Through Nginx Proxy (Production)
```javascript
const PDF_SERVICE_URL = 'https://tamilnaduapi.inzighted.com/pdf';
```

## API Endpoints

### 1. Health Check
```javascript
const checkHealth = async () => {
  const response = await fetch(`${PDF_SERVICE_URL}/health`);
  const data = await response.json();
  console.log(data);
  // { status: 'OK', service: 'InzightEd PDF Service', ... }
};
```

### 2. Generate Student Report PDF
```javascript
const generateStudentPdf = async (studentId, testId) => {
  const token = localStorage.getItem('token'); // or however you store JWT
  
  const response = await fetch(
    `${PDF_SERVICE_URL}/generate-pdf?studentId=${studentId}&testId=${testId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': window.location.origin
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('PDF generation failed');
  }
  
  // Download the PDF
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${studentId}_${testId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Usage
generateStudentPdf('123', '456');
```

### 3. Generate Bulk PDFs (Multiple Students)
```javascript
const generateBulkPdfs = async (studentIds, testId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${PDF_SERVICE_URL}/generate-bulk-pdf`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': window.location.origin
    },
    body: JSON.stringify({
      studentIds: studentIds,  // ['1', '2', '3', ...]
      testId: testId
    })
  });
  
  if (!response.ok) {
    throw new Error('Bulk PDF generation failed');
  }
  
  // Download the ZIP file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reports_test_${testId}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Usage
generateBulkPdfs(['1', '2', '3', '4', '5'], '456');
```

### 4. Generate Student Self-Report PDF
```javascript
const generateStudentSelfPdf = async (testId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `${PDF_SERVICE_URL}/generate-student-pdf?testId=${testId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': window.location.origin
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Student self-report PDF generation failed');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `student_report_${testId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

### 5. Generate Teacher Self-Report PDF
```javascript
const generateTeacherSelfPdf = async (testId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `${PDF_SERVICE_URL}/generate-teacher-pdf?testId=${testId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': window.location.origin
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Teacher self-report PDF generation failed');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teacher_report_${testId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

## React Hook Example

```javascript
// usePdfGenerator.js
import { useState } from 'react';

const PDF_SERVICE_URL = import.meta.env.VITE_PDF_SERVICE_URL || 'http://localhost:8080';

export const usePdfGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePdf = async (studentId, testId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${PDF_SERVICE_URL}/generate-pdf?studentId=${studentId}&testId=${testId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Origin': window.location.origin
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'PDF generation failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${studentId}_${testId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateBulkPdf = async (studentIds, testId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${PDF_SERVICE_URL}/generate-bulk-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ studentIds, testId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Bulk PDF generation failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_test_${testId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { generatePdf, generateBulkPdf, loading, error };
};
```

## Component Example

```javascript
// StudentReportDownload.jsx
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { toast } from 'react-hot-toast';

export const StudentReportDownload = ({ studentId, testId }) => {
  const { generatePdf, loading, error } = usePdfGenerator();

  const handleDownload = async () => {
    const success = await generatePdf(studentId, testId);
    
    if (success) {
      toast.success('PDF downloaded successfully!');
    } else {
      toast.error(error || 'Failed to generate PDF');
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={loading}
      className="btn btn-primary"
    >
      {loading ? (
        <>
          <span className="loading loading-spinner"></span>
          Generating PDF...
        </>
      ) : (
        'Download Report'
      )}
    </button>
  );
};
```

## Environment Configuration

Add to your `.env` or `.env.local`:

```env
# Development
VITE_PDF_SERVICE_URL=http://localhost:8080

# Production (through nginx proxy)
VITE_PDF_SERVICE_URL=https://tamilnaduapi.inzighted.com/pdf
```

## Important Notes

### 1. PDF Ready Signal
The PDF service uses Puppeteer to render your React pages. Make sure to signal when the page is ready:

```javascript
// In your report page component
useEffect(() => {
  // After all data is loaded and charts are rendered
  if (dataLoaded && chartsRendered) {
    window.__PDF_READY__ = true;
  }
}, [dataLoaded, chartsRendered]);
```

### 2. Authentication
- Always include JWT token in `Authorization: Bearer <token>` header
- The PDF service will use this token to authenticate with the backend API
- Token is also set in localStorage when Puppeteer navigates to your page

### 3. Origin Header
- Include `Origin` header to help with CORS and tenant identification
- Use `window.location.origin` to get the current origin

### 4. Timeouts
- PDF generation can take 30-120 seconds depending on complexity
- Show loading states to users
- Handle timeout errors gracefully

### 5. Error Handling
```javascript
try {
  const response = await fetch(/* ... */);
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('PDF Error:', errorData);
    throw new Error(errorData.message);
  }
  
  // Handle success
} catch (error) {
  console.error('PDF Generation Failed:', error);
  // Show user-friendly error message
  toast.error('Failed to generate PDF. Please try again.');
}
```

## Testing

### Test Health Endpoint
```javascript
// Add this to your dev tools console
fetch('http://localhost:8080/health')
  .then(r => r.json())
  .then(console.log);
```

### Test PDF Generation (with mock)
```javascript
// Create a test button in your UI
const testPdfGeneration = async () => {
  console.log('Testing PDF generation...');
  const success = await generatePdf('test-student-123', 'test-test-456');
  console.log('PDF generation test:', success ? 'SUCCESS' : 'FAILED');
};
```

## Troubleshooting

### PDF Generation Fails
1. Check if JWT token is valid
2. Verify the report page renders correctly in browser
3. Check browser console for errors on the report page
4. Ensure `window.__PDF_READY__` is set to `true`

### CORS Errors
1. Make sure Origin header is included
2. Verify ALLOWED_ORIGINS in pdf_service configuration
3. Check browser network tab for preflight requests

### Timeout Errors
1. Increase PDF_TIMEOUT in pdf_service configuration
2. Optimize report page rendering (reduce API calls, optimize images)
3. Consider splitting large reports into smaller ones

## Production Checklist

- [ ] Environment variables configured correctly
- [ ] JWT authentication implemented
- [ ] Loading states shown to users
- [ ] Error handling implemented
- [ ] `window.__PDF_READY__` signal implemented
- [ ] Tested with production data
- [ ] Performance optimized (report page loads quickly)
- [ ] User feedback/notifications implemented

## Support

For issues:
1. Check PDF service logs: `docker compose logs pdf_service`
2. Test health endpoint: `curl http://localhost:8080/health`
3. Verify JWT token is valid
4. Check browser console for errors
