.PHONY: help dev build start lint type-check test-tinyfish deploy clean

# Default target
help:
	@echo "Hardware Sentry - Available Commands:"
	@echo ""
	@echo "  make dev            - Start Next.js development server"
	@echo "  make build          - Build for production"
	@echo "  make start          - Start production server"
	@echo "  make lint           - Run ESLint"
	@echo "  make type-check     - Validate TypeScript"
	@echo "  make test-tinyfish  - Test TinyFish API connection"
	@echo "  make deploy         - Deploy to Vercel"
	@echo "  make clean          - Remove build artifacts"
	@echo ""

# Development
dev:
	npm run dev

# Build
build:
	npm run build

# Start production server
start:
	npm run start

# Linting
lint:
	npm run lint

# Type checking
type-check:
	npm run type-check

# Test TinyFish API
test-tinyfish:
	@if [ -f .env.local ]; then \
		export $$(cat .env.local | grep -v '^#' | xargs) && python3 execution/test_tinyfish.py; \
	else \
		echo "Error: .env.local not found. Copy .env.example and add your API keys."; \
		exit 1; \
	fi

# Deploy to Vercel
deploy:
	@command -v vercel >/dev/null 2>&1 || { echo "Error: vercel CLI not installed. Run: npm i -g vercel"; exit 1; }
	vercel --prod

# Clean build artifacts
clean:
	rm -rf .next
	rm -rf node_modules
	rm -rf out
	@echo "Cleaned build artifacts"
