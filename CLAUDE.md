# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

nxsGPT is a full-stack AI chat platform that provides a unified interface for multiple AI providers (OpenAI, Anthropic, Google, etc.). The project is organized as a monorepo with separate API backend and React frontend.

## Key Commands

### Development
- `npm run backend:dev` - Start API server in development mode
- `npm run frontend:dev` - Start client development server
- `npm run build:data-provider && npm run build:data-schemas && npm run build:api` - Build shared packages before frontend

### Testing
- `npm run test:api` - Run backend tests
- `npm run test:client` - Run frontend tests  
- `npm run e2e` - Run end-to-end tests (requires local config)
- `npm run e2e:headed` - Run E2E tests with browser UI

### Linting & Formatting
- `npm run lint` - Lint all TypeScript/JavaScript files
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier

### Docker & Deployment
- `npm run start:deployed` - Start with Docker Compose
- `npm run stop:deployed` - Stop Docker containers
- `npm run update:deployed` - Update deployed instance

### User Management (Production)
- `npm run create-user` - Create new user account
- `npm run list-users` - List all users
- `npm run ban-user` - Ban a user account
- `npm run add-balance` - Add credits to user account

## Architecture

### Monorepo Structure
```
/api/                    # Node.js/Express backend
/client/                 # React/Vite frontend  
/packages/
  /data-provider/        # Shared data fetching logic
  /data-schemas/         # Zod schemas and MongoDB models
  /api/                  # Shared API utilities (MCP, flows, etc.)
```

### Backend (`/api/`)
- **Entry Point**: `api/server/index.js` - Express app with middleware setup
- **Client Architecture**: `api/app/clients/` - AI provider integrations (OpenAI, Anthropic, Google, etc.)
- **Routes**: `api/server/routes/` - API endpoints organized by feature
- **Services**: `api/server/services/` - Business logic layer
- **Models**: `api/models/` - MongoDB/Mongoose schemas
- **Authentication**: Multiple strategies via Passport.js (JWT, OAuth, LDAP)

### Frontend (`/client/`)
- **React 18** with TypeScript and Vite build system
- **State Management**: Recoil for global state, React Query for server state
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Routing**: React Router v6
- **Key Contexts**: Multiple React contexts for chat, agents, assistants, etc.

### Shared Packages
- **data-provider**: API calls, data fetching, shared types
- **data-schemas**: Zod validation schemas, database models  
- **api**: MCP (Model Context Protocol), agents, flows, utilities

### Key Architectural Patterns

1. **Client Architecture**: Each AI provider has its own client class extending `BaseClient`
2. **Middleware Pipeline**: Express middleware for auth, rate limiting, validation
3. **Real-time Communication**: Server-sent events for streaming responses
4. **File Handling**: Multer for uploads, Sharp for image processing
5. **Caching**: Redis/Keyv for session storage and rate limiting
6. **Search**: MeiliSearch integration for conversation/message search

### Configuration Files
- `librechat.yaml` - Main configuration (endpoints, interface, registration)
- `docker-compose.yml` - Multi-service container setup
- `.env` - Environment variables (not committed)

### Database Schema
- **MongoDB**: Primary database with Mongoose ODM
- **Redis**: Session storage and caching
- **PostgreSQL + pgvector**: Vector database for RAG functionality

## Development Workflow

1. **Package Management**: Uses npm workspaces - install dependencies at root level
2. **Module Resolution**: Backend uses `~` alias for root-relative imports
3. **Build Order**: Must build shared packages before frontend: `data-provider` → `data-schemas` → `api` → `client`
4. **Hot Reload**: Backend uses nodemon, frontend uses Vite HMR
5. **Environment Setup**: Copy environment variables, configure AI provider keys

## Testing Strategy

- **Backend**: Jest with MongoDB Memory Server for integration tests
- **Frontend**: Jest + React Testing Library for unit tests
- **E2E**: Playwright for full application testing
- **Mocking**: Extensive mocks for AI providers and external services

## Key Integration Points

- **AI Providers**: Unified client architecture supports OpenAI, Anthropic, Google, Ollama, etc.
- **Authentication**: Supports OAuth2 (Google, GitHub, Discord), LDAP, local auth
- **File Storage**: Local filesystem or cloud storage (AWS S3, Azure Blob)
- **Vector Search**: RAG API integration for document embedding and retrieval
- **Model Context Protocol (MCP)**: Support for tool integration via MCP servers

## Development Notes

- Backend runs on port 3080 by default
- Frontend development server proxies API requests to backend
- Docker setup includes MongoDB, MeiliSearch, PostgreSQL, and RAG API services
- Extensive environment variable configuration for different deployment scenarios
- Built-in user management, role-based access control, and token spend tracking