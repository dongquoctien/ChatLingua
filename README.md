# ChatLingua

English learning platform powered by AI conversation analysis. Integrates with Claude Desktop via MCP (Model Context Protocol).

## Features

- **Conversation Analysis**: Tell AI about your day in Vietnamese, get English vocabulary and grammar lessons
- **Smart Exercises**: Multiple choice, fill-in-blank, and translation exercises generated from your conversations
- **Spaced Repetition**: SM2-based vocabulary review system with daily queues and streak tracking
- **Quiz System**: Timed quizzes with scoring, multiple attempts, and progress tracking
- **Statistics & Reports**: Track your learning streak, vocabulary mastery, and quiz performance
- **Web Dashboard**: Angular-based web app for reviewing vocabulary, taking quizzes, and tracking progress

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for MySQL)
- Claude Desktop (for MCP integration)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ChatLingua.git
cd ChatLingua

# Install dependencies
npm install

# Start MySQL database
docker-compose up -d

# Build all packages
npm run build:all

# Or build individually:
npm run mcp:build      # MCP server only
npm run backend:build  # Backend API only
npm run frontend:build # Frontend only
```

### Run Web Application

```bash
# Start backend + frontend together
npm run dev

# Or separately:
npm run backend:dev   # API at http://localhost:3000
npm run frontend:dev  # Web app at http://localhost:4200
```

### Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chatlingua": {
      "command": "node",
      "args": ["path/to/ChatLingua/packages/mcp-server/dist/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_USER": "chatlingua",
        "DB_PASSWORD": "chatlingua_pass",
        "DB_NAME": "chatlingua",
        "MCP_USERNAME": "your@email.com",
        "MCP_PASSWORD": "your_password"
      }
    }
  }
}
```

Restart Claude Desktop to activate.

## MCP Tools

### Learning Flow

| Tool | Purpose |
|------|---------|
| `analyze_conversation` | Extract vocabulary and grammar from Vietnamese conversation |
| `enrich_vocabulary` | Add dictionary data (definitions, examples, pronunciation) |
| `generate_exercises` | Create practice exercises from conversation |

### Vocabulary & Exercises

| Tool | Purpose |
|------|---------|
| `get_vocabulary_list` | Retrieve vocabulary with filters (status, difficulty, etc.) |
| `save_exercise_result` | Record individual exercise attempt |
| `save_exercise_session` | Record batch of exercise results |
| `get_exercise_history` | Get exercise attempt history |
| `get_learning_summary` | Get learning statistics and progress |

### Spaced Repetition (SM2)

| Tool | Purpose |
|------|---------|
| `get_review_queue` | Get today's vocabulary review queue (overdue, due, new items) |
| `submit_review` | Submit review with quality rating (0-5), calculates next interval |

## Usage Examples

### In Claude Desktop

**1. Learn from conversation:**
```
You: Hôm nay tôi đi làm muộn vì tắc đường
Claude: [Analyzes and extracts vocabulary: "go to work", "late", "traffic jam"]
```

**2. Practice vocabulary:**
```
You: Give me some exercises
Claude: [Generates exercises based on your vocabulary]
```

**3. Review flashcards:**
```
You: Let's review my vocabulary
Claude: [Shows flashcards, you rate each one, SM2 schedules next review]
```

### In Web App

1. **Dashboard**: View learning progress and statistics
2. **Vocabulary**: Browse, search, and filter your vocabulary
3. **Review**: Flashcard-style spaced repetition review
4. **Quizzes**: Take timed quizzes on your vocabulary
5. **Exercises**: Practice with generated exercises

## Project Structure

```
ChatLingua/
├── packages/
│   ├── mcp-server/     # MCP Server for Claude Desktop
│   ├── backend/        # REST API (Express.js + TypeScript)
│   ├── frontend/       # Web App (Angular 18 + Material)
│   └── shared/         # Shared TypeScript types
├── database/
│   └── migrations/     # MySQL schema migrations
└── docker-compose.yml  # Development database
```

## Tech Stack

- **MCP Server**: TypeScript, @modelcontextprotocol/sdk, mysql2
- **Backend**: Node.js, Express, TypeScript, JWT authentication
- **Frontend**: Angular 18, Angular Material, FontAwesome
- **Database**: MySQL 8.0

## Spaced Repetition System

Uses the SM2 algorithm for optimal vocabulary retention:

- **Quality Ratings**: 0 (blackout) to 5 (perfect recall)
- **Review Status**: `new` → `learning` → `reviewing` → `mastered`
- **Intervals**: Automatically calculated based on performance
- **Daily Queue**: Prioritizes overdue > due today > new words
- **Streak Tracking**: Motivates consistent daily practice

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_USER=chatlingua
DB_PASSWORD=chatlingua_pass
DB_NAME=chatlingua

# Backend
PORT=3000
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:4200

# MCP Authentication (optional)
MCP_USERNAME=user@example.com
MCP_PASSWORD=password
```

## License

MIT
