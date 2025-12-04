# Docker Quick Reference

## 🚀 Getting Started

```powershell
# Build and start all services
docker compose up -d --build

# View logs (all services)
docker compose logs -f

# Check service status
docker compose ps
```

## 🛠️ Common Commands

### Service Management
```powershell
# Stop all services
docker compose stop

# Restart all services
docker compose restart

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (deletes data!)
docker compose down -v
```

### View Logs
```powershell
# All services
docker compose logs -f
docker compose logs app --tail=100
# Specific service
docker compose logs -f app
docker compose logs -f worker
docker compose logs -f nginx
docker compose logs -f broker
```

### Django Management
```powershell
# Create superuser
docker compose exec app python backend/manage.py createsuperuser

# Run migrations
docker compose exec app python backend/manage.py migrate

# Collect static files
docker compose exec app python backend/manage.py collectstatic --noinput

# Django shell
docker compose exec app python backend/manage.py shell

# Run custom management command
docker compose exec app python backend/manage.py <command>
```

### Debugging
```powershell
# Access app container shell
docker compose exec app bash

# View container processes
docker compose top

# Check resource usage
docker stats

# Inspect container details
docker inspect tamilnadu_backend_app
```

### Code Updates
```powershell
# After code changes, rebuild and restart
docker compose up -d --build

# Rebuild specific service
docker compose build app
docker compose up -d app
```

### Database & Redis
```powershell
# Test Redis connection
docker compose exec broker redis-cli ping

# Access Redis CLI
docker compose exec broker redis-cli

# Check Celery worker status
docker compose exec worker celery -A inzighted --workdir /usr/src/app/backend inspect active

# Check Celery registered tasks
docker compose exec worker celery -A inzighted --workdir /usr/src/app/backend inspect registered
```

## 📋 Environment Setup

Before first run, ensure your `.env` file has:

```env
DB_HOST=host.docker.internal
NEO4J_URI=bolt://host.docker.internal:7687
CELERY_BROKER_URL=redis://broker:6379/0
CELERY_RESULT_BACKEND=redis://broker:6379/1
```

## 🌐 Access Points

- **API**: http://localhost/
- **Admin**: http://localhost/admin/
- **Static Files**: http://localhost/static/
- **Uploads**: http://localhost/uploads/

## 📊 Monitoring

```powershell
# View all running containers
docker ps

# Check service health
docker compose ps

# Monitor resource usage
docker stats

# Check disk usage
docker system df
```

## 🧹 Cleanup

```powershell
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Full cleanup (be careful!)
docker system prune -a --volumes
```
