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
ALLOWED_HOSTS = ['tamilnaduapi.inzighted.com','tamilnadu.inzighted.com', 'localhost', '127.0.0.1']

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# === CORS Configuration ===
#CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = [
    "https://tamilnadu.inzighted.com",
    "http://localhost:5173",
    "http://13.219.64.187:5173",
]
CORS_ALLOW_CREDENTIALS = True

# === Email Configuration (Zoho SMTP) ===

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # Use SMTP backend for sending emails

EMAIL_HOST = 'smtp.zoho.in'  # SMTP server for Zoho Mail
EMAIL_PORT = 587             # Port for TLS
EMAIL_USE_TLS = True         # Use TLS for secure connection

EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")       # SMTP username from environment variable
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")   # SMTP password from environment variable
EMAIL_USE_TLS = True

DEFAULT_FROM_EMAIL = 'no-reply@inzighted.com'  # Default sender address for emails sent by Django

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
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

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

# === Sentry Error Logging ===
SENTRY_DSN = os.getenv("SENTRY_DSN", "")  # Optional env var
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,  # optional: controls performance tracing
    )

