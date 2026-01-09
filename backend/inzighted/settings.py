"""
Django settings for inzighted project.
"""

import os
from dotenv import load_dotenv
from datetime import timedelta
import sentry_sdk

# === Load .env file ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '../.env'))

# === Security and Core Settings ===
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-secret-key')
DEBUG = True

# === Hosts (from environment) ===
def _parse_env_list(var_name):
    val = os.getenv(var_name, '')
    if not val:
        return []
    return [item.strip() for item in val.split(',') if item.strip()]

ALLOWED_HOSTS = _parse_env_list('ALLOWED_HOSTS') or ['tamilnaduapi.inzighted.com', 'tamilnadu.inzighted.com', 'localhost', '127.0.0.1', '13.219.64.187']

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# === CORS Configuration ===
# You can set `CORS_ALLOWED_ORIGINS` in .env as a comma-separated list.
# Example: CORS_ALLOWED_ORIGINS=https://tamilnadu.inzighted.com,http://localhost:5173
CORS_ALLOWED_ORIGINS = _parse_env_list('CORS_ALLOWED_ORIGINS') or [
    "https://tamilnadu.inzighted.com",
    "http://localhost:5173",
    "http://13.219.64.187:5173",
]
CORS_ALLOW_CREDENTIALS = True

# === Proxy SSL Configuration (for ALB/ACM) ===
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CSRF_TRUSTED_ORIGINS = _parse_env_list('CSRF_TRUSTED_ORIGINS') or []
SECURE_SSL_REDIRECT = False  # ALB handles HTTPS redirect

# === Email Configuration (from environment) ===
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = os.getenv('EMAIL_PORT', '587')


# TLS/SSL flags (allow env values like 'true', '1', 'yes')
def _env_bool(name, default=False):
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in ('1', 'true', 'yes', 'y')

EMAIL_USE_TLS = _env_bool('EMAIL_USE_TLS', True)
EMAIL_USE_SSL = _env_bool('EMAIL_USE_SSL', False)

EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'no-reply@inzighted.com')
FRONTEND_RESET_URL = os.getenv('FRONTEND_RESET_URL', '')

# === Installed Applications ===
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'corsheaders',
    'django_celery_results',
    'django_celery_beat',
    'django_extensions',
    'rest_framework',
    'rest_framework_simplejwt',
    'storages',
    # Local apps
    'exam',
]

# === Middleware ===
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# === URL and WSGI ===
ROOT_URLCONF = 'inzighted.urls'
WSGI_APPLICATION = 'inzighted.wsgi.application'

# === Templates ===
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# === Database ===
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'inzighted_db'),
        'USER': os.getenv('DB_USER', 'inzighted_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'your-password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# === Password Validation ===
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# === Internationalization ===
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# === Static Files ===
STATIC_URL = '/static/'
# Put collected static files where the Docker `static_data` volume and nginx expect them.
# Default to `/usr/src/app/static_root` but allow overriding with env var.
STATIC_ROOT = os.getenv('DJANGO_STATIC_ROOT', '/usr/src/app/static_root')

# === PDF Service Integration ===
# URL the backend should use to call the internal pdf service endpoint.
# In Docker compose this is typically the service name (http://pdf_service:8080).
PDF_SERVICE_URL = os.getenv('PDF_SERVICE_URL', 'http://pdf_service:8080')

# Internal token expected by the pdf service for internal requests.
PDF_SERVICE_INTERNAL_TOKEN = os.getenv('PDF_SERVICE_INTERNAL_TOKEN', 'changeme-internal-token')

# Default frontend origin used when generating report tokens or calling the PDF service
DEFAULT_FRONTEND_ORIGIN = os.getenv('DEFAULT_FRONTEND_ORIGIN', 'https://tamilnadu.inzighted.com')

# === AWS S3 Storage ===
AWS_S3_REGION_NAME = 'us-east-1'  # e.g., 'us-east-1'
AWS_S3_FILE_OVERWRITE = True
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')

# === File Storage Backend ===
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# === Celery Configuration ===
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# === Celery Result Backend ===
# Chords require a result backend that supports chords (Redis, django-db, database, memcached, etc.).
# Default to Redis on localhost (db 1). You can override by setting `CELERY_RESULT_BACKEND` in the environment
# or use the django-db backend provided by `django-celery-results` by setting it to 'django-db'.
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')

# Convenience: allow an explicit flag to force django-db backend (useful in production when using DB-backed results)
if os.getenv('USE_DJANGO_CELERY_RESULTS', '').lower() in ('1', 'true', 'yes'):
    CELERY_RESULT_BACKEND = 'django-db'

# === REST Framework ===
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'exam.authentication.UniversalJWTAuthentication',
    ),
}

# === JWT SimpleJWT Settings ===
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# === Misconception Inference Feature Flag ===
# Enable/disable LLM-based misconception inference for wrong answers
ENABLE_MISCONCEPTION_INFERENCE = os.getenv('ENABLE_MISCONCEPTION_INFERENCE', 'false').lower() in ('true', '1', 'yes')

# === Checkpoints Feature Flag ===
# Enable/disable combined checklist + action plan generation (new Checkpoints table)
ENABLE_CHECKPOINTS = os.getenv('ENABLE_CHECKPOINTS', 'false').lower() in ('true', '1', 'yes')

# === Cumulative Checkpoints Feature Flag ===
# Enable/disable cumulative (all-tests) checkpoint generation stored with test_num=0
ENABLE_CUMULATIVE_CHECKPOINTS = os.getenv('ENABLE_CUMULATIVE_CHECKPOINTS', 'false').lower() in ('true', '1', 'yes')

# === Sentry Error Logging ===
SENTRY_DSN = os.getenv("SENTRY_DSN", "")  # Optional env var
if SENTRY_DSN:
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    
    sentry_logging = LoggingIntegration(
        level=None,         # Don't capture logs as breadcrumbs by default
        event_level="ERROR" # Send ERROR+ logs as Sentry events
    )
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            sentry_logging,
            CeleryIntegration()
        ],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        send_default_pii=os.getenv("SENTRY_SEND_PII", "false").lower() in ("1", "true", "yes"),
        environment=os.getenv("SENTRY_ENV", os.getenv("DJANGO_ENV", "development")),
    )

