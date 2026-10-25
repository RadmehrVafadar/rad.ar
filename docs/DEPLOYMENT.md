# Deployment Guide

## Docker Compose (recommended)

```bash
# 1. Copy and edit environment variables
cp .env.example .env

# 2. Build and start
docker compose up -d

# 3. Verify health
curl http://localhost:3001/health
```

## Standalone Docker

```bash
docker build -t radar-api .
docker run -d \
  --name radar-api \
  -p 3001:3001 \
  --env-file .env \
  radar-api
```

## Development (Docker)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This mounts your source code for hot-reload and enables debug logging.

## Development (Local)

```bash
npm install
npm run start:dev
```

## Kubernetes (basic example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: radar-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: radar-api
  template:
    metadata:
      labels:
        app: radar-api
    spec:
      containers:
        - name: api
          image: radar-api:latest
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: radar-config
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ping
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: radar-api
spec:
  selector:
    app: radar-api
  ports:
    - port: 80
      targetPort: 3001
  type: LoadBalancer
```

## Environment Variables

See [`.env.example`](../.env.example) for all configurable options.
