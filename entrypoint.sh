#!/bin/bash
# entrypoint.sh - Startup script for Django container

set -e

echo "🚀 Starting Django application..."

# Navigate to backend directory
cd /usr/src/app/backend

# Wait for PostgreSQL to be ready (if using host.docker.internal, check connectivity)
echo "⏳ Waiting for database to be ready..."
python << END
import sys
import time
import psycopg2
from os import environ

db_host = environ.get('DB_HOST', 'localhost')
db_port = environ.get('DB_PORT', '5432')
db_name = environ.get('DB_NAME', 'inzighted_db')
db_user = environ.get('DB_USER', 'inzighted_user')
db_password = environ.get('DB_PASSWORD', '')

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        conn.close()
        print("✅ Database is ready!")
        sys.exit(0)
    except psycopg2.OperationalError:
        retry_count += 1
        print(f"⏳ Database not ready yet, retrying... ({retry_count}/{max_retries})")
        time.sleep(2)

print("❌ Could not connect to database after maximum retries")
sys.exit(1)
END

# Run database migrations
echo "🔄 Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "✅ Initialization complete!"

# Execute the main container command
exec "$@"
