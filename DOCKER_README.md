# Docker Setup Guide for Tamilnadu B2B Backend

This guide explains how to run the Tamilnadu B2B backend application using Docker.

## 📋 Prerequisites

- Docker Desktop installed (for Windows/Mac) or Docker Engine (for Linux)
- Docker Compose v3.8 or higher
- PostgreSQL database running on host machine (or accessible via network)
- Neo4j database running on host machine (or accessible via network)

## 🏗️ Architecture

The Docker setup includes 4 services:

1. **app** - Django application served by Gunicorn
2. **worker** - Celery worker for background tasks
3. **nginx** - Reverse proxy and static file server
4. **broker** - Redis message broker for Celery

## 🚀 Quick Start

### 1. Configure Environment Variables

Update your `.env` file with Docker-specific settings:

```bash
# Database - Use host.docker.internal for databases on host machine
DB_HOST=host.docker.internal
DB_PORT=5432

# Neo4j - Use host.docker.internal for Neo4j on host machine
NEO4J_URI=bolt://host.docker.internal:7687

# Redis - Use broker service name from docker-compose
CELERY_BROKER_URL=redis://broker:6379/0
CELERY_RESULT_BACKEND=redis://broker:6379/1
```

**Note**: A template `.env.docker` file is provided. You can copy it to `.env`:


### 2. Build and Start Services

```powershell
# Build the Docker images
docker compose build

# Start all services in detached mode
docker compose up -d

# View logs
docker compose logs -f
```

### 3. Verify Services

Check that all services are running:

```powershell
docker compose ps
```

You should see 4 services running:
- tamilnadu_backend_app
- tamilnadu_backend_worker
- tamilnadu_nginx
- tamilnadu_redis

### 4. Access the Application

- API: http://localhost/
- Django Admin: http://localhost/admin/

## 🔧 Management Commands

### View Logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f worker
docker compose logs -f nginx
```

### Run Django Management Commands

```powershell
# Create superuser
docker compose exec app python backend/manage.py createsuperuser

# Run migrations manually (already done by entrypoint.sh)
docker compose exec app python backend/manage.py migrate

# Collect static files manually (already done by entrypoint.sh)
docker compose exec app python backend/manage.py collectstatic --noinput

# Access Django shell
docker compose exec app python backend/manage.py shell
```

### Restart Services

```powershell
# Restart all services
docker compose restart

# Restart specific service
docker compose restart app
docker compose restart worker
```

### Stop Services

```powershell
# Stop all services (keeps containers)
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (WARNING: deletes Redis data)
docker compose down -v
```

## 🔄 Updating Code

After making code changes:

```powershell
# Rebuild and restart
docker compose up -d --build

# Or rebuild specific service
docker compose build app
docker compose up -d app
```

## 📊 Monitoring

### Check Service Status

```powershell
docker compose ps
```

### View Resource Usage

```powershell
docker stats
```

### Check Redis Connection

```powershell
docker compose exec broker redis-cli ping
```

### Test Celery Worker

```powershell
docker compose exec worker celery -A inzighted --workdir /usr/src/app/backend inspect active
```

## 🐛 Troubleshooting

### Database Connection Issues

If the app can't connect to PostgreSQL:

1. Ensure PostgreSQL is running on your host machine
2. Check that PostgreSQL allows connections from Docker (update `pg_hba.conf` if needed)
3. On Linux, you may need to use the host IP instead of `host.docker.internal`

```powershell
# Get host IP (Linux)
ip addr show docker0 | grep -Po 'inet \K[\d.]+'
```

### Neo4j Connection Issues

If the app can't connect to Neo4j:

1. Ensure Neo4j is running and accessible
2. Verify the bolt port (7687) is open
3. Check Neo4j configuration allows connections from Docker

### View Container Errors

```powershell
# View app container logs
docker compose logs app --tail=100

# Check if entrypoint script ran successfully
docker compose exec app cat /var/log/django.log
```

### Rebuild from Scratch

If you encounter persistent issues:

```powershell
# Stop and remove everything
docker compose down -v

# Remove images
docker rmi tamilnadu_backend_app:latest tamilnadu_backend_worker:latest

# Rebuild
docker compose build --no-cache
docker compose up -d
```

## 📁 File Structure

```
tamilnadu_version_b2b/
├── Dockerfile              # Container build instructions
├── docker-compose.yml      # Multi-service orchestration
├── entrypoint.sh          # Startup script (migrations, collectstatic)
├── .dockerignore          # Exclude files from build context
├── .env.docker            # Docker environment template
├── nginx/
│   └── nginx.conf         # Nginx reverse proxy configuration
└── backend/
    ├── requirements.txt   # Python dependencies
    └── ...
```

## 🔐 Security Notes

- **Production**: Set `DEBUG=False` in `settings.py`
- **Secrets**: Use Docker secrets or a secret management service in production
- **HTTPS**: Configure SSL/TLS certificates in nginx for production
- **Database**: Use managed database services (AWS RDS, etc.) in production

## 🌐 Production Deployment

For production deployment:

1. Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in `.env`
2. Set `DEBUG=False` in `backend/inzighted/settings.py`
3. Use environment-specific `.env` files
4. Configure HTTPS in nginx
5. Use managed database services
6. Set up monitoring and logging
7. Configure auto-scaling if needed

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🤝 Support

For issues or questions, please contact the development team.
