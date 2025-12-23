# S3 Upload Feature Guide

## Overview
The PDF service now automatically uploads generated PDFs to AWS S3 while still streaming them to the client. This allows for:
- Persistent storage of generated reports
- Easy retrieval and archival
- Organized folder structure in S3

## S3 Folder Structure
PDFs are uploaded to S3 with the following path structure:
```
s3://{bucket}/reports/{class_id}/{test_id}/{filename}.pdf
```

### Example Paths
- `s3://inzighted-django-files/reports/CLASS_123/Test_45/inzighted_report_student123_Test_45_1733601234567.pdf`
- `s3://inzighted-django-files/reports/CLASS_456/Overall/inzighted_student_report_Overall_1733601234567.pdf`
- `s3://inzighted-django-files/reports/CLASS_789/Test_12/inzighted_teacher_report_Test_12_1733601234567.pdf`

## Configuration

### Environment Variables
Add these variables to `pdf_service/.env.docker`:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_STORAGE_BUCKET_NAME=inzighted-django-files
AWS_REGION=ap-southeast-1
AWS_S3_UPLOAD_ENABLED=true
```

### Disable S3 Upload
To disable S3 uploads (useful for local development):
```env
AWS_S3_UPLOAD_ENABLED=false
```

## API Changes

### New Parameter: `classId`
All PDF generation endpoints now accept an optional `classId` parameter:

#### GET /generate-pdf
```
GET /pdf/generate-pdf?studentId=123&testId=Test_45&classId=CLASS_123
Authorization: Bearer <jwt_token>
```

#### POST /generate-bulk-pdf
```json
POST /pdf/generate-bulk-pdf
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "studentIds": ["123", "456", "789"],
  "testId": "Test_45",
  "classId": "CLASS_123"
}
```

#### GET /generate-student-pdf
```
GET /pdf/generate-student-pdf?testId=Test_45&classId=CLASS_123
Authorization: Bearer <jwt_token>
```

#### GET /generate-teacher-pdf
```
GET /pdf/generate-teacher-pdf?testId=Test_45&classId=CLASS_123
Authorization: Bearer <jwt_token>
```

### Backward Compatibility
- If `classId` is not provided, PDFs are still generated and streamed normally
- S3 upload is skipped with a debug log message
- No breaking changes to existing frontend implementations

## Behavior

### Dual Mode Operation
1. **PDF Generation**: PDF is generated in memory
2. **Stream to Client**: PDF is immediately streamed to the client (existing behavior)
3. **S3 Upload**: PDF is asynchronously uploaded to S3 (new feature, non-blocking)

### Error Handling
- If S3 upload fails, the error is logged but **does not** affect the PDF streaming to the client
- Client receives the PDF successfully even if S3 upload fails
- Check logs for S3 upload failures: `"S3 upload failed but continuing"`

### Success Logging
When S3 upload succeeds, you'll see:
```
PDF uploaded to S3 successfully {
  s3Url: "s3://bucket/reports/CLASS_123/Test_45/filename.pdf",
  key: "reports/CLASS_123/Test_45/filename.pdf",
  size: "542.34KB"
}
```

## Deployment

### Step 1: Update Dependencies
```bash
cd /home/ubuntu/Inzighted_V1/pdf_service
npm install
```

### Step 2: Update Environment
Ensure `pdf_service/.env.docker` has AWS credentials (already added).

### Step 3: Rebuild Docker Image
```bash
cd /home/ubuntu/Inzighted_V1
sudo docker compose build pdf_service
```

### Step 4: Restart Service
```bash
sudo docker compose up -d pdf_service
```

### Step 5: Verify
```bash
# Check logs for S3 initialization
sudo docker compose logs pdf_service | grep "S3 client initialized"

# Should see:
# S3 client initialized { bucket: 'inzighted-django-files', region: 'ap-southeast-1' }
```

## Testing

### Test PDF Generation with S3 Upload
```bash
# From host or container
curl -X GET "http://localhost:8080/generate-pdf?studentId=TEST_001&testId=Test_1&classId=CLASS_TEST" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output test_report.pdf

# Check S3 bucket for uploaded file
aws s3 ls s3://inzighted-django-files/reports/CLASS_TEST/Test_1/
```

### Verify S3 Upload in Logs
```bash
sudo docker compose logs pdf_service | grep "S3"
```

Expected output:
```
S3 client initialized
Uploading PDF to S3
PDF uploaded to S3 successfully
```

## Frontend Integration

### Option 1: Pass classId from Frontend (Recommended)
Update your frontend PDF download functions to include `classId`:

```javascript
// Example: Download student report
const downloadPDF = async (studentId, testId, classId) => {
  const response = await fetch(
    `/pdf/generate-pdf?studentId=${studentId}&testId=${testId}&classId=${classId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  // ... handle PDF download
};
```

### Option 2: Auto-fetch classId (Future Enhancement)
Backend could fetch classId automatically by querying the Django API:
- Requires adding logic to `pdfService.fetchReportData()` to include class_id
- Endpoint needed: `/api/students/{studentId}/class/`

## Security Considerations

1. **IAM Permissions**: Ensure the IAM user has minimal required permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:PutObjectAcl"
         ],
         "Resource": "arn:aws:s3:::inzighted-django-files/reports/*"
       }
     ]
   }
   ```

2. **Never Commit Credentials**: AWS credentials are in `.env.docker` which should be in `.gitignore`

3. **Bucket Policy**: Ensure bucket has appropriate access policies

## Troubleshooting

### S3 Upload Not Working
1. Check logs: `sudo docker compose logs pdf_service | grep -i s3`
2. Verify credentials in container:
   ```bash
   sudo docker compose exec pdf_service sh -c 'echo $AWS_ACCESS_KEY_ID'
   ```
3. Test S3 connectivity from container:
   ```bash
   sudo docker compose exec pdf_service node -e "
   import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
   const client = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
   });
   client.send(new ListBucketsCommand({}))
     .then(data => console.log('Buckets:', data.Buckets.map(b => b.Name)))
     .catch(err => console.error('Error:', err.message));
   "
   ```

### Missing classId Parameter
- Check frontend is passing `classId` in URL params or request body
- If not provided, S3 upload is skipped (check logs for "Skipping S3 upload - no classId provided")

### AWS Region Issues
- Default region is `ap-southeast-1` (Singapore)
- Change `AWS_REGION` in `.env.docker` if your bucket is in a different region
- Verify bucket region: `aws s3api get-bucket-location --bucket inzighted-django-files`

## Monitoring

### Check Recent Uploads
```bash
# List recent uploads in S3
aws s3 ls s3://inzighted-django-files/reports/ --recursive --human-readable | tail -20

# Count PDFs by class
aws s3 ls s3://inzighted-django-files/reports/ --recursive | grep "CLASS_" | awk -F'/' '{print $2}' | sort | uniq -c
```

### View Upload Logs
```bash
sudo docker compose logs pdf_service | grep "uploaded to S3 successfully" | tail -10
```

## Performance Impact
- S3 upload is **non-blocking** - client receives PDF immediately
- Upload happens asynchronously after PDF is sent to client
- Typical upload time: 100-500ms for PDFs (does not affect user experience)
- No additional latency for the client

## Future Enhancements
1. Add endpoint to list/retrieve PDFs from S3
2. Auto-fetch `classId` from backend API
3. Support for presigned URLs (temporary download links)
4. S3 lifecycle policies for auto-archival
5. CloudFront CDN integration for faster retrieval
