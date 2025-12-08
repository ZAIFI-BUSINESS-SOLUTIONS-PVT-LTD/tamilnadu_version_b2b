# PDF Service Enhancement: Backend-Triggered Generation with S3 Caching

## Overview

This enhancement changes the PDF generation flow from frontend-triggered to backend-triggered with S3 existence checking for improved performance and caching.

## New Flow

### 1. Backend Triggers PDF Generation (After Test Processing)
- **When**: After educator dashboard upload/test processing is completed
- **Who**: Django backend calls pdf_service internal endpoint
- **What**: Generates PDFs for all students and teachers, uploads to S3 with deterministic keys

### 2. Frontend Requests PDF 
- **When**: User clicks download PDF button
- **Who**: Frontend calls pdf_service public endpoint (same as before)
- **What**: 
  - First: Check S3 for existing PDF using deterministic key
  - If exists: Stream from S3 immediately
  - If not exists: Generate on-demand (fallback to original flow)

## S3 Key Structure (Deterministic)

```
reports/{classId}/{testId}/students/{studentId}.pdf     # Student report
reports/{classId}/overall/teacher_{teacherId}.pdf       # Teacher overall report  
reports/{classId}/{testId}/teacher_{teacherId}.pdf      # Teacher specific test report
reports/{classId}/{testId}/overall.pdf                  # Class overall report
```

**Examples:**
- `reports/CLASS_123/Test_5/students/STU001.pdf`
- `reports/CLASS_123/overall/teacher_TCH001.pdf`
- `reports/CLASS_123/Test_5/teacher_TCH001.pdf`

## Backend Integration

### 1. Environment Variables
Add to your Django `.env`:
```env
PDF_SERVICE_URL=http://localhost:8080  # or your pdf_service URL
PDF_SERVICE_INTERNAL_TOKEN=your-secure-random-token-here
```

Add to `pdf_service/.env`:
```env
PDF_SERVICE_INTERNAL_TOKEN=your-secure-random-token-here
```

### 2. Django Settings
```python
# settings.py
PDF_SERVICE_URL = env('PDF_SERVICE_URL', default='http://localhost:8080')
PDF_SERVICE_INTERNAL_TOKEN = env('PDF_SERVICE_INTERNAL_TOKEN', default='changeme')
DEFAULT_FRONTEND_ORIGIN = env('DEFAULT_FRONTEND_ORIGIN', default='https://tamilnadu.inzighted.com')
```

### 3. Integration Points

#### Option A: Direct Integration (Simple)
```python
# In your test processing completion handler
from exam.services.pdf_trigger import PDFTriggerService

def on_educator_upload_complete(test_data):
    # ... existing processing ...
    
    service = PDFTriggerService()
    
    # Trigger PDFs for all students
    for student_id in test_data['student_ids']:
        service.trigger_pdf_generation(
            test_id=test_data['test_id'],
            class_id=test_data['class_id'], 
            report_type='student',
            student_id=student_id
        )
    
    # Trigger teacher PDF
    service.trigger_pdf_generation(
        test_id=test_data['test_id'],
        class_id=test_data['class_id'],
        report_type='teacher',
        teacher_id=test_data['teacher_id']
    )
```

#### Option B: Celery Integration (Recommended)
```python
# In your test processing completion handler
from exam.services.pdf_trigger import trigger_bulk_pdf_generation

def on_educator_upload_complete(test_data):
    # ... existing processing ...
    
    # Queue async PDF generation
    task = trigger_bulk_pdf_generation.delay(
        test_id=test_data['test_id'],
        class_id=test_data['class_id'],
        student_ids=test_data['student_ids'],
        teacher_ids=[test_data['teacher_id']]
    )
    
    logger.info(f"Queued PDF generation task: {task.id}")
```

## API Changes

### New Internal Endpoint (PDF Service)
```http
POST /internal/trigger-generate-pdf
X-Service-Auth: Bearer <PDF_SERVICE_INTERNAL_TOKEN>
Content-Type: application/json

{
  "testId": "Test_5",
  "classId": "CLASS_123", 
  "reportType": "student",  // "student" | "teacher" | "overall"
  "studentId": "STU001",    // required for student reports
  "teacherId": "TCH001",    // required for teacher reports
  "origin": "https://tamilnadu.inzighted.com",
  "reportToken": "jwt-token-here"  // optional short-lived token
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "PDF generation completed",
  "reportType": "student",
  "testId": "Test_5", 
  "classId": "CLASS_123",
  "s3Key": "reports/CLASS_123/Test_5/students/STU001.pdf"
}
```

