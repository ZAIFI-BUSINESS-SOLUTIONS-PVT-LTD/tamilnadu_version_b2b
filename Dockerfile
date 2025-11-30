# Dockerfile
# Production-ready base image
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable stdout/stderr unbuffered
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV POETRY_VIRTUALENVS_CREATE=false

# Set workdir
WORKDIR /usr/src/app

# Install system dependencies required to build wheel packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    libmagic-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /tmp/requirements.txt

# Create static root that nginx will serve
RUN mkdir -p /usr/src/app/static_root

# Copy the project code into image
COPY . /usr/src/app

# Copy and set permissions for entrypoint script
COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

# Set Python path
ENV PYTHONPATH=/usr/src/app

# Expose port (Gunicorn will bind to 8000)
EXPOSE 8000

# Create a non-root user
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /usr/src/app
USER appuser

# Set entrypoint
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]

# Default command: Gunicorn production server
CMD ["gunicorn", "--chdir", "backend", "inzighted.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "4", "--timeout", "120"]
