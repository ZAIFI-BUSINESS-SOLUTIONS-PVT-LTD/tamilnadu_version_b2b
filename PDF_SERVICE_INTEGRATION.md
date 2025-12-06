# PDF Service Docker Integration Guide

## Overview

The PDF Service has been integrated into the main docker-compose setup for the Tamil Nadu B2B project. It runs as a Node.js microservice using Puppeteer to generate PDF reports from React components.

## Architecture Changes

### Previous Setup
- PDF service ran on a separate instance
- Required manual coordination between services
- Separate authentication and configuration

### New Integrated Setup
- PDF service runs as a container in the same docker-compose stack
- Shares the `backend_network` with Django app, worker, nginx, and Redis
- Can communicate directly with backend API using internal Docker networking
- Simplified deployment and management

## Service Configuration

### Container Details
- **Service Name**: `pdf_service`
- **Container Name**: `tamilnadu_pdf_service`
- **Image**: `tamilnadu_pdf_service:latest`
- **Port**: 8080 (exposed to host)
- **Network**: `backend_network`

### Environment Variables

Key configuration in `pdf_service/.env.docker`:

```env
PORT=8080
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:80,http://localhost:5173,https://tamilnadu.inzighted.com
PDF_TIMEOUT=120000
BACKEND_API_URL=http://app:8000/api  # Internal Docker network URL
PUPPETEER_HEADLESS=true
LOG_LEVEL=info
```

### Volume Mounts
- `pdf_temp`: Temporary PDF file storage
- `pdf_logs`: Application logs

## Integration Points

### 1. Frontend → PDF Service
Frontend makes requests to generate PDFs:

```javascript
// Example: Generate student report PDF
const response = await fetch('http://localhost:8080/generate-pdf?studentId=123&testId=456', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Origin': 'https://tamilnadu.inzighted.com'
  }
});
```

### 2. PDF Service → Backend API
PDF service fetches data from Django backend using internal network:

```javascript
// Internal Docker network call
const response = await axios.post(
  'http://app:8000/api/educator/students/insights/',
  { student_id: studentId, test_num: testNum },
  { headers: { Authorization: authToken } }
);
```

### 3. PDF Service → Frontend (Puppeteer)
PDF service navigates to frontend pages to render and capture PDFs:

```javascript
// Navigates to React app with auth token
const reportURL = `https://tamilnadu.inzighted.com/report?studentId=${studentId}&testId=${testId}`;
await page.goto(reportURL);
await page.waitForFunction("window.__PDF_READY__ === true");
```

## API Endpoints

The PDF service exposes the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/generate-pdf` | GET | Generate single student PDF report |
| `/generate-bulk-pdf` | POST | Generate multiple PDFs as a ZIP file |
| `/generate-student-pdf` | GET | Generate student self-report PDF |
| `/generate-teacher-pdf` | GET | Generate teacher self-report PDF |

### Authentication
All endpoints (except `/health`) require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Running the Stack

### Development

```powershell
# Build and start all services
docker compose up --build

# Or run in detached mode
docker compose up --build -d

# View logs for pdf_service
docker compose logs -f pdf_service

# View all logs
docker compose logs -f
```

### Production

```powershell
# Build images
docker compose build

# Start services in background
docker compose up -d

# Check service health
docker compose ps
curl http://localhost:8080/health
```

### Individual Service Management

```powershell
# Restart only pdf_service
docker compose restart pdf_service

# View pdf_service logs
docker compose logs pdf_service

# Execute shell in pdf_service container
docker compose exec pdf_service /bin/sh

# Stop pdf_service
docker compose stop pdf_service

# Remove pdf_service container
docker compose rm -f pdf_service
```

## Testing the Integration

### 1. Health Check
```powershell
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-12-06T10:30:00.000Z",
  "environment": "production",
  "service": "InzightEd PDF Service",
  "version": "1.0.0"
}
```

### 2. Generate Test PDF
```powershell
# Using curl (replace with valid JWT token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:8080/generate-pdf?studentId=1&testId=1" \
  --output test-report.pdf
```

