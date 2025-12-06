# PDF Service Integration - Deployment Checklist

## Pre-Deployment Verification

### 1. File Structure ✓
- [ ] `pdf_service/Dockerfile` exists
- [ ] `pdf_service/.env.docker` exists
- [ ] `pdf_service/.dockerignore` exists
- [ ] `docker-compose.yml` updated with pdf_service
- [ ] `nginx/nginx.conf` updated with /pdf/ proxy
- [ ] `pdf_service/src/config/index.js` updated for Docker networking

### 2. Environment Configuration
- [ ] Review `pdf_service/.env.docker` settings:
  - [ ] `PORT=8080`
  - [ ] `NODE_ENV=production`
  - [ ] `ALLOWED_ORIGINS` includes your domains
  - [ ] `BACKEND_API_URL=http://app:8000/api`
  - [ ] `PDF_TIMEOUT=120000`
  - [ ] `PUPPETEER_HEADLESS=true`
  - [ ] `LOG_LEVEL=info`

### 3. Backend Configuration (.env.docker)
- [ ] Database credentials configured
- [ ] Redis connection configured
- [ ] Django secret key set
- [ ] CORS origins include frontend domains
- [ ] AWS S3 credentials (if using S3)
- [ ] Sentry DSN (if using Sentry)

## Build and Test Locally

### 4. Initial Build
```powershell
# From repository root
cd f:\ZAIFI\Tech\Projects\Tamilnadu_b2b\tamilnadu_version_b2b

# Build all services
docker compose build

# Expected: No errors, all images built successfully
```

- [ ] Django app builds successfully
- [ ] PDF service builds successfully
- [ ] No build errors or warnings

### 5. Start Services
```powershell
# Start all services
docker compose up -d

# Wait 30 seconds for initialization
Start-Sleep -Seconds 30

# Check status
docker compose ps
```

- [ ] All containers show "running" status
- [ ] No containers in "restarting" or "exited" state

### 6. Health Checks
```powershell
# Check PDF service health
curl http://localhost:8080/health

# Check through nginx proxy
curl http://localhost:80/pdf/health

# Check Redis
docker compose exec broker redis-cli ping
# Expected: PONG
```

- [ ] PDF service health returns `{"status":"OK",...}`
- [ ] Nginx proxy route works
- [ ] Redis responds with PONG

### 7. Log Verification
```powershell
# Check PDF service logs
docker compose logs pdf_service | Select-String -Pattern "error|fail" -NotMatch

# Check app logs
docker compose logs app | Select-String -Pattern "error|fail" -NotMatch

# Check nginx logs
docker compose logs nginx | Select-String -Pattern "error|fail" -NotMatch
```

- [ ] No critical errors in PDF service logs
- [ ] Django migrations completed successfully
- [ ] Static files collected successfully
- [ ] No nginx proxy errors

### 8. Network Connectivity
```powershell
# Test internal network connectivity
docker compose exec pdf_service curl -s http://app:8000/health
# Expected: Success response from Django

docker compose exec app curl -s http://pdf_service:8080/health
# Expected: Success response from PDF service
```

- [ ] PDF service can reach Django backend
- [ ] Django can reach PDF service (optional)
- [ ] All services on same network

## Functional Testing

### 9. PDF Generation Test
**Prerequisites**: 
- Valid JWT token from your backend
- Test data in database (student ID and test ID)

```powershell
# Set your JWT token
$token = "your-jwt-token-here"

# Test PDF generation
Invoke-WebRequest `
  -Uri "http://localhost:8080/generate-pdf?studentId=1&testId=1" `
  -Headers @{"Authorization"="Bearer $token"} `
  -OutFile "test-report.pdf"

# Check file
Get-Item test-report.pdf
```

- [ ] PDF file created successfully
- [ ] PDF file size > 0 bytes
- [ ] PDF opens and displays correctly
- [ ] PDF contains expected report data

### 10. Frontend Integration Test
```javascript
// In your React app console
const token = localStorage.getItem('token');
const response = await fetch(
  'http://localhost:8080/generate-pdf?studentId=1&testId=1',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const blob = await response.blob();
console.log('PDF size:', blob.size, 'bytes');
```

- [ ] Frontend can call PDF service
- [ ] No CORS errors
- [ ] PDF downloads successfully
- [ ] User sees loading state during generation

## Production Preparation

### 11. Security Review
- [ ] JWT authentication working
- [ ] CORS properly restricted
- [ ] Rate limiting configured
- [ ] Containers run as non-root users
- [ ] Secrets not in version control
- [ ] `.env.docker` files in .gitignore

### 12. Performance Testing
```powershell
# Generate multiple PDFs
1..5 | ForEach-Object {
  $token = "your-jwt-token"
  Write-Host "Generating PDF $_..."
  Invoke-WebRequest `
    -Uri "http://localhost:8080/generate-pdf?studentId=$_&testId=1" `
    -Headers @{"Authorization"="Bearer $token"} `
    -OutFile "report-$_.pdf"
}

# Monitor resources
docker stats
```

- [ ] Multiple PDFs generate successfully
- [ ] Memory usage acceptable (<2GB per container)
- [ ] CPU usage reasonable
- [ ] No memory leaks over time
- [ ] Temp files cleaned up automatically

### 13. Error Handling
Test error scenarios:

```powershell
# Test without JWT
curl http://localhost:8080/generate-pdf?studentId=1&testId=1
# Expected: 401 or 500 with error message

# Test invalid student ID
curl -H "Authorization: Bearer $token" `
  http://localhost:8080/generate-pdf?studentId=999999&testId=1
# Expected: Graceful error handling

# Test timeout (if possible)
# Expected: Timeout error after PDF_TIMEOUT
```

- [ ] Missing JWT handled gracefully
- [ ] Invalid data handled gracefully
- [ ] Timeouts handled gracefully
- [ ] Errors logged properly

### 14. Monitoring Setup
- [ ] Health check endpoints configured
- [ ] Logging configured (file and/or external)
- [ ] Log rotation configured
- [ ] Resource limits set (memory, CPU)
- [ ] Alerting configured (if applicable)

## Documentation Review

### 15. Documentation Complete
- [ ] `PDF_SERVICE_SUMMARY.md` reviewed
- [ ] `PDF_SERVICE_INTEGRATION.md` reviewed
- [ ] `FRONTEND_PDF_INTEGRATION.md` shared with frontend team
- [ ] Team trained on new architecture
- [ ] Deployment runbook created

## Production Deployment

### 16. Pre-Production Checklist
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified
- [ ] DNS/Load balancer configured

### 17. Deployment Steps
```powershell
# 1. Pull latest code
git pull origin main

# 2. Backup current .env files
Copy-Item .env.docker .env.docker.backup
Copy-Item pdf_service/.env.docker pdf_service/.env.docker.backup

# 3. Update environment variables for production
# Edit .env.docker and pdf_service/.env.docker

# 4. Build images
docker compose build

# 5. Stop old services
docker compose down

# 6. Start new services
docker compose up -d

# 7. Verify health
Start-Sleep -Seconds 30
docker compose ps
curl http://localhost:8080/health
curl http://localhost:80/pdf/health

# 8. Monitor logs
docker compose logs -f --tail=100
```

- [ ] Deployment successful
- [ ] All services running
- [ ] No errors in logs
- [ ] Health checks passing

### 18. Post-Deployment Verification
- [ ] Test PDF generation from production frontend
- [ ] Verify all user roles can generate PDFs
- [ ] Check logs for any errors
- [ ] Monitor resource usage
- [ ] Verify cleanup of temp files

### 19. Rollback Plan (if needed)
```powershell
# Stop services
docker compose down

# Restore backup environment
Copy-Item .env.docker.backup .env.docker
Copy-Item pdf_service/.env.docker.backup pdf_service/.env.docker

# Use previous images (if available)
# Or rebuild from previous commit
git checkout <previous-commit>
docker compose build
docker compose up -d
```

## Ongoing Maintenance

### 20. Regular Monitoring
- [ ] Daily health check review
- [ ] Weekly log review
- [ ] Monthly resource usage review
- [ ] Quarterly security audit

### 21. Maintenance Tasks
- [ ] Clean up old Docker images: `docker image prune`
- [ ] Monitor volume sizes: `docker system df`
- [ ] Review and rotate logs
- [ ] Update dependencies periodically
- [ ] Test disaster recovery procedures

## Success Criteria

✅ **Integration Successful When:**
- All containers running without restarts
- Health endpoints returning OK
- PDFs generating successfully
- No errors in logs
- Frontend integration working
- Performance acceptable
- Security controls in place
- Documentation complete
- Team trained

## Troubleshooting Quick Reference

### PDF Service Not Starting
```powershell
docker compose logs pdf_service
docker compose exec pdf_service ls -la /usr/src/pdf_service
```

### PDF Generation Fails
```powershell
# Check backend connectivity
docker compose exec pdf_service curl http://app:8000/health

# Check Chrome
docker compose exec pdf_service google-chrome-stable --version
```

### High Memory Usage
```powershell
docker stats
# Add memory limits if needed
```

### CORS Errors
```powershell
# Verify ALLOWED_ORIGINS
docker compose exec pdf_service env | grep ALLOWED_ORIGINS
```

## Support Contacts

- **Backend Team**: [Contact Info]
- **Frontend Team**: [Contact Info]
- **DevOps Team**: [Contact Info]
- **Documentation**: See `PDF_SERVICE_INTEGRATION.md`

---

**Last Updated**: December 6, 2025
**Version**: 1.0.0
**Status**: Ready for Testing