### Existing Frontend Endpoints (No Changes)
- `GET /generate-pdf?studentId=...&testId=...&classId=...` - Now checks S3 first
- `GET /generate-student-pdf?testId=...&classId=...` - Now checks S3 first  
- `GET /generate-teacher-pdf?testId=...&classId=...` - Now checks S3 first
- `POST /generate-bulk-pdf` - Now checks S3 first for each PDF

## Token Handling for Backend Triggers

### Problem
When backend triggers generation, pdf_service needs to load frontend pages that require authentication tokens to fetch data from backend APIs.

### Solution: Short-lived Report Tokens
1. **Backend generates** a short-lived JWT token (10 min expiry) scoped only for reading report data
2. **Token payload**:
   ```json
   {
     "user_id": "STU001",
     "user_type": "student", 
     "student_id": "STU001",  // for student reports
     "teacher_id": "TCH001",  // for teacher reports
     "class_id": "CLASS_123",
     "test_id": "Test_5",
     "scope": "report:read",
     "exp": 1704067200,
     "iat": 1704066600,
     "iss": "inzighted-backend"
   }
   ```
3. **PDF service injects** this token into localStorage (same as current user tokens)
4. **Frontend pages** use the token to authenticate API calls (no changes needed)

## Deployment Steps

### 1. Update PDF Service
```bash
cd /home/ubuntu/Inzighted_V1/pdf_service
npm install jsonwebtoken
```

### 2. Set Environment Variables
```bash
# Add to pdf_service/.env
echo "PDF_SERVICE_INTERNAL_TOKEN=$(openssl rand -hex 32)" >> .env

# Add to backend .env  
echo "PDF_SERVICE_INTERNAL_TOKEN=$(cat /home/ubuntu/Inzighted_V1/pdf_service/.env | grep PDF_SERVICE_INTERNAL_TOKEN | cut -d= -f2)" >> /home/ubuntu/Inzighted_V1/.env
```

### 3. Deploy PDF Service
```bash
cd /home/ubuntu/Inzighted_V1
sudo docker compose up -d --build pdf_service
```

### 4. Update Backend Code
- Add the `pdf_trigger.py` service to your Django app
- Integrate trigger calls in your test processing completion handlers
- Add Celery tasks to `CELERY_TASK_ROUTES` if using async

### 5. Test the Flow
```bash
# Test internal endpoint
curl -X POST http://localhost:8080/internal/trigger-generate-pdf \
  -H "X-Service-Auth: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "Test_1",
    "classId": "CLASS_TEST", 
    "reportType": "student",
    "studentId": "STU001"
  }'

# Test frontend endpoint (should get S3 file)
curl -X GET "http://localhost:8080/generate-pdf?studentId=STU001&testId=Test_1&classId=CLASS_TEST" \
  -H "Authorization: Bearer user-jwt-token" \
  --output test.pdf
```

## Monitoring & Troubleshooting

### Logs to Monitor
- **PDF Service**: Look for `"PDF found in S3, skipping generation"` vs `"Starting PDF generation"`
- **Backend**: Look for `"PDF generation triggered successfully"` and Celery task logs
- **S3 Upload**: Look for `"PDF uploaded to S3 successfully"` with deterministic keys

### Common Issues
1. **Token mismatch**: Ensure `PDF_SERVICE_INTERNAL_TOKEN` is identical in both services
2. **S3 permissions**: Ensure pdf_service can read/write to bucket
3. **Network**: Ensure backend can reach pdf_service URL
4. **JWT fields**: Ensure token includes correct `student_id`/`teacher_id` fields

### Health Check
```bash
# Check pdf_service health
curl http://localhost:8080/health

# Test S3 connectivity from pdf_service container
sudo docker compose exec pdf_service node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({region: process.env.AWS_REGION, credentials: {accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY}});
client.send(new ListBucketsCommand({})).then(data => console.log('S3 OK:', data.Buckets.length, 'buckets')).catch(console.error);
"
```

## Benefits

1. **Performance**: PDFs pre-generated and cached, instant download for users
2. **Reliability**: Less load on pdf_service during peak usage times  
3. **Scalability**: Background generation doesn't block user interactions
4. **Fallback**: If S3 file missing, still generates on-demand
5. **Cost**: Reduced redundant PDF generations for same report

## Migration Strategy

1. **Phase 1**: Deploy new pdf_service code (backward compatible)
2. **Phase 2**: Add backend trigger integration (parallel to existing flow)  
3. **Phase 3**: Monitor S3 hit rates and performance improvements
4. **Phase 4**: Optional: Add frontend indicators showing "PDF ready" vs "generating"

No breaking changes - existing frontend code continues to work unchanged.