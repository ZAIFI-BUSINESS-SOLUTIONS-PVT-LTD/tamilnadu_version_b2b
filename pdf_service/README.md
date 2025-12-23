# InzightEd PDF Service

A robust Node.js microservice for generating PDF reports from React components using Puppeteer.

## 🏗️ Project Structure

```
pdf_service/
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   ├── utils/           # Utility functions
│   └── server.js        # Main application entry
├── docker/              # Docker configuration
├── scripts/             # Development and deployment scripts
├── docs/               # Documentation
├── temp/               # Temporary PDF files
├── logs/               # Application logs
└── package.json        # Dependencies and scripts
```

## 🚀 Quick Start

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Set up environment:**
   ```bash
   copy .env.example .env
   # Edit .env with your local development configuration
   # (Set LOG_LEVEL=debug for verbose logs)
   ```
3. **Start development server:**
   ```bash
   npm run dev
   # or use Docker Compose for dev
   npm run docker:dev
   ```
4. **Hot reload:**
   - The dev server uses `nodemon` for automatic reloads on code changes.
5. **Testing:**
   ```bash
   npm test
   npm run test:new
   ```
6. **Linting:**
   - (Optional) Set up ESLint for code quality. Update the `lint` script and run:
     ```bash
     npm run lint
     ```

### Production Deployment

1. **Install production dependencies:**
   ```bash
   npm ci --only=production
   ```
2. **Set up production environment:**
   ```bash
   copy .env.example .env.production
   # Edit .env.production with secure, production-ready values
   # (Set LOG_LEVEL=info, secure CORS, etc.)
   ```
3. **Start with a process manager:**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   # or use forever
   npm install -g forever
   forever start src/server.js
   ```
4. **Dockerized deployment:**
   ```bash
   npm run docker:prod
   # or manually:
   docker build -f docker/Dockerfile -t inzighted-pdf-service .
   docker run -d -p 8080:8080 --env-file .env.production inzighted-pdf-service
   ```
5. **Reverse proxy & SSL:**
   - Set up nginx/Apache as a reverse proxy with SSL (see docs/deployment.md).
6. **Monitoring & logs:**
   - Monitor with `pm2 logs` or `tail -f logs/app.log`.
   - Health check: `GET /health` endpoint.
   - Set up log rotation (see deployment guide).

### Environment Variables

Environment variables can be set in `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | Local origins |
| `PDF_TIMEOUT` | PDF generation timeout (ms) | `30000` |
| `BASE_URL` | InzightEd frontend URL | `https://inzighted.com` |
| `LOG_LEVEL` | Logging level | `debug` (dev), `info` (prod) |

## ✅ Development Checklist
- [ ] `.env` created and configured for local dev
- [ ] `npm install` run successfully
- [ ] Dev server runs with `npm run dev` or `npm run docker:dev`
- [ ] Logging is verbose (`LOG_LEVEL=debug`)
- [ ] Tests pass (`npm test`)
- [ ] Linting (if configured)

## ✅ Production Checklist
- [ ] `.env.production` created and secured
- [ ] `npm ci --only=production` run
- [ ] Server started with `pm2` or `forever`
- [ ] Docker image built and running (if using Docker)
- [ ] Reverse proxy and SSL configured
- [ ] Logging level set to `info` or `warn`
- [ ] Log rotation enabled
- [ ] Health and log monitoring set up
- [ ] Security checklist from deployment guide followed

## 📋 API Endpoints

### Generate PDF
```
GET /generate-pdf?studentId=123&testId=Test%201
```

**Parameters:**
- `studentId` (required): Student identifier
- `testId` (required): Test identifier

**Response:** PDF file download

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-04T...",
  "environment": "development",
  "service": "InzightEd PDF Service",
  "version": "1.0.0"
}
```

## 🐳 Docker Deployment

### Development
```bash
npm run docker:dev
```

### Production
```bash
npm run docker:prod
```

## 🧪 Testing

```bash
npm test
```

## 📊 Monitoring

- **Logs:** Check `logs/app.log`
- **Health:** `GET /health`
- **Metrics:** Response times logged

## 🔒 Security Features

- Helmet.js for security headers
- Rate limiting
- Input validation
- CORS protection
- Non-root Docker user

## 🛠️ Development

### Adding New Features

1. Add configuration in `src/config/`
2. Create services in `src/services/`
3. Add controllers in `src/controllers/`
4. Update routes in `src/server.js`

### Best Practices

- Use structured logging
- Validate all inputs
- Handle errors gracefully
- Clean up temporary files
- Monitor performance

## 📚 Additional Documentation
- [Deployment Guide](./docs/deployment.md)
- [API Documentation](./docs/api.md)
- [Troubleshooting](./docs/troubleshooting.md)
