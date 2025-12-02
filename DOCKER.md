# Docker Deployment Guide

Complete guide for running the Air4Thai Dashboard with Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Project Structure

```
envi_aqi/
├── docker-compose.yml          # Development configuration
├── docker-compose.prod.yml     # Production configuration
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
└── DOCKER.md                   # This file
```

## Quick Start

### Development Mode

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Production Mode

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

Services will be available at:
- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:8000

## Development Workflow

### Starting Services

```bash
# Start all services in detached mode
docker-compose up -d

# Start specific service
docker-compose up -d backend
docker-compose up -d frontend

# Build and start (rebuild if Dockerfile changed)
docker-compose up -d --build
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Rebuilding Services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild without cache
docker-compose build --no-cache
```

### Accessing Containers

```bash
# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh

# Run Python commands in backend
docker-compose exec backend python -c "import tensorflow as tf; print(tf.__version__)"
```

### Installing Dependencies

```bash
# Backend - install new Python package
docker-compose exec backend pip install <package-name>
docker-compose exec backend pip freeze > requirements.txt

# Frontend - install new npm package
docker-compose exec frontend npm install <package-name>
```

## Environment Variables

### Backend (.env)

Create `backend/.env` file:

```env
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env.local)

Create `frontend/.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Volume Management

### List Volumes

```bash
docker volume ls
```

### Remove Unused Volumes

```bash
# Remove all unused volumes
docker volume prune

# Remove specific volume
docker volume rm envi_aqi_backend-cache
```

## Networking

### View Networks

```bash
docker network ls
docker network inspect envi_aqi_air4thai-network
```

### Test Connectivity

```bash
# From backend to frontend
docker-compose exec backend curl http://frontend:5173

# From frontend to backend
docker-compose exec frontend wget -qO- http://backend:8000/health
```

## Health Checks

```bash
# Check backend health
curl http://localhost:8000/health

# Check container health status
docker ps
# Look for "healthy" or "unhealthy" in STATUS column
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# or
netstat -an | grep 8000

# Kill the process or change port in docker-compose.yml
```

### Container Won't Start

```bash
# View detailed logs
docker-compose logs backend

# Check container status
docker ps -a

# Restart specific service
docker-compose restart backend
```

### Permission Issues

```bash
# Fix volume permissions (Linux)
sudo chown -R $USER:$USER ./backend ./frontend

# Rebuild with no cache
docker-compose build --no-cache
```

### TensorFlow Not Loading

```bash
# Check TensorFlow installation in backend
docker-compose exec backend python -c "import tensorflow as tf; print(tf.__version__)"

# Reinstall if needed
docker-compose exec backend pip install --force-reinstall tensorflow
```

### Frontend Hot Reload Not Working

Ensure volume mounts are correct in `docker-compose.yml`:

```yaml
volumes:
  - ./frontend:/app
  - /app/node_modules  # Anonymous volume for node_modules
```

## Production Deployment

### Build Production Images

```bash
# Build all production images
docker-compose -f docker-compose.prod.yml build

# Tag images for registry
docker tag envi_aqi-backend:latest yourregistry/air4thai-backend:latest
docker tag envi_aqi-frontend:latest yourregistry/air4thai-frontend:latest
```

### Push to Registry

```bash
docker push yourregistry/air4thai-backend:latest
docker push yourregistry/air4thai-frontend:latest
```

### Deploy to Server

```bash
# On production server
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Resource Usage

```bash
# Real-time stats
docker stats

# Specific containers
docker stats air4thai-backend air4thai-frontend
```

### Disk Usage

```bash
# Overall Docker disk usage
docker system df

# Detailed usage
docker system df -v
```

## Cleanup

### Remove Everything

```bash
# Stop and remove containers, networks
docker-compose down

# Remove volumes too
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Nuclear option: remove everything
docker-compose down -v --rmi all --remove-orphans
```

### System Cleanup

```bash
# Remove unused containers, networks, images
docker system prune

# Include volumes
docker system prune -a --volumes
```

## Tips

1. **Development**: Use `docker-compose.yml` with hot reload enabled
2. **Production**: Use `docker-compose.prod.yml` with optimized builds
3. **Logs**: Use `-f` flag to follow logs in real-time
4. **Rebuild**: Use `--build` when Dockerfile or dependencies change
5. **Clean Start**: Run `docker-compose down -v && docker-compose up -d --build`

## Common Commands Cheat Sheet

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Restart service
docker-compose restart backend

# Rebuild and start
docker-compose up -d --build

# Stop all services
docker-compose down

# Execute command in container
docker-compose exec backend python manage.py

# Shell access
docker-compose exec backend bash

# View running containers
docker ps

# Clean up everything
docker-compose down -v --rmi all
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Health check: `curl http://localhost:8000/health`
- Container status: `docker ps -a`
