import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Tenant configuration for different products
// When running inside Docker the PDF service should use the internal
// backend URL (http://app:8000/api) so requests to the Django API stay
// on the Docker network. Frontend URLs remain the public frontend domain
// which Puppeteer will load to render pages.
const tenantConfig = {
  'https://inzighted.com': {
    frontend: 'https://inzighted.com',
    backend: process.env.BACKEND_API_URL || 'https://api.inzighted.com/api'
  },
  // Public Tamil Nadu tenant (external)
  'https://tamilnadu.inzighted.com': {
    frontend: 'https://tamilnadu.inzighted.com',
    // Prefer internal Docker backend when available
    backend: process.env.BACKEND_API_URL || 'http://app:8000/api'
  },
  // API host (backend domain) - when requests come via nginx using the
  // backend domain, still call internal app service for data.
  'https://tamilnaduapi.inzighted.com': {
    frontend: 'https://tamilnadu.inzighted.com',
    backend: process.env.BACKEND_API_URL || 'http://app:8000/api'
  },
  // Local dev (proxy through nginx on host) - resolve backend to internal app
  'http://localhost:80': {
    frontend: 'https://tamilnadu.inzighted.com',
    backend: process.env.BACKEND_API_URL || 'http://app:8000/api'
  }
};

// Get tenant URLs based on origin
const getTenantUrls = (origin) => {
  const tenant = tenantConfig[origin] || tenantConfig['https://inzighted.com']; // default to inzighted.com
  return tenant;
};

const config = {
  // Server Configuration
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS Configuration
  cors: {
    origins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:3001', 
          'http://localhost:5173',
          'https://inzighted.com',
          'https://tamilnadu.inzighted.com'
        ],
    credentials: true,
    optionsSuccessStatus: 200
  },

  // PDF Configuration
  pdf: {
    timeout: parseInt(process.env.PDF_TIMEOUT) || 120000,
    cleanupDelay: parseInt(process.env.CLEANUP_DELAY) || 5000,
    tempDir: process.env.TEMP_DIR || './temp',
    authCookie: process.env.INZIGHTED_AUTH_COOKIE || '', // Add auth cookie config
    getTenantUrls // Function to get tenant-specific URLs
  },

  // Browser Configuration
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: process.env.CHROME_ARGS
      ? process.env.CHROME_ARGS.split(',')
      : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
    // Support both `CHROME_PATH` (used by some configs) and
    // `PUPPETEER_EXECUTABLE_PATH` (used in Docker env). If neither is set,
    // leave undefined so Puppeteer uses the bundled Chromium.
    executablePath: process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // Security Configuration
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000 // limit each IP
    }
  },

  // Backend API Configuration
  backend: {
    baseUrl: null // Will be determined by tenant configuration
  },

  // Tenant Configuration
  tenants: {
    config: tenantConfig,
    defaultOrigin: 'https://inzighted.com'
  }
};

export default config;
