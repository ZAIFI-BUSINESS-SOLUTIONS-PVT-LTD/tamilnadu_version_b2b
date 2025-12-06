# Deployment Guide

## 🌐 Production Deployment

### Prerequisites

- Node.js 20+
- Docker (optional)
- Reverse proxy (nginx/Apache)
- SSL certificate

### Environment Setup

1. **Create production environment file:**
   ```bash
   cp .env.example .env.production
   ```

2. **Configure production settings:**
   ```bash
   NODE_ENV=production
   PORT=8080
   ALLOWED_ORIGINS=https://inzighted.com,https://www.inzighted.com
   BASE_URL=https://inzighted.com
   LOG_LEVEL=info
   ```

### Direct Deployment

1. **Install dependencies:**
   ```bash
   npm ci --only=production
   ```

2. **Start with process manager:**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start ecosystem.config.js
   
   # Using forever
   npm install -g forever
   forever start src/server.js
   ```

### Docker Deployment

1. **Build and run:**
   ```bash
   docker build -f docker/Dockerfile -t inzighted-pdf-service .
   docker run -d -p 8080:8080 \
     -e NODE_ENV=production \
     -e ALLOWED_ORIGINS=https://inzighted.com \
     --name pdf-service \
     inzighted-pdf-service
   ```

2. **Using Docker Compose:**
   ```bash
   docker-compose -f docker/docker-compose.prod.yml up -d
   ```

### Reverse Proxy Configuration

#### Nginx

```nginx
server {
    listen 443 ssl;
    server_name pdf.inzighted.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for PDF generation
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

### Health Monitoring

1. **Health check endpoint:**
   ```bash
   curl https://pdf.inzighted.com/health
   ```

2. **Log monitoring:**
   ```bash
   tail -f logs/app.log
   ```

3. **Process monitoring:**
   ```bash
   pm2 status
   pm2 logs
   ```

### Scaling

#### Horizontal Scaling

1. **Load balancer configuration:**
   ```nginx
   upstream pdf_service {
       server localhost:8080;
       server localhost:8081;
       server localhost:8082;
   }
   ```

2. **Multiple instances:**
   ```bash
   # Start multiple instances on different ports
   PORT=8080 npm start &
   PORT=8081 npm start &
   PORT=8082 npm start &
   ```

#### Vertical Scaling

- Increase Docker memory limits
- Optimize Puppeteer settings
- Use SSD storage for temp files

### Security Checklist

- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Non-root Docker user
- [ ] Regular security updates
- [ ] Firewall configured
- [ ] Log monitoring enabled

### Backup Strategy

1. **Configuration backup:**
   ```bash
   # Backup environment files
   tar -czf config-backup.tar.gz .env* docker/
   ```

2. **Log rotation:**
   ```bash
   # Configure logrotate
   /app/logs/*.log {
       daily
       rotate 30
       compress
       delaycompress
       notifempty
   }
   ```

### Troubleshooting

See [troubleshooting.md](./troubleshooting.md) for common issues and solutions.
