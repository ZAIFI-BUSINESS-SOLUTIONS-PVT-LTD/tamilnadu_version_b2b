import os
import socket
import subprocess
from celery import Celery

# Check if Redis is running
def is_redis_running(host='localhost', port=6379):
    try:
        socket.create_connection((host, port), timeout=2)
        return True
    except OSError:
        return False

# Start Redis server if it's not running
def start_redis_server():
    if not is_redis_running():
        print("🔄 Redis is not running.")
    else:
        print("✅ Redis is already running.")

# 🔁 Ensure Redis is up
start_redis_server()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inzighted.settings')

# 👇 Celery config follows
app = Celery('inzighted')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()