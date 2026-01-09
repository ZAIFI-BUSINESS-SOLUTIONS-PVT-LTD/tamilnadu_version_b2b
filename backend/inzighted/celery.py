import os
import socket
from urllib.parse import urlparse
from celery import Celery


# Determine Redis host/port from environment (supports docker setup)
def get_redis_host_port():
    # Common env var used by this project: CELERY_BROKER_URL (e.g. redis://broker:6379/0)
    broker_url = os.environ.get('CELERY_BROKER_URL') or os.environ.get('CELERY_BROKER') or os.environ.get('CELERY_BROKER_URL')
    if broker_url:
        try:
            parsed = urlparse(broker_url)
            host = parsed.hostname or 'localhost'
            port = parsed.port or 6379
            return host, port
        except Exception:
            pass

    # Fallbacks for docker-compose environment
    # Prefer service name `broker` when running in docker-compose
    host = os.environ.get('REDIS_HOST') or os.environ.get('BROKER_HOST') or 'broker'
    port = int(os.environ.get('REDIS_PORT') or os.environ.get('BROKER_PORT') or 6379)
    return host, port


# Check if Redis is reachable
def is_redis_running(host=None, port=None, timeout=2):
    host = host or 'localhost'
    port = port or 6379
    try:
        socket.create_connection((host, port), timeout=timeout)
        return True
    except OSError:
        return False


# Print a friendly message but avoid failing import if Redis isn't ready yet.
def check_and_report_redis():
    host, port = get_redis_host_port()
    if is_redis_running(host, port):
        print(f"✅ Redis is reachable at {host}:{port}")
    else:
        print(f"🔄 Redis is not reachable at {host}:{port} (this may be transient)")


check_and_report_redis()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inzighted.settings')

# Celery configuration
app = Celery('inzighted')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Explicitly import task modules that are not in standard tasks.py location
# This ensures they are registered even if autodiscover doesn't find them
@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    """Import non-standard task modules to register them with Celery."""
    import exam.services.misconception_task  # noqa
    import exam.services.checkpoint_task  # noqa
    import exam.services.checkpoints_task  # noqa
    import exam.services.pdf_trigger  # noqa
    import exam.services.whatsapp_notification  # noqa
    import exam.services.process_test_data  # noqa
    import exam.services.update_dashboard  # noqa
    import exam.services.save_students  # noqa
    import exam.services.debug  # noqa
    import exam.utils.email_tasks  # noqa
    import exam.utils.analysis_generator  # noqa
    import exam.utils.student_analysis  # noqa