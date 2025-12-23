# Quick Start Script for Tamil Nadu B2B with PDF Service
# Run this in PowerShell from the repository root

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tamil Nadu B2B - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if .env.docker exists
Write-Host ""
Write-Host "Checking environment files..." -ForegroundColor Yellow
if (-Not (Test-Path ".env.docker")) {
    Write-Host "✗ .env.docker not found. Please create it from .env.example" -ForegroundColor Red
    exit 1
}
Write-Host "✓ .env.docker exists" -ForegroundColor Green

if (-Not (Test-Path "pdf_service\.env.docker")) {
    Write-Host "✗ pdf_service\.env.docker not found. Please verify it was created." -ForegroundColor Red
    exit 1
}
Write-Host "✓ pdf_service\.env.docker exists" -ForegroundColor Green

# Build and start services
Write-Host ""
Write-Host "Building and starting services..." -ForegroundColor Yellow
Write-Host "This may take several minutes on first run..." -ForegroundColor Gray
Write-Host ""

docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    exit 1
}

# Wait a bit for services to initialize
Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host ""
Write-Host "Checking service health..." -ForegroundColor Yellow

Write-Host "  - Nginx (port 80): " -NoNewline
try {
    $nginx = Invoke-WebRequest -Uri "http://localhost:80" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Running" -ForegroundColor Green
} catch {
    Write-Host "✗ Not responding" -ForegroundColor Red
}

Write-Host "  - PDF Service (port 8080): " -NoNewline
try {
    $pdf = Invoke-RestMethod -Uri "http://localhost:8080/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Running (Status: $($pdf.status))" -ForegroundColor Green
} catch {
    Write-Host "✗ Not responding" -ForegroundColor Red
}

Write-Host "  - Redis (port 6379): " -NoNewline
try {
    $redis = docker compose exec -T broker redis-cli ping 2>$null
    if ($redis -eq "PONG") {
        Write-Host "✓ Running" -ForegroundColor Green
    } else {
        Write-Host "✗ Not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Not responding" -ForegroundColor Red
}

# Show running containers
Write-Host ""
Write-Host "Running containers:" -ForegroundColor Cyan
docker compose ps

# Show logs hint
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Services are starting up!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View all logs:           " -NoNewline; Write-Host "docker compose logs -f" -ForegroundColor White
Write-Host "  View PDF service logs:   " -NoNewline; Write-Host "docker compose logs -f pdf_service" -ForegroundColor White
Write-Host "  View app logs:           " -NoNewline; Write-Host "docker compose logs -f app" -ForegroundColor White
Write-Host "  Stop services:           " -NoNewline; Write-Host "docker compose down" -ForegroundColor White
Write-Host "  Restart a service:       " -NoNewline; Write-Host "docker compose restart <service_name>" -ForegroundColor White
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Backend API:             " -NoNewline; Write-Host "http://localhost:80" -ForegroundColor White
Write-Host "  PDF Service:             " -NoNewline; Write-Host "http://localhost:8080" -ForegroundColor White
Write-Host "  PDF Service Health:      " -NoNewline; Write-Host "http://localhost:8080/health" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  PDF Integration Guide:   " -NoNewline; Write-Host "PDF_SERVICE_INTEGRATION.md" -ForegroundColor White
Write-Host "  Frontend Guide:          " -NoNewline; Write-Host "FRONTEND_PDF_INTEGRATION.md" -ForegroundColor White
Write-Host ""
