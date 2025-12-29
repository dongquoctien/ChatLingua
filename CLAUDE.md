# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChatLingua is a Vietnamese-to-English language learning platform with gamification features. It uses:
- **Frontend**: Angular 18 with standalone components, TailwindCSS, FontAwesome icons
- **Backend**: Express.js with MySQL database, JWT authentication
- **MCP Server**: Model Context Protocol server for Claude Desktop integration

## Monorepo Structure

This is an npm workspaces monorepo with packages in `packages/`:
- `frontend` - Angular SPA (port 4200)
- `backend` - Express API server (port 3000)
- `mcp-server` - MCP server for Claude Desktop
- `shared` - Shared types/utilities

## Commands

### Development (from root)
```bash
npm run dev                 # Run backend + frontend concurrently
npm run frontend:dev        # Frontend only (ng serve)
npm run backend:dev         # Backend only (tsx watch)
```

### From frontend directory
```bash
npm run dev                 # ng serve
npm run build               # Production build
npm run test                # Karma unit tests
ng generate component <path> # Generate new component
```

### From backend directory
```bash
npm run dev                 # tsx watch src/index.ts
npm run build               # tsc
```

### MCP Server
```bash
npm run mcp:dev             # Watch mode
npm run mcp:build           # Build
npm run inspector -w @chatlingua/mcp-server  # MCP Inspector
```

## Component Structure Rules (CRITICAL)

Every Angular component MUST have separate files - inline templates are FORBIDDEN:

```typescript
// WRONG - Never use inline templates
@Component({
  template: `<div>...</div>`,
  styles: [`...`]
})

// CORRECT - Always use external files
@Component({
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
```

Each component needs three files:
- `component-name.component.ts` - TypeScript logic only
- `component-name.component.html` - Template
- `component-name.component.scss` - Styles

## Architecture

### Frontend (`packages/frontend/src/app/`)

**Routing**: Lazy-loaded standalone components via `app.routes.ts`. All authenticated routes use `LayoutComponent` as parent.

**Core Services** (`core/`):
- `ApiService` - All HTTP calls to backend, includes full type definitions for API responses
- `AuthService` - JWT auth with Angular signals (`currentUser`, `isAuthenticated`)
- `authInterceptor` - Adds Bearer token to requests
- `authGuard`/`guestGuard` - Route protection

**Feature Modules** (`features/`):
- `auth/` - Login, register
- `dashboard/` - Main dashboard
- `conversations/` - Conversation list/detail
- `vocabulary/` - Vocabulary list/detail with dictionary entries
- `exercises/` - Exercise practice, history, 10 exercise type components
- `quizzes/` - Quiz list, player, history
- `review/` - Spaced repetition flashcards (SM2 algorithm)
- `grammar/` - Grammar points, review, exercises
- `gamification/` - XP, achievements, leaderboard, challenges
- `reports/` - Learning analytics
- `mcp-auth/` - OAuth2 device flow for MCP

**Exercise Types** (`features/exercises/exercise-types/`):
Multiple choice, fill blank, translation, sentence building, matching, spelling, listening, error correction, verb conjugation, cloze

### Backend (`packages/backend/`)

Express.js REST API with:
- JWT authentication
- MySQL via mysql2
- Text-to-Speech via msedge-tts
- Zod validation

API base URL: `http://localhost:3000/api`

### API Response Types

All API types are defined in `core/services/api.service.ts`. Key types:
- `PaginatedResponse<T>` - Standard pagination wrapper
- `DictionaryEntry` - Full vocabulary with definitions, word family, collocations
- `QueueItem` - Spaced repetition queue items
- `UserXPStatus`, `UserAchievementInfo`, `DailyChallengeInfo` - Gamification
- `GrammarPointInfo`, `GrammarReviewResult` - Grammar system

### Environment

- Development API: `http://localhost:3000/api` (defined in `src/environments/environment.ts`)
- Production: uses `environment.prod.ts` file replacement