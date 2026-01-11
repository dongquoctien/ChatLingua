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
- `games/` - 15 vocabulary games (word rush, memory match, hangman, spelling bee, falling words, crossword, word search, anagram, word duel, pop quiz blitz, translation race, vocabulary quest, word cards, language island)
- `shop/` - Virtual shop with coins/gems currency, items, inventory, wishlist, gifts
- `pets/` - Virtual pet system with care mechanics and daily tasks
- `chat/` - Real-time messaging with Socket.io
- `sync-requests/` - Collaborative learning requests
- `reports/` - Learning analytics
- `mcp-auth/` - OAuth2 device flow for MCP

**Exercise Types** (`features/exercises/exercise-types/`):
Multiple choice, fill blank, translation, sentence building, matching, spelling, listening, error correction, verb conjugation, cloze

**Games Shared Components** (`features/games/shared/`):
Common game UI components: `game-header`, `game-over-dialog`, `countdown`, `power-ups-panel`, `active-boosters-widget`, `audio-control`

### Backend (`packages/backend/`)

Express.js REST API with:
- JWT authentication
- MySQL via mysql2
- Text-to-Speech via msedge-tts
- Zod validation
- Socket.io for real-time features (chat, status, typing indicators, pet updates)
- Scheduled jobs via node-cron (pet scheduler)

API base URL: `http://localhost:3000/api`

**Socket.io Architecture** (`socket/`):
- `index.ts` - Server initialization, JWT auth middleware, connection handling
- `handlers/` - Event handlers for chat, status, typing, pets
- Uses typed events via `ClientToServerEvents`/`ServerToClientEvents` in `types/chat.types.ts`
- Helper functions: `emitToUser()`, `broadcastExcept()`, `getActiveConnectionCount()`

### API Response Types

All API types are defined in `core/services/api.service.ts`. Key types:
- `PaginatedResponse<T>` - Standard pagination wrapper
- `DictionaryEntry` - Full vocabulary with definitions, word family, collocations
- `QueueItem` - Spaced repetition queue items
- `UserXPStatus`, `UserAchievementInfo`, `DailyChallengeInfo` - Gamification
- `GrammarPointInfo`, `GrammarReviewResult` - Grammar system

**Feature-Specific Services** (`features/*/`):
- `features/shop/shop.service.ts` - Shop items, purchases, inventory, wishlist, gifts
- `features/pets/services/pet.service.ts` - Pet care, feeding, training, daily tasks

### V3 Architecture (Word Map System)

The V3 architecture separates content from user progress, enabling curriculum-based learning:

**Database Schema (V3 Tables)**:
- `master_vocabulary` - Canonical vocabulary definitions (not user-specific)
- `master_grammar` - Canonical grammar rules
- `master_exercises` - Reusable exercise templates
- `user_vocabulary` - User's learning progress for vocabulary (links to master)
- `user_grammar` - User's learning progress for grammar
- `word_maps` - Curriculum courses with CEFR levels
- `word_map_units` - Units within a Word Map
- `unit_lessons` - Lessons within a unit
- `lesson_content` - Links lessons to master content
- `exam_attempts` - User exam history

**V3 Services** (`services/v3/`):
- `master-vocabulary.service.ts` - CRUD for master vocabulary
- `master-grammar.service.ts` - CRUD for master grammar
- `master-exercises.service.ts` - CRUD for master exercises
- `user-vocabulary.service.ts` - User vocabulary with SM2 spaced repetition
- `user-grammar.service.ts` - User grammar with SM2 spaced repetition
- `word-map.service.ts` - Word Map curriculum management
- `user-progress.service.ts` - XP, streaks, overall progress
- `exam.service.ts` - Exam attempts and scoring

**Feature Flags** (`config/features.ts`):
Controls gradual V3 migration:
- `USE_V3_TABLES` - Read from V3 tables
- `DUAL_WRITE_ENABLED` - Write to both V2 and V3
- `DEPRECATE_V2_TABLES` - Stop writing to V2
- `WORD_MAP_ENABLED` - Enable Word Map features

**Frontend** (`features/word-maps/`):
- `word-map-list/` - Browse available Word Maps
- `word-map-detail/` - View units and progress
- `lesson-study/` - Study lesson content
- `lesson-exam/` - Take lesson exams
- `review/` - Spaced repetition review queue

### Database

MySQL 8.0 via Docker. Migrations in `database/migrations/` run automatically on container init.

```bash
docker-compose up -d          # Start MySQL container
docker-compose down -v        # Reset database (deletes all data)
```

