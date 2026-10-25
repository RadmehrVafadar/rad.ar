# ──────────────────────────────────────────
# rad.ar API — Makefile
# ──────────────────────────────────────────
.PHONY: install dev build test lint clean docker-build docker-up docker-dev docker-down logs restart rebuild clean-start help

# ── Development ───────────────────────────
install:         ## Install dependencies
	npm install

dev:             ## Start dev server with hot-reload
	npm run start:dev

build:           ## Compile TypeScript
	npm run build

test:            ## Run tests
	npx jest --forceExit

lint:            ## Lint code
	npx eslint "apps/**/*.ts" "packages/**/*.ts"

clean:           ## Remove dist and node_modules
	rm -rf dist node_modules .nx

# ── Docker ────────────────────────────────
docker-build:    ## Build Docker image
	docker build -t radar-api .

docker-up:       ## Start production containers
	docker compose up -d

docker-dev:      ## Start dev containers (hot-reload)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

docker-down:     ## Stop containers
	docker compose down

logs:            ## Tail container logs
	docker compose logs -f radar-api

restart:         ## Restart containers
	docker compose restart

rebuild:         ## Rebuild & restart containers
	docker compose down
	docker compose build --no-cache
	docker compose up -d

clean-start:     ## Full clean rebuild
	rm -rf dist node_modules .nx
	npm install
	npm run build
	npm run start

# ── Help ──────────────────────────────────
help:            ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