### 3. Check Service Logs
```powershell
docker compose logs pdf_service
```

## Network Communication Flow

```
┌─────────────────┐
│    Frontend     │
│  (React/Vite)   │
└────────┬────────┘
         │ HTTP Request with JWT
         ▼
┌─────────────────┐
│  PDF Service    │◄──────────────┐
│  (Node/Express) │               │
└────────┬────────┘               │
         │                         │
         │ Internal API Call       │ Puppeteer
         ▼                         │ Page Load
┌─────────────────┐               │
│  Django Backend │               │
│  (App Service)  │               │
└─────────────────┘               │
                                  │
         ┌────────────────────────┘
         │
         ▼
┌─────────────────┐
│    Frontend     │
│   (for render)  │
└─────────────────┘
```

## Troubleshooting

### PDF Service Won't Start

1. Check Docker logs:
```powershell
docker compose logs pdf_service
```

2. Verify Chrome dependencies are installed:
```powershell
docker compose exec pdf_service which google-chrome-stable
```

3. Check environment variables:
```powershell
docker compose exec pdf_service env | grep -E 'PORT|NODE_ENV|PUPPETEER'
```

### PDF Generation Fails

1. Check if backend is accessible from pdf_service:
```powershell
docker compose exec pdf_service curl http://app:8000/health
```

2. Verify frontend is accessible:
```powershell
docker compose exec pdf_service curl -I https://tamilnadu.inzighted.com
```

3. Check Puppeteer logs for browser issues:
```powershell
docker compose logs pdf_service | grep -i puppeteer
```

### CORS Issues

1. Verify ALLOWED_ORIGINS in `.env.docker`:
```env
ALLOWED_ORIGINS=http://localhost:80,https://tamilnadu.inzighted.com
```

2. Check request origin header matches allowed origins

3. Review CORS logs:
```powershell
docker compose logs pdf_service | grep -i cors
```

### Memory Issues (Puppeteer/Chrome)

If Chrome crashes due to memory:

1. Increase Docker memory limits in docker-compose.yml:
```yaml
pdf_service:
  mem_limit: 2g
  memswap_limit: 2g
```

2. Add shared memory mount:
```yaml
pdf_service:
  volumes:
    - /dev/shm:/dev/shm
```

## Security Considerations

1. **JWT Authentication**: All PDF generation requests require valid JWT tokens
2. **CORS**: Restricted to configured origins only
3. **Rate Limiting**: Built-in rate limiting (100 requests per 15 minutes in production)
4. **Non-root User**: Container runs as `pdfuser` (non-root)
5. **Network Isolation**: Uses isolated Docker network `backend_network`

## Performance Optimization

### For High-Volume PDF Generation

1. **Scale PDF Service**:
```yaml
pdf_service:
  deploy:
    replicas: 3
```

2. **Use Nginx Load Balancer**:
Add load balancing configuration in `nginx/nginx.conf`

3. **Optimize Puppeteer**:
- Enable reusable browser instances (already configured)
- Adjust `PDF_TIMEOUT` based on complexity
- Monitor memory usage and adjust container limits

### Monitoring

Add monitoring endpoints:
```javascript
// In your monitoring stack
const pdfServiceHealth = await fetch('http://localhost:8080/health');
```

## Maintenance

### Log Rotation
Logs are stored in the `pdf_logs` volume. Set up log rotation:

```yaml
pdf_service:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

### Backup Considerations
- Temp files are automatically cleaned up
- No persistent state to backup (stateless service)
- Configuration is in `.env.docker`

### Updates

To update the PDF service:
```powershell
# Pull latest code
git pull

# Rebuild and restart
docker compose build pdf_service
docker compose up -d pdf_service
```

## Additional Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)

## Support

For issues or questions:
1. Check logs: `docker compose logs pdf_service`
2. Review health endpoint: `curl http://localhost:8080/health`
3. Verify network connectivity between services
4. Check environment configuration in `.env.docker`
