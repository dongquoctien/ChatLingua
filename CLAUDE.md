# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChatLingua is an English learning platform that integrates with Claude Desktop via MCP. Users tell AI about their day in Vietnamese, and the AI analyzes conversations to extract vocabulary, grammar points, and generate exercises.

## Architecture

```
ChatLingua/
├── packages/
│   ├── mcp-server/     # MCP Server for Claude Desktop (TypeScript)
│   ├── backend/        # REST API (Express.js + TypeScript)
│   ├── frontend/       # Web App (Angular 18 + Material)
│   └── shared/         # Shared types across packages
├── database/
│   └── migrations/     # MySQL schema migrations
└── docker-compose.yml  # MySQL development setup
```

**Data Flow**: The MCP server connects directly to MySQL (not through the backend API). The backend API serves the Angular frontend for web access.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start MySQL database
docker-compose up -d

# Build all packages
npm run build:all

# Run backend + frontend together
npm run dev

# MCP Server
npm run mcp:build          # Build MCP server
npm run mcp:dev            # Watch mode

# Backend API (port 3000)
npm run backend:build      # Build backend
npm run backend:dev        # Development mode with hot reload (tsx watch)

# Frontend (port 4200)
npm run frontend:build     # Production build
npm run frontend:dev       # Development server (ng serve)
```

## Environment Variables

Backend expects these in `.env` or environment:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection
- `JWT_SECRET` - For authentication tokens
- `PORT` - Backend port (default: 3000)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:4200)

MCP server uses same DB variables plus optional auth:
- `MCP_USERNAME`, `MCP_PASSWORD` - Auto-authenticate user for all tool calls

## MCP Tools

The MCP server (`packages/mcp-server/src/tools/`) exposes these tools to Claude Desktop:

| Tool | Purpose |
|------|---------|
| `analyze_conversation` | Analyze Vietnamese text → extract vocabulary, grammar, translation |
| `get_vocabulary_list` | Retrieve user's vocabulary with filters |
| `generate_exercises` | Create exercises from conversations |
| `save_exercise_result` | Record individual exercise attempt |
| `save_exercise_session` | Record batch of exercise results from a session |
| `get_exercise_history` | Get user's exercise attempt history |
| `get_learning_summary` | Get learning statistics and progress |

## Database

MySQL database with tables: `users`, `conversations`, `vocabulary`, `grammar_points`, `exercises`, `exercise_attempts`, `exercise_sessions`, `quizzes`, `quiz_attempts`, `user_statistics`, `daily_activity_log`.

## Claude Desktop Integration

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "chatlingua": {
      "command": "node",
      "args": ["path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_USER": "chatlingua",
        "DB_PASSWORD": "chatlingua_pass",
        "DB_NAME": "chatlingua",
        "MCP_USERNAME": "user@example.com",
        "MCP_PASSWORD": "your_password"
      }
    }
  }
}
```

### MCP Authentication

The MCP server supports optional user authentication:

| Env Variable | Description |
|-------------|-------------|
| `MCP_USERNAME` | User's email (registered in the app) |
| `MCP_PASSWORD` | User's password |

- If both `MCP_USERNAME` and `MCP_PASSWORD` are provided, the server authenticates and uses that user's ID for all operations
- If credentials are invalid or not provided, defaults to `userId = 1`
- Tools can still override userId explicitly if needed

## Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login (returns JWT) |
| `/api/auth/me` | GET | Get current user profile |
| `/api/conversations` | GET | List user's conversations |
| `/api/conversations/:id` | GET | Get conversation with vocabulary & grammar |
| `/api/vocabulary` | GET | List vocabulary with filters |
| `/api/vocabulary/review` | GET | Get vocabulary for review |
| `/api/exercises` | GET | List exercises |
| `/api/exercises/random` | GET | Get random exercises |
| `/api/exercises/:id/submit` | POST | Submit exercise answer |
| `/api/quizzes` | GET/POST | List or create quizzes |
| `/api/quizzes/:id/start` | POST | Start a quiz attempt |
| `/api/quizzes/:id/submit` | POST | Submit quiz answers |
| `/api/stats/overview` | GET | User statistics overview |
| `/api/stats/weekly` | GET | Weekly activity report |
| `/api/stats/monthly` | GET | Monthly activity report |

## Key Patterns

- **Monorepo**: npm workspaces for package management
- **Shared Types**: `@chatlingua/shared` for cross-package type definitions
- **MCP Protocol**: Uses `@modelcontextprotocol/sdk` for Claude Desktop integration
- **Backend Auth**: JWT tokens with bcrypt password hashing
- **Exercise Types**: `multiple_choice`, `fill_blank`, `translation`
