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
npm run frontend:test      # Run tests (ng test) - in packages/frontend

# Docker
docker-compose up -d       # Start MySQL (container: mysql-local)
docker-compose down        # Stop MySQL
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

### Spaced Repetition Tools (Vocabulary)

| Tool | Purpose |
|------|---------|
| `get_review_queue` | Get today's vocabulary review queue (overdue, due, new items) |
| `submit_review` | Submit vocabulary review with quality rating (0-5), triggers SM2 calculation |

### Grammar Tools

| Tool | Purpose |
|------|---------|
| `get_grammar_list` | Retrieve user's grammar points with filters |
| `get_grammar_review_queue` | Get today's grammar review queue (SM2-based) |
| `generate_grammar_exercises` | Create grammar exercises (error correction, verb conjugation, etc.) |
| `submit_grammar_review` | Submit grammar review with quality rating |

### Recommended Usage Flow

1. **analyze_conversation**: Extract basic vocabulary (quick)
   - Returns `vocabularyIds[]` for next step
2. **enrich_vocabulary**: Add dictionary data in batches of 3-5 words
   - Retry once on failure, then skip
3. **generate_exercises**: Create exercises from conversation
   - Can run in parallel with Step 2

## Database

MySQL database with core tables: `users`, `conversations`, `vocabulary`, `grammar_points`, `exercises`, `exercise_attempts`, `exercise_sessions`, `quizzes`, `quiz_attempts`, `user_statistics`, `daily_activity_log`, `vocabulary_reviews`, `daily_review_queue`, `user_learning_goals`.

Additional tables for gamification: `achievements`, `user_achievements`, `user_xp`, `xp_transactions`, `challenge_templates`, `daily_challenges`, `weekly_leaderboard`, `notifications`, `user_difficulty_profile`.

Grammar spaced repetition tables: `grammar_reviews`, `grammar_daily_queue`, `grammar_exercises`, `grammar_exercise_attempts`, `grammar_learning_goals`.

### Spaced Repetition (SM2 Algorithm)

The vocabulary table includes SM2 fields for spaced repetition:
- `review_status`: `new` → `learning` → `reviewing` → `mastered`
- `ease_factor`: 1.3-5.0 (default 2.5)
- `review_interval`: days until next review
- `next_review_at`: scheduled review date

Review quality ratings: 0=blackout, 1=again, 2=hard, 3=good, 4=good+, 5=easy

### Gamification System

XP rewards are defined in `@chatlingua/shared/types/gamification.ts`:
- Exercise correct: 5 XP, incorrect: 1 XP
- Review good: 3 XP, easy: 4 XP
- Quiz base: 10 XP, perfect bonus: 25 XP
- Daily streak: 10 XP

Grammar points also use SM2 with identical `review_status`, `ease_factor`, `review_interval`, and `next_review_at` fields

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

### MCP Authentication Troubleshooting

If MCP still uses `userId = 1` after setting credentials:

1. **Verify email exists in database**:
   ```sql
   SELECT id, email FROM users WHERE email = 'your_email@example.com';
   ```

2. **Verify password matches** (run in project root):
   ```bash
   node -e "const bcrypt = require('bcryptjs'); const mysql = require('mysql2/promise'); (async () => { const conn = await mysql.createConnection({host:'localhost',user:'chatlingua',password:'chatlingua_pass',database:'chatlingua'}); const [rows] = await conn.execute('SELECT password_hash FROM users WHERE email = ?', ['your_email']); const match = await bcrypt.compare('your_password', rows[0].password_hash); console.log('Match:', match); await conn.end(); })();"
   ```

3. **Reset password if needed**:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); const mysql = require('mysql2/promise'); (async () => { const hash = await bcrypt.hash('new_password', 10); const conn = await mysql.createConnection({host:'localhost',user:'chatlingua',password:'chatlingua_pass',database:'chatlingua'}); await conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'your_email']); console.log('Password updated'); await conn.end(); })();"
   ```

4. **Restart Claude Desktop** after config changes

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

### Gamification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gamification/xp` | GET | User's XP and level info |
| `/api/gamification/xp/history` | GET | XP transaction history |
| `/api/gamification/levels` | GET | Level definitions |
| `/api/gamification/achievements` | GET | All achievements with progress |
| `/api/gamification/challenges` | GET | Today's daily challenges |
| `/api/gamification/leaderboard` | GET | Weekly leaderboard |
| `/api/gamification/notifications` | GET | User notifications |
| `/api/gamification/summary` | GET | Complete gamification dashboard data |

### Grammar Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/grammar` | GET | List grammar points with filters |
| `/api/grammar/categories` | GET | Grammar categories with counts |
| `/api/grammar/:id` | GET | Specific grammar point |
| `/api/grammar/stats/overview` | GET | Grammar statistics |
| `/api/grammar/review/queue` | GET | Today's grammar review queue |
| `/api/grammar/review/submit` | POST | Submit grammar flashcard review |
| `/api/grammar/exercises` | GET | Grammar exercises |
| `/api/grammar/exercises/random` | GET | Random grammar exercises |
| `/api/grammar/exercises/:id/submit` | POST | Submit grammar exercise answer |
| `/api/grammar/goals` | GET/PUT | Grammar learning goals |

## Key Patterns

- **Monorepo**: npm workspaces for package management
- **Shared Types**: `@chatlingua/shared` for cross-package type definitions
- **MCP Protocol**: Uses `@modelcontextprotocol/sdk` for Claude Desktop integration
- **Backend Auth**: JWT tokens with bcrypt password hashing
- **Exercise Types**: `multiple_choice`, `fill_blank`, `translation`, `sentence_building`, `matching`, `spelling`, `listening`, `error_correction`, `verb_conjugation`, `cloze`
- **Grammar Exercise Types**: `error_correction`, `verb_conjugation`, `tense_selection`, `article_usage`, `preposition_fill`, `sentence_transformation`, `word_order`
- **MySQL Note**: COUNT/SUM/AVG functions may return strings - always use `Number()` to convert
