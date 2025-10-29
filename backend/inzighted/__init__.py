from .celery import app as celery_app

__all__ = ['celery_app']

from django.conf import settings
from django.utils.module_loading import import_string
from django.core.files import storage

if getattr(settings, 'DEFAULT_FILE_STORAGE', '') == 'storages.backends.s3boto3.S3Boto3Storage':
    #print("✅ Forcing default storage to S3")
    storage.default_storage = import_string('storages.backends.s3boto3.S3Boto3Storage')()
