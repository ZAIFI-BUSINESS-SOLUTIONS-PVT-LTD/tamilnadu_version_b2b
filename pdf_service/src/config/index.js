import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Tenant configuration for different products
const tenantConfig = {
  'https://inzighted.com': {
    frontend: 'https://inzighted.com',
    backend: 'https://api.inzighted.com/api'
  },
  'https://tamilnadu.inzighted.com': {
    frontend: 'https://tamilnadu.inzighted.com',
    backend: 'https://tamilnaduapi.inzighted.com/api'
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
    executablePath: process.env.CHROME_PATH || undefined
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
  },

  // AWS S3 Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-southeast-1',
    bucketName: process.env.AWS_STORAGE_BUCKET_NAME || 'inzighted-django-files',
    // Optional: custom S3 endpoint (useful for region-specific endpoints or S3-compatible providers)
    endpoint: process.env.AWS_S3_ENDPOINT || '',
    // Optional: force path style addressing (use true for many S3-compatible providers / custom endpoints)
    forcePathStyle: (process.env.AWS_S3_FORCE_PATH_STYLE || 'false') === 'true',
    s3Enabled: process.env.AWS_S3_UPLOAD_ENABLED !== 'false' // default true
  },

  // Internal Service Configuration
  internal: {
    authToken: process.env.PDF_SERVICE_INTERNAL_TOKEN || 'changeme-internal-token'
  }
};

export default config;
