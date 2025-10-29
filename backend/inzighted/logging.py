import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'standard': {
            'format': '[{levelname}] {asctime} {name}:{lineno} - {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
    },

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'stream': sys.stdout,
            'formatter': 'standard',
        },

        # Optional: log to file
        # Enable this by uncommenting the "file" handler in loggers below
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/django.log'),
            'formatter': 'standard',
            'level': 'DEBUG',
        },
    },

    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },

    'loggers': {
        # Django default logging
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },

        # Celery tasks logging
        'celery': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },

        # Your custom modules (add more as needed)
        'exam': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },

        # Uncomment if you want file + console for all logs
        # '__main__': {
        #     'handlers': ['console', 'file'],
        #     'level': 'DEBUG',
        # },
    }
}