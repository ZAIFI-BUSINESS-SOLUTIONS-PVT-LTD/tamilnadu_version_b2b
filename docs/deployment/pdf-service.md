# PDF Service — Deployment & Operations

The PDF microservice (`pdf_service/`) is a Node.js + Puppeteer service that renders React components to PDF, compresses them with Ghostscript, and uploads to S3.

---

## Architecture

```
Request → Puppeteer renders PDF → Ghostscript compression → S3 upload (async) → Stream to client
                                          ↓ (if compression fails)
                                    Use original PDF (fallback)
```

S3 upload is **non-blocking** — client receives the PDF immediately while upload happens in background.

---

## Environment Variables

In `pdf_service/.env.docker`:

```bash
NODE_ENV=production
PORT=8080
ALLOWED_ORIGINS=https://inzighted.com,https://www.inzighted.com
BASE_URL=https://inzighted.com
LOG_LEVEL=info

# S3 (disable with AWS_S3_UPLOAD_ENABLED=false for local dev)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_STORAGE_BUCKET_NAME=inzighted-django-files
AWS_REGION=ap-southeast-1
AWS_S3_UPLOAD_ENABLED=true
```

---

## S3 Path Structure

```
s3://{bucket}/reports/{class_id}/{test_id}/{filename}.pdf

# Examples:
s3://inzighted-django-files/reports/CLASS_123/Test_45/inzighted_report_student123_Test_45_1733601234567.pdf
s3://inzighted-django-files/reports/CLASS_456/Overall/inzighted_student_report_Overall_1733601234567.pdf
```

---

## API Endpoints

All endpoints require `Authorization: Bearer <jwt_token>`. The `classId` parameter is optional — if omitted, S3 upload is skipped.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/pdf/generate-pdf?studentId=&testId=&classId=` | Single student report |
| `POST` | `/pdf/generate-bulk-pdf` | Bulk reports (body: `{studentIds, testId, classId}`) |
| `GET` | `/pdf/generate-student-pdf?testId=&classId=` | Student self-service report |
| `GET` | `/pdf/generate-teacher-pdf?testId=&classId=` | Teacher self-service report |
| `GET` | `/health` | Health check |

---

## PDF Compression (Ghostscript)

**File:** `pdf_service/src/services/pdfService.js` — `compressPdfWithGhostscript(inputPath)`

Settings: device=`pdfwrite`, compatibility=PDF 1.4, quality=`/ebook`

Typical compression ratios:
- Text-heavy PDFs: 30–50% reduction
- Chart-heavy PDFs: 20–40% reduction
- Already-optimized PDFs: 5–15% reduction

Ghostscript is installed in the Docker image (`pdf_service/Dockerfile`).

---

## Docker Deployment

```bash
# In repo root — rebuild and restart
docker-compose build pdf_service
docker-compose up -d pdf_service

# Verify startup
docker-compose logs pdf_service | grep "S3 client initialized"
# Expected: S3 client initialized { bucket: 'inzighted-django-files', region: 'ap-southeast-1' }
```

### Standalone Docker
```bash
docker build -f docker/Dockerfile -t inzighted-pdf-service .
docker run -d -p 8080:8080 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS=https://inzighted.com \
  --name pdf-service \
  inzighted-pdf-service
```

---

## Monitoring

```bash
# Check compression metrics
docker logs tamilnadu_pdf_service | grep "PDF compression"
# Success: { originalSize: '245KB', compressedSize: '156KB', reduction: '36.4%' }

# Check S3 uploads
docker-compose logs pdf_service | grep "uploaded to S3 successfully" | tail -10

# List recent S3 uploads
aws s3 ls s3://inzighted-django-files/reports/ --recursive --human-readable | tail -20
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Ghostscript not found | Rebuild Docker image: `docker-compose build pdf_service` |
| S3 upload not working | Check credentials in container: `docker-compose exec pdf_service sh -c 'echo $AWS_ACCESS_KEY_ID'` |
| Missing `classId` | Frontend must pass `classId` param; without it S3 upload is skipped (not an error) |
| PDF generation timeout | Adjust timeout in config or reduce page complexity |
| Compressed PDF larger than original | Ghostscript fallback handles this gracefully — original is used |

---

## IAM Permissions Required

Minimal S3 policy for the AWS user:
```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:PutObjectAcl"],
  "Resource": "arn:aws:s3:::inzighted-django-files/reports/*"
}
```

---

## nginx Routing (in `nginx/nginx.conf`)

```nginx
location /pdf/ {
    proxy_pass http://pdf_service:8080/;
    proxy_read_timeout 300s;
    proxy_buffering off;
}
```

---

## Scaling

```nginx
# Horizontal scaling (nginx upstream)
upstream pdf_service {
    server localhost:8080;
    server localhost:8081;
}
```

```bash
# Multiple instances on different ports
PORT=8080 npm start &
PORT=8081 npm start &
```
