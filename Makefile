.PHONY: backend frontend dev help

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev      - Start both backend and frontend concurrently"
	@echo "  make backend  - Start only the backend server"
	@echo "  make frontend - Start only the frontend development server"

# Start only backend
backend:
	@echo "Starting backend..."
	@cd backend && ./venv/bin/uvicorn main:app --reload --port 8000

# Start only frontend
frontend:
	@echo "Starting frontend..."
	@cd frontend && npm run dev

# Start both concurrently using & and wait
dev:
	@echo "Starting both backend and frontend..."
	@$(MAKE) backend & $(MAKE) frontend & wait
