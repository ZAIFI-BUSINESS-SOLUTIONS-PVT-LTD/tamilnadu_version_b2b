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
    frontend: process.env.PDF_TAMIL_FRONTEND_URL || 'https://tamilnadu.inzighted.com',
    backend: process.env.PDF_TAMIL_BACKEND_URL || 'https://tamilnaduapi.inzighted.com/api'
  }
};

// Get tenant URLs based on origin
const getTenantUrls = (origin) => {
  // Log the origin for debugging
  console.log('[getTenantUrls] Received origin:', origin);
  
  // Normalize origin (remove trailing slashes)
  let normalizedOrigin = origin;
  if (normalizedOrigin) {
    normalizedOrigin = normalizedOrigin.replace(/\/$/, ''); // Remove trailing slash
    
    // Check if origin is a local development server (localhost or local IP with port)
    if (normalizedOrigin.includes('localhost:') || normalizedOrigin.includes('127.0.0.1:') || 
        normalizedOrigin.match(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+/)) {
      console.log('[getTenantUrls] Detected local development server, using origin directly');
      return {
        frontend: normalizedOrigin,
        backend: process.env.PDF_TAMIL_BACKEND_URL || 'https://tamilnaduapi.inzighted.com/api'
      };
    }
    
    // Check if origin contains tamilnadu (case-insensitive)
    if (normalizedOrigin.toLowerCase().includes('tamilnadu')) {
      console.log('[getTenantUrls] Detected TamilNadu tenant by keyword match');
      return tenantConfig['https://tamilnadu.inzighted.com'];
    }
  }
  
  // Check for exact match
  if (tenantConfig[normalizedOrigin]) {
    console.log('[getTenantUrls] Found exact match for origin:', normalizedOrigin);
    return tenantConfig[normalizedOrigin];
  }
  
  // Default to TamilNadu for unknown origins
  console.log('[getTenantUrls] Using default tenant (tamilnadu.inzighted.com) for origin:', normalizedOrigin);
  return tenantConfig['https://tamilnadu.inzighted.com'];
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
          'http://13.219.64.187:5173',
          'http://13.219.64.187:3000',
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
    defaultOrigin: process.env.PDF_TENANTS_DEFAULT_ORIGIN || 'https://tamilnadu.inzighted.com'
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