Connection: `localhost:3306`, user: `chatlingua`, password: `chatlingua_pass`, database: `chatlingua`

### Environment

- Development API: `http://localhost:3000/api` (defined in `src/environments/environment.ts`)
- Production: uses `environment.prod.ts` file replacement

## Common Patterns

### Pagination Pattern

List components (vocabulary-list, grammar-list) use Angular signals for client-side pagination:

```typescript
// State signals
page = signal(1);
pageSize = signal(10);

// Computed paginated list
paginatedItems = computed(() => {
  const filtered = this.filteredItems();
  const start = (this.page() - 1) * this.pageSize();
  return filtered.slice(start, start + this.pageSize());
});

// Helpers as getters
get totalPages(): number {
  return Math.ceil(this.filteredItems().length / this.pageSize()) || 1;
}
```

### Styling

- Use TailwindCSS utility classes for all styling
- **Black/White Template**: Grayscale color palette only
  - Backgrounds: `gray-50`, `gray-100`, `white`
  - Text: `gray-900` (primary), `gray-700` (secondary), `gray-500` (muted)
  - Borders: `gray-200`, `gray-300`
  - Buttons: `bg-gray-900 text-white` (primary), `bg-gray-100 text-gray-700` (secondary)
  - Hover states: `hover:bg-gray-800` (primary), `hover:bg-gray-200` (secondary)
- Accent colors (use sparingly):
  - Success: `green-500`, `green-50` (background)
  - Error: `red-500`, `red-50` (background)
  - Warning: `orange-500`, `orange-50` (background)
- Consistent spacing: `p-4`/`p-6` for containers, `gap-4` for flex/grid

### FontAwesome Icons

The project uses FontAwesome icons in two ways:

**1. CSS Classes (Recommended for most cases)**
```html
<i class="fa-solid fa-spinner fa-spin"></i>
<i class="fa-solid fa-check-circle text-green-500"></i>
```
This works because `@fortawesome/fontawesome-free` CSS is loaded in `angular.json`.

**2. Angular FontAwesome Component**
```typescript
// In component .ts file
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faShoppingBag } from '../../../shared/icons';

@Component({
  imports: [FontAwesomeModule],
})
export class MyComponent {
  faShoppingBag = faShoppingBag;
}
```
```html
<!-- In template -->
<fa-icon [icon]="faShoppingBag"></fa-icon>
```
Icons must be registered in `shared/icons.ts` first.

**3. Emoji Symbols (For buttons and UI elements)**
For consistency in header buttons, use emoji symbols:
```html
<!-- Currency displays -->
<span class="text-lg">🪙</span>  <!-- Coins -->
<span class="text-lg">💎</span>  <!-- Gems -->

<!-- Navigation buttons -->
<span class="text-lg">🛒</span>  <!-- Shop -->
<span class="text-lg">📦</span>  <!-- Inventory -->

<!-- Wishlist hearts -->
{{ inWishlist() ? '🖤' : '🤍' }}  <!-- Filled/Empty heart -->
```

**Button Style Convention:**
```html
<!-- Standard header button with emoji -->
<a routerLink="/shop" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all">
  <span class="text-lg">🛒</span>
  <span class="font-semibold text-gray-700">Shop</span>
</a>
```

### Language

- **All UI text in layout, menus, navigation, page titles, buttons should be in English**
- Vietnamese is only used for:
  - User-generated content (conversations, vocabulary examples)
  - Learning content translations
  - Explanatory text for Vietnamese learners where contextually appropriate

## Testing

### Backend Tests (`packages/backend/tests/`)

Run tests with:
```bash
cd packages/backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

**Test Structure**:
- `tests/utils/` - Algorithm and utility tests (SM2, feature flags)
- `tests/services/` - Service business logic tests
- `tests/integration/` - API route and data migration tests

**Key Test Files**:
- `sm2-algorithm.test.ts` - Spaced repetition algorithm tests
- `feature-flags.test.ts` - Migration feature flag tests
- `user-vocabulary.service.test.ts` - Vocabulary SM2 integration
- `user-grammar.service.test.ts` - Grammar SM2 integration
- `word-map.service.test.ts` - XP, progress, exam scoring
- `api-routes.test.ts` - Request/response validation
- `data-migration.test.ts` - V2 to V3 migration logic

Tests use Vitest and don't require database connection (pure business logic tests).

## Screenshots

App screenshots for documentation are stored in `/screenshots/` directory.