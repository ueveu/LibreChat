# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

nxsGPT is a full-stack AI chat platform that provides a unified interface for multiple AI providers (OpenAI, Anthropic, Google, etc.). Built as a LibreChat fork, the project is organized as a monorepo with separate API backend and React frontend, supporting advanced features like agents, assistants, code artifacts, and MCP server integration.

## Key Commands

### Development
- `npm run backend:dev` - Start API server in development mode (port 3080)
- `npm run frontend:dev` - Start client development server (Vite HMR)
- `npm run build:data-provider && npm run build:data-schemas && npm run build:api` - Build shared packages before frontend (required order)
- `npm run frontend` - Full frontend build (includes all packages + client)
- Single test files: `cd api && npm test -- --testNamePattern="specific test"` or `cd client && npm test -- specific.test.js`

### Testing
- `npm run test:api` - Run backend tests (Jest + MongoDB Memory Server)
- `npm run test:client` - Run frontend tests (Jest + React Testing Library)
- `npm run e2e` - Run end-to-end tests (Playwright, requires local config)
- `npm run e2e:headed` - Run E2E tests with browser UI
- `npm run e2e:debug` - Debug E2E tests with PWDEBUG
- `npm run e2e:codegen` - Generate E2E test code with Playwright
- `npm run e2e:a11y` - Run accessibility tests with axe-core

### Linting & Formatting
- `npm run lint` - Lint all TypeScript/JavaScript files
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier

### Docker & Deployment
- `npm run start:deployed` - Start with Docker Compose (deploy-compose.yml)
- `npm run stop:deployed` - Stop Docker containers
- `npm run update:deployed` - Update deployed instance
- `npm run rebase:deployed` - Update deployed instance with rebase

### User Management (Production)
- `npm run create-user` - Create new user account
- `npm run list-users` - List all users
- `npm run ban-user` - Ban a user account
- `npm run delete-user` - Delete a user account
- `npm run add-balance` - Add credits to user account
- `npm run set-balance` - Set user balance
- `npm run list-balances` - List user balances
- `npm run user-stats` - View user statistics

### Email MCP Server (Python)
- `cd imap-mcp && pip install -e .` - Install email MCP server in development mode
- `cd imap-mcp && python -m pytest` - Run email MCP server tests
- `cd imap-mcp && python -m imap_mcp.server` - Start email MCP server
- Configuration: `imap-mcp/config.sample.yaml` (copy to `config.yaml` and configure)

### N8N Integration (Workflow Automation)
- `./start-with-n8n.sh` - Start LibreChat with full N8N stack
- `./fix-n8n-url.sh` - Fix N8N URL configuration for external access
- **Access**: N8N button in LibreChat UI opens workflow automation interface
- **Services**: Includes N8N, PostgreSQL, Ollama, Qdrant vector DB

## Architecture

### Monorepo Structure
```
/api/                    # Node.js/Express backend (@nxsgpt/backend)
/client/                 # React/Vite frontend (@nxsgpt/frontend)
/packages/
  /data-provider/        # Shared data fetching logic (librechat-data-provider)
  /data-schemas/         # Zod schemas and MongoDB models (@librechat/data-schemas)
  /api/                  # Shared API utilities (MCP, flows, etc.) (@librechat/api)
/imap-mcp/              # Python email MCP server with IMAP/SMTP support
/config/                # Administrative scripts and configuration utilities
/e2e/                   # End-to-end tests (Playwright)
/shared/                # Shared resources across services
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
2. **Module Resolution**: Backend uses `~` alias for root-relative imports (`~/*`)
3. **Build Order**: Must build shared packages before frontend: `data-provider` → `data-schemas` → `api` → `client`
4. **Hot Reload**: Backend uses nodemon, frontend uses Vite HMR
5. **Environment Setup**: Copy `.env.example` to `.env`, configure AI provider keys
6. **Database**: MongoDB (primary), Redis (sessions), PostgreSQL+pgvector (RAG)
7. **Ports**: Backend (3080), Frontend dev server (3090), MeiliSearch (7700)

### Development Notes
- Backend runs middleware pipeline through `api/server/index.js` entry point
- Client architecture: Each AI provider extends `BaseClient` class in `api/app/clients/`
- Frontend uses Recoil for global state, React Query for server state
- File uploads handled via Multer middleware with Sharp for image processing
- Real-time communication via Server-Sent Events for streaming responses

### Critical Build Dependencies
**Package build order is strictly enforced**:
1. `data-provider` (shared types and API calls)
2. `data-schemas` (Zod schemas and MongoDB models)  
3. `api` (MCP utilities and shared backend code)
4. `client` (React frontend)

Breaking this order will cause TypeScript compilation errors.

### Essential Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT token secret
- AI Provider Keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, etc.
- `MEILI_HOST`, `MEILI_HTTP_ADDR` - MeiliSearch configuration
- `RAG_API_URL` - RAG API endpoint for vector search

## Testing Strategy

- **Backend**: Jest with MongoDB Memory Server for integration tests
- **Frontend**: Jest + React Testing Library for unit tests
- **E2E**: Playwright for full application testing across browsers (Chromium, Firefox, Safari)
- **Accessibility**: Automated a11y testing with @axe-core/playwright for WCAG compliance
- **Mocking**: Extensive mocks for AI providers and external services

## Key Integration Points

- **AI Providers**: Unified client architecture supports OpenAI, Anthropic, Google, Ollama, etc.
- **Authentication**: Supports OAuth2 (Google, GitHub, Discord), LDAP, local auth
- **File Storage**: Local filesystem or cloud storage (AWS S3, Azure Blob)
- **Vector Search**: RAG API integration for document embedding and retrieval
- **Model Context Protocol (MCP)**: Support for tool integration via MCP servers

## MCP (Model Context Protocol) Integration

- **Python MCP Server**: `imap-mcp/` directory contains IMAP/SMTP email integration
- **Package Integration**: `packages/api/src/mcp/` handles MCP connection management
- **Connection Management**: MCP connections configured via `librechat.yaml`
- **Tool Integration**: MCP servers provide tools for agents and assistants

### Alternative Runtime Support (Bun)

The project supports Bun as an alternative to Node.js:

- `npm run b:api:dev` - Backend development with Bun
- `npm run b:client:dev` - Frontend development with Bun
- `npm run b:test:api` - Backend tests with Bun  
- `npm run b:test:client` - Frontend tests with Bun
- `npm run b:build` - Production build with Bun

### Docker Services

When running `npm run start:deployed`, the following services are started:

- **nxsGPT API**: Main application server
- **MongoDB**: Primary database
- **MeiliSearch**: Search and indexing
- **PostgreSQL + pgvector**: Vector database for RAG
- **RAG API**: Document embedding and retrieval service

### Important File Locations

- `librechat.yaml` - Main application configuration
- `.env` - Environment variables (not committed to repo)
- `deploy-compose.yml` - Production Docker Compose configuration
- `docker-compose.yml` - Development Docker Compose configuration
- `api/jsconfig.json` - Backend path aliases (`~/*` for root imports)
- `packages/*/package.json` - Individual package configurations for monorepo
