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
│   ├── frontend/       # Web App (Angular + Material)
│   └── shared/         # Shared types across packages
├── database/
│   └── migrations/     # MySQL schema migrations
└── docker-compose.yml  # MySQL development setup
```

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start MySQL database
docker-compose up -d

# Build all packages
npm run build:all

# MCP Server
npm run mcp:build          # Build MCP server
npm run mcp:dev            # Watch mode

# Backend API
npm run backend:build      # Build backend
npm run backend:dev        # Development mode

# Frontend
npm run frontend:build     # Production build
npm run frontend:dev       # Development server
```

## MCP Tools

The MCP server exposes these tools to Claude Desktop:

| Tool | Purpose |
|------|---------|
| `analyze_conversation` | Analyze Vietnamese text → extract vocabulary, grammar, translation |
| `get_vocabulary_list` | Retrieve user's vocabulary with filters |
| `generate_exercises` | Create exercises from conversations |
| `save_exercise_result` | Record exercise attempt results |
| `get_learning_summary` | Get learning statistics and progress |

## Database

MySQL database with tables: `users`, `conversations`, `vocabulary`, `grammar_points`, `exercises`, `exercise_attempts`, `quizzes`, `quiz_attempts`, `user_statistics`, `daily_activity_log`.

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
        "DB_NAME": "chatlingua"
      }
    }
  }
}
```

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
