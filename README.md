# ChatLingua

English learning platform powered by AI conversation analysis. Integrates with Claude Desktop via MCP.

## Features

- **Conversation Analysis**: Tell AI about your day in Vietnamese, get English vocabulary and grammar lessons
- **Smart Exercises**: Multiple choice, fill-in-blank, and translation exercises generated from your conversations
- **Quiz System**: Timed quizzes with scoring, multiple attempts, and progress tracking
- **Statistics & Reports**: Track your learning streak, vocabulary mastery, and quiz performance

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

# Build MCP server
npm run mcp:build
```

### Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chatlingua": {
      "command": "node",
      "args": ["D:/Github/ChatLingua/packages/mcp-server/dist/index.js"],
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

Restart Claude Desktop to activate.

## Usage

In Claude Desktop, you can now:

1. **Tell your story**: "Hôm nay tôi đi làm muộn vì tắc đường"
2. **Claude will analyze**: Extract vocabulary, grammar, provide translation
3. **Practice exercises**: Claude generates exercises for you to practice
4. **Track progress**: Use `get_learning_summary` to see your stats

## Project Structure

```
├── packages/
│   ├── mcp-server/     # MCP Server for Claude Desktop
│   ├── backend/        # REST API (Express.js)
│   ├── frontend/       # Web App (Angular)
│   └── shared/         # Shared TypeScript types
├── database/
│   └── migrations/     # MySQL schema
└── docker-compose.yml  # Development database
```

## Tech Stack

- **MCP Server**: TypeScript, @modelcontextprotocol/sdk
- **Backend**: Node.js, Express, MySQL
- **Frontend**: Angular 18+, Angular Material
- **Database**: MySQL 8.0

## License

MIT
