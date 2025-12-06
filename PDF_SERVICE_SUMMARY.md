# PDF Service Docker Integration - Summary

## What Was Done

The PDF service has been successfully integrated into the Tamil Nadu B2B Docker infrastructure. Previously running on a separate instance, it now runs as a containerized service alongside the Django backend, Celery worker, Nginx, and Redis.

## Files Created/Modified

### New Files
1. **`pdf_service/Dockerfile`** - Container image for Node.js PDF service with Puppeteer/Chrome
2. **`pdf_service/.env.docker`** - Docker environment configuration for the PDF service
3. **`PDF_SERVICE_INTEGRATION.md`** - Complete integration documentation
4. **`FRONTEND_PDF_INTEGRATION.md`** - Frontend developer guide with code examples
5. **`start-services.ps1`** - PowerShell script to start and verify all services

### Modified Files
1. **`docker-compose.yml`** - Added `pdf_service` container configuration
2. **`nginx/nginx.conf`** - Added `/pdf/` proxy path to route requests to PDF service
3. **`pdf_service/src/config/index.js`** - Updated to support internal Docker networking

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Docker Network (backend_network)         │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐         │
│  │  Nginx   │───▶│  Django  │    │ Celery Worker│         │
│  │  :80     │    │  App     │    │              │         │
│  └────┬─────┘    │  :8000   │    └──────────────┘         │
│       │          └──────────┘                               │
│       │                                                      │
│       │          ┌──────────────┐   ┌──────────┐           │
│       └─────────▶│ PDF Service  │   │  Redis   │           │
│                  │  :8080       │   │  :6379   │           │
│                  └──────────────┘   └──────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Internal Network Communication
- PDF service communicates with Django backend via internal Docker network
- Backend API calls use `http://app:8000/api` (no external routing)
- Improved security and performance

### 2. Multiple Access Methods
- **Direct**: `http://localhost:8080/generate-pdf` (development)
- **Through Nginx**: `http://localhost:80/pdf/generate-pdf` (production-ready)

### 3. JWT Authentication
- PDF service accepts JWT tokens via `Authorization: Bearer <token>` header
- Tokens are used for both:
  - Backend API authentication
  - Frontend page authentication (set in localStorage)

### 4. Resource Management
- Temporary PDF files automatically cleaned up
- Dedicated volumes for temp storage and logs
- Health checks for monitoring

### 5. Production Ready
- Non-root user execution
- Rate limiting built-in
- CORS properly configured
- Extended timeouts for PDF generation
- Graceful shutdown handling

## Quick Start

### Option 1: Using PowerShell Script
```powershell
.\start-services.ps1
```

### Option 2: Manual Commands
```powershell
# Build and start all services
docker compose up --build -d

# Check service health
docker compose ps
curl http://localhost:8080/health

# View logs
docker compose logs -f pdf_service
```

## Testing the Integration

### 1. Health Check
```powershell
curl http://localhost:8080/health
```

### 2. Through Nginx Proxy
```powershell
curl http://localhost:80/pdf/health
```

### 3. Generate Test PDF (requires valid JWT)
```powershell
$token = "your-jwt-token-here"
Invoke-WebRequest -Uri "http://localhost:8080/generate-pdf?studentId=1&testId=1" `
  -Headers @{"Authorization"="Bearer $token"} `
  -OutFile "test-report.pdf"
```

## Environment Variables

### Required in `pdf_service/.env.docker`:
- `PORT` - Service port (8080)
- `NODE_ENV` - Environment mode (production)
- `ALLOWED_ORIGINS` - CORS allowed origins
- `PDF_TIMEOUT` - PDF generation timeout (120000ms)
- `BACKEND_API_URL` - Internal backend URL (http://app:8000/api)

### Optional:
- `LOG_LEVEL` - Logging verbosity (info/debug)
- `PUPPETEER_HEADLESS` - Run Chrome in headless mode (true)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/generate-pdf` | GET | Single student PDF |
| `/generate-bulk-pdf` | POST | Multiple PDFs as ZIP |
| `/generate-student-pdf` | GET | Student self-report |
| `/generate-teacher-pdf` | GET | Teacher self-report |

All endpoints (except `/health`) require JWT authentication.

## Frontend Integration

Add to your React app:

```javascript
// .env
VITE_PDF_SERVICE_URL=http://localhost:8080

// In your component
const downloadPdf = async (studentId, testId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${import.meta.env.VITE_PDF_SERVICE_URL}/generate-pdf?studentId=${studentId}&testId=${testId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  // Handle download...
};
```

See `FRONTEND_PDF_INTEGRATION.md` for complete examples.

## Maintenance Commands

```powershell
# View logs
docker compose logs -f pdf_service

# Restart PDF service
docker compose restart pdf_service

# Rebuild PDF service
docker compose build pdf_service
docker compose up -d pdf_service

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# View container details
docker compose exec pdf_service env
docker compose exec pdf_service ls -la /usr/src/pdf_service/temp
```

## Troubleshooting

### PDF Service Won't Start
```powershell
# Check logs
docker compose logs pdf_service

# Verify Chrome installation
docker compose exec pdf_service which google-chrome-stable

# Check environment
docker compose exec pdf_service env | Select-String "PDF|NODE|PUPPETEER"
```

### PDF Generation Fails
```powershell
# Test backend connectivity
docker compose exec pdf_service curl http://app:8000/api/health

# Check Puppeteer logs
docker compose logs pdf_service | Select-String "puppeteer"

# Verify frontend accessibility
docker compose exec pdf_service curl -I https://tamilnadu.inzighted.com
```

### Memory Issues
If Chrome crashes due to memory, add to `docker-compose.yml`:
```yaml
pdf_service:
  mem_limit: 2g
  shm_size: 1gb
```

## Performance Considerations

- PDF generation typically takes 30-120 seconds
- Chrome consumes ~200-500MB RAM per generation
- Concurrent requests are handled by single browser instance
- Consider scaling horizontally for high volume:
  ```yaml
  pdf_service:
    deploy:
      replicas: 3
  ```

## Security Notes

- ✓ Non-root user execution (`pdfuser`)
- ✓ JWT authentication required
- ✓ CORS restricted to configured origins
- ✓ Rate limiting (100 req/15min in production)
- ✓ Network isolated to `backend_network`
- ✓ No static credentials stored

## Next Steps

1. **Configure Environment**: Update `.env.docker` files with production values
2. **Test Endpoints**: Verify all PDF endpoints work correctly
3. **Frontend Integration**: Implement PDF download buttons using the provided examples
4. **Monitor Performance**: Watch logs and resource usage during testing
5. **Production Deployment**: Deploy with proper SSL and domain configuration

## Documentation

- **`PDF_SERVICE_INTEGRATION.md`** - Complete technical documentation
- **`FRONTEND_PDF_INTEGRATION.md`** - Frontend integration guide with examples
- **`pdf_service/README.md`** - Original PDF service documentation
- **`DOCKER_README.md`** - Docker setup guide

## Support

For issues or questions:
1. Check logs: `docker compose logs pdf_service`
2. Verify health: `curl http://localhost:8080/health`
3. Review documentation in the files above
4. Check network connectivity between services

---

**Integration completed successfully!** 🎉

All services are now containerized and can be deployed as a single unit using `docker compose up --build -d`.
