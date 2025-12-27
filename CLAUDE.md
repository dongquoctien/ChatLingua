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

### Learning Flow (3 Steps)

```
User Input → analyze_conversation → enrich_vocabulary → generate_exercises
                   (Step 1)            (Step 2)            (Step 3)
                   ~5-10s              ~10-15s/batch        ~5-10s
```

| Tool | Step | Purpose |
|------|------|---------|
| `analyze_conversation` | 1 | Quick save: conversation + basic vocabulary |
| `enrich_vocabulary` | 2 | Add dictionary data (definitions, examples, etc.) |
| `generate_exercises` | 3 | Create practice exercises (can run parallel with Step 2) |

### Other Tools

| Tool | Purpose |
|------|---------|
| `get_vocabulary_list` | Retrieve user's vocabulary with filters |
| `save_exercise_result` | Record individual exercise attempt |
| `save_exercise_session` | Record batch of exercise results from a session |
| `get_exercise_history` | Get user's exercise attempt history |
| `get_learning_summary` | Get learning statistics and progress |

### Spaced Repetition Tools

| Tool | Purpose |
|------|---------|
| `get_review_queue` | Get today's vocabulary review queue (overdue, due, new items) |
| `submit_review` | Submit vocabulary review with quality rating (0-5), triggers SM2 calculation |

### Recommended Usage Flow

1. **analyze_conversation**: Extract basic vocabulary (quick)
   - Returns `vocabularyIds[]` for next step
2. **enrich_vocabulary**: Add dictionary data in batches of 3-5 words
   - Retry once on failure, then skip
3. **generate_exercises**: Create exercises from conversation
   - Can run in parallel with Step 2

## Database

MySQL database with tables: `users`, `conversations`, `vocabulary`, `grammar_points`, `exercises`, `exercise_attempts`, `exercise_sessions`, `quizzes`, `quiz_attempts`, `user_statistics`, `daily_activity_log`, `vocabulary_reviews`, `daily_review_queue`, `user_learning_goals`.

### Spaced Repetition (SM2 Algorithm)

The vocabulary table includes SM2 fields for spaced repetition:
- `review_status`: `new` → `learning` → `reviewing` → `mastered`
- `ease_factor`: 1.3-5.0 (default 2.5)
- `review_interval`: days until next review
- `next_review_at`: scheduled review date

Review quality ratings: 0=blackout, 1=again, 2=hard, 3=good, 4=good+, 5=easy

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

### Multi-User Setup

To use a different account instead of the default `userId = 1`:

1. **Register account**: `POST /api/auth/register` with `{username, email, password}`
2. **Update config**: Set `MCP_USERNAME` and `MCP_PASSWORD` in `claude_desktop_config.json`
3. **Restart Claude Desktop**

Config file locations:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

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
| `/api/review/queue` | GET | Today's review queue (SM2) |
| `/api/review/submit` | POST | Submit flashcard review (rating: again/hard/good/easy) |
| `/api/review/stats` | GET | Review statistics (mastery breakdown) |
| `/api/review/streak` | GET | User's review streak |
| `/api/review/goals` | GET/PUT | Learning goals settings |

## Key Patterns

- **Monorepo**: npm workspaces for package management
- **Shared Types**: `@chatlingua/shared` for cross-package type definitions
- **MCP Protocol**: Uses `@modelcontextprotocol/sdk` for Claude Desktop integration
- **Backend Auth**: JWT tokens with bcrypt password hashing
- **Exercise Types**: `multiple_choice`, `fill_blank`, `translation`
- **MySQL Note**: COUNT/SUM/AVG functions may return strings - always use `Number()` to convert
