# ChatLingua V3 Enhancements - Implementation Plan

**Created**: 2026-01-15
**Status**: Planning
**Estimated Total Time**: ~60-80 hours

---

## Overview

This plan covers implementation of remaining features from PLAN_VERSION_3.md Parts 8-17:

| Part | Topic | Status | Priority |
|------|-------|--------|----------|
| Part 9 | Media Storage & Static Files | Partial | HIGH |
| Part 10 | Study Content Types & Custom Content | Pending | HIGH |
| Part 11 | PDF Image Extraction | Pending | MEDIUM |
| Part 12 | Implementation TODO Checklist | Tracking | - |
| Part 13 | Prepare 2e Level 1 Content Sync | Partial | HIGH |
| Part 14 | MCP Media Sync Tools | Pending | HIGH |
| Part 15 | MCP ChatLingua Integration | Done | - |
| Part 16 | Deployment Strategy | Partial | MEDIUM |
| Part 17 | Word Map Gamification & Integration | Pending | HIGH |

---

## Phase 1: Backend Infrastructure (Est: 6 hours)

### 1.1 Add Compression Middleware
**Priority**: HIGH | **Est**: 1 hour

**File**: `packages/backend/src/index.ts`

```bash
cd packages/backend
npm install compression
npm install -D @types/compression
```

**Changes**:
```typescript
import compression from 'compression';

// Enable GZIP compression
app.use(compression());

// Audio files - cache for 7 days
app.use('/audio', express.static(path.join(process.cwd(), 'public/audio'), {
  maxAge: '7d',
  immutable: true,
  etag: true
}));

// Images - cache for 30 days
app.use('/images', express.static(path.join(process.cwd(), 'public/images'), {
  maxAge: '30d',
  immutable: true,
  etag: true
}));

// Videos - cache for 7 days, enable range requests
app.use('/videos', express.static(path.join(process.cwd(), 'public/videos'), {
  maxAge: '7d',
  immutable: true,
  acceptRanges: true
}));
```

### 1.2 Create Media Folder Structure
**Priority**: HIGH | **Est**: 0.5 hour

```bash
# Create folders with .gitkeep
mkdir -p packages/backend/public/audio/word-maps
mkdir -p packages/backend/public/images/word-maps
mkdir -p packages/backend/public/videos/word-maps

# Add .gitkeep files
touch packages/backend/public/audio/word-maps/.gitkeep
touch packages/backend/public/images/word-maps/.gitkeep
touch packages/backend/public/videos/word-maps/.gitkeep
```

### 1.3 Update .gitignore
**Priority**: HIGH | **Est**: 0.5 hour

**File**: `.gitignore` - Add rules for media files

```gitignore
# Media files - sync separately
packages/backend/public/audio/word-maps/**/*.mp3
packages/backend/public/audio/word-maps/**/*.wav
packages/backend/public/images/word-maps/**/*.png
packages/backend/public/images/word-maps/**/*.jpg
packages/backend/public/images/word-maps/**/*.webp
packages/backend/public/videos/**/*.mp4
packages/backend/public/videos/**/*.webm

# Keep folder structure
!packages/backend/public/audio/word-maps/.gitkeep
!packages/backend/public/images/word-maps/.gitkeep
!packages/backend/public/videos/word-maps/.gitkeep

# TTS generated files
packages/backend/public/audio/tts/
```

### 1.4 Create Media Sync Scripts
**Priority**: MEDIUM | **Est**: 2 hours

**Files to create**:
- `scripts/sync-media-dev.ps1` (Windows PowerShell)
- `scripts/sync-media-dev.sh` (Bash)
- `scripts/sync-media-server.sh` (Production deployment)

---

## Phase 2: Study Content UI Components (Est: 15 hours)

### 2.1 Audio Player Component
**Priority**: HIGH | **Est**: 4 hours

**Location**: `packages/frontend/src/app/shared/components/audio-player/`

**Files**:
- `audio-player.component.ts`
- `audio-player.component.html`
- `audio-player.component.scss`

**Features**:
- Play/Pause button
- Progress bar (seekable)
- Time display (current / total)
- Speed control (0.75x, 1x, 1.25x, 1.5x)
- Volume control
- Transcript toggle button
- Loading state
- Error handling

**Interface**:
```typescript
interface AudioConfig {
  title: string;
  url: string;
  transcript?: string;
  transcriptVi?: string;
  duration?: number;
  autoplay?: boolean;
}

@Input() config!: AudioConfig;
@Output() ended = new EventEmitter<void>();
@Output() timeUpdate = new EventEmitter<number>();
```

### 2.2 Image Viewer Component
**Priority**: HIGH | **Est**: 3 hours

**Location**: `packages/frontend/src/app/shared/components/image-viewer/`

**Features**:
- Display image with lazy loading
- Zoom in/out buttons
- Pinch-to-zoom (mobile)
- Fullscreen mode
- Caption display
- Source reference display
- Loading placeholder
- Error fallback

**Interface**:
```typescript
interface ImageConfig {
  title?: string;
  url: string;
  alt: string;
  caption?: string;
  sourceRef?: string;
  zoomable?: boolean;
}

@Input() config!: ImageConfig;
```

### 2.3 Video Player Component
**Priority**: MEDIUM | **Est**: 4 hours

**Location**: `packages/frontend/src/app/shared/components/video-player/`

**Features**:
- Native HTML5 video player
- Custom controls (play/pause, progress, volume)
- Fullscreen support
- Poster image
- Subtitle/caption track (VTT)
- Transcript toggle
- Playback speed control
- Picture-in-Picture support (optional)

**Interface**:
```typescript
interface VideoConfig {
  title: string;
  url: string;
  posterUrl?: string;
  transcript?: string;
  transcriptVi?: string;
  duration?: number;
  subtitles?: string;  // VTT file URL
}

@Input() config!: VideoConfig;
```

### 2.4 Text Content Component
**Priority**: MEDIUM | **Est**: 2 hours

**Location**: `packages/frontend/src/app/shared/components/text-content/`

**Features**:
- Render HTML content safely (sanitize)
- Optional: Markdown support
- Expandable/collapsible for long content
- Copy button (optional)

**Interface**:
```typescript
interface TextConfig {
  title?: string;
  content: string;
  format: 'html' | 'markdown' | 'plain';
}

@Input() config!: TextConfig;
```

### 2.5 Transcript Component (Shared)
**Priority**: MEDIUM | **Est**: 2 hours

**Location**: `packages/frontend/src/app/shared/components/transcript/`

**Features**:
- Toggle show/hide
- English transcript
- Vietnamese translation (parallel view)
- Highlight current sentence during playback
- Click sentence to seek (for audio/video)
- Copy button

**Interface**:
```typescript
@Input() transcript: string;
@Input() transcriptVi?: string;
@Input() currentTime?: number;  // For highlighting
@Output() seekTo = new EventEmitter<number>();
```

---

## Phase 3: Update Lesson Study Component (Est: 6 hours)

### 3.1 Backend: Update Lesson Content API
**Priority**: HIGH | **Est**: 2 hours

**File**: `packages/backend/src/services/v3/word-map.service.ts`

Ensure `getLessonContent()` returns `customContent` for all content types.

### 3.2 Frontend: Update Lesson Study Component
**Priority**: HIGH | **Est**: 4 hours

**File**: `packages/frontend/src/app/features/word-maps/lesson-study/lesson-study.component.ts`

**Changes**:

1. Add content type imports:
```typescript
import { AudioPlayerComponent } from '../../../shared/components/audio-player/audio-player.component';
import { VideoPlayerComponent } from '../../../shared/components/video-player/video-player.component';
import { ImageViewerComponent } from '../../../shared/components/image-viewer/image-viewer.component';
import { TextContentComponent } from '../../../shared/components/text-content/text-content.component';
```

2. Add computed properties for content by section:
```typescript
// All lesson content items
allContentItems = computed(() => this.lessonContent()?.content || []);

// Group by section
warmupContent = computed(() =>
  this.allContentItems().filter(c => c.section === 'warmup')
);
studyContent = computed(() =>
  this.allContentItems().filter(c => c.section === 'study')
);
practiceContent = computed(() =>
  this.allContentItems().filter(c => c.section === 'practice')
);
reviewContent = computed(() =>
  this.allContentItems().filter(c => c.section === 'review')
);
```

3. Add content renderer in template (lesson-study.component.html):
```html
<!-- Section-based rendering -->
@for (section of ['warmup', 'study', 'practice', 'review']; track section) {
  @if (getSectionContent(section).length > 0) {
    <div class="content-section mb-8">
      <h3 class="section-title">{{ getSectionTitle(section) }}</h3>

      @for (item of getSectionContent(section); track item.id) {
        @switch (item.contentType) {
          @case ('vocabulary') {
            <!-- Existing vocabulary card rendering -->
          }
          @case ('grammar') {
            <!-- Existing grammar rendering -->
          }
          @case ('exercise') {
            <!-- Existing exercise rendering -->
          }
          @case ('audio') {
            <app-audio-player [config]="item.customContent" />
          }
          @case ('video') {
            <app-video-player [config]="item.customContent" />
          }
          @case ('image') {
            <app-image-viewer [config]="item.customContent" />
          }
          @case ('text') {
            <app-text-content [config]="item.customContent" />
          }
        }
      }
    </div>
  }
}
```

---

## Phase 4: MCP Media Sync Tools (Est: 8 hours)

### 4.1 sync_media_files Tool
**Priority**: HIGH | **Est**: 4 hours

**File**: `packages/mcp-server/src/tools/admin/sync-media-files.ts`

**Features**:
- Copy files from source folder to backend/public
- Support glob patterns for file filtering
- Optional file renaming
- Update database URLs (if mapId provided)
- Dry-run mode for preview
- Return summary of copied files

**Parameters**:
```typescript
interface SyncMediaFilesParams {
  sourceFolder: string;      // e.g., "D:\\English\\Prepare 2e Level 1\\SB\\Audio"
  targetFolder: string;      // e.g., "audio/word-maps/prepare-2e-l1/sb"
  filePattern?: string;      // e.g., "*.mp3"
  renamePattern?: string;    // e.g., "track-{n}.mp3"
  mapId?: number;            // For database URL updates
  dryRun?: boolean;          // Preview only
}
```

### 4.2 list_media_files Tool
**Priority**: MEDIUM | **Est**: 2 hours

**File**: `packages/mcp-server/src/tools/admin/list-media-files.ts`

Preview files before sync.

### 4.3 validate_media_urls Tool
**Priority**: MEDIUM | **Est**: 2 hours

**File**: `packages/mcp-server/src/tools/admin/validate-media-urls.ts`

Check database URLs and report missing files.

---

## Phase 5: Word Map Achievements (Est: 8 hours)

### 5.1 Database Migration
**Priority**: HIGH | **Est**: 1 hour

**File**: `database/migrations/039_word_map_achievements.sql`

Add Word Map achievement rows to `achievements` table:
- Lesson milestones (1, 10, 50, 100 lessons)
- Unit milestones (1, 5, 10 units)
- Map completion (1, 3 maps)
- Exam performance (perfect score, first try)
- Vocabulary milestones (100, 500, 1000 from Word Maps)
- Streak achievements (7 days, 30 days)
- CEFR level completion (A1, A2, B1, B2)

### 5.2 Word Map Achievements Service
**Priority**: HIGH | **Est**: 4 hours

**File**: `packages/backend/src/services/v3/word-map-achievements.service.ts`

**Methods**:
- `checkAndAwardAchievements(userId, event)` - Main entry point
- `checkLessonAchievements(userId)` - Lesson milestone checks
- `checkUnitAchievements(userId)` - Unit milestone checks
- `checkMapAchievements(userId, mapId)` - Map completion checks
- `checkExamAchievements(userId, score, attemptNumber)` - Exam performance
- `checkVocabAchievements(userId)` - Vocabulary from Word Maps
- `checkStreakAchievements(userId)` - Word Map study streak

### 5.3 Integrate Achievements into User Progress
**Priority**: HIGH | **Est**: 2 hours

**File**: `packages/backend/src/services/v3/user-progress.service.ts`

Add achievement checks at:
- `completeLessonStudy()` - Check lesson/vocab achievements
- `submitExamAnswers()` - Check exam/unit/map achievements

### 5.4 Frontend: Achievement Display
**Priority**: MEDIUM | **Est**: 1 hour

Add achievement notification when unlocked in lesson-study and lesson-exam components.

---

## Phase 6: Pet System Integration (Est: 6 hours)

### 6.1 Add Pet Daily Tasks for Word Map
**Priority**: HIGH | **Est**: 1 hour

**File**: `database/migrations/040_pet_word_map_tasks.sql`

Add new daily task types:
- `word_map_study` - Complete 1 Word Map lesson study
- `word_map_vocab` - Study 10 new vocabulary from Word Map
- `word_map_exam` - Pass any Word Map lesson exam
- `word_map_review` - Review 20 Word Map vocabulary items

### 6.2 Update User Progress Service for Pet Stats
**Priority**: HIGH | **Est**: 3 hours

**File**: `packages/backend/src/services/v3/user-progress.service.ts`

Add pet integration:
```typescript
// In completeLessonStudy():
await this.petService.recordActivity(userId, {
  activityType: 'study',
  xpEarned,
  duration: data.timeSpentSeconds,
  source: 'word_map',
  metadata: { lessonId, mapId }
});

await this.petService.updateStats(userId, {
  happinessBoost: Math.min(10, Math.floor(data.vocabularyMastered / 2)),
  intelligenceBoost: Math.min(5, data.grammarMastered)
});

// In submitExamAnswers() when passed:
await this.petService.recordActivity(userId, {
  activityType: 'achievement',
  xpEarned,
  source: 'word_map_exam',
  metadata: { examId, score }
});
```

### 6.3 Update Pet Service for Word Map Task Completion
**Priority**: MEDIUM | **Est**: 2 hours

**File**: `packages/backend/src/services/pet.service.ts`

Add Word Map task completion detection.

---

## Phase 7: Vocabulary Page Filters (Est: 8 hours)

### 7.1 Backend: Filter Endpoints
**Priority**: HIGH | **Est**: 3 hours

**File**: `packages/backend/src/routes/v3/user-vocabulary.routes.ts`

Add endpoints:
- `GET /api/v3/user/vocabulary` - With filter params (sourceType, mapId, unitId, lessonId)
- `GET /api/v3/user/vocabulary/filters` - Available filter options

### 7.2 Backend: Filter Service Methods
**Priority**: HIGH | **Est**: 2 hours

**File**: `packages/backend/src/services/v3/user-vocabulary.service.ts`

Add methods:
- `getUserVocabularyFiltered(userId, options)` - Main query with filters
- `getAvailableFilters(userId)` - Get available maps/units/lessons for filter dropdowns

### 7.3 Frontend: Filter UI
**Priority**: HIGH | **Est**: 3 hours

**File**: `packages/frontend/src/app/features/vocabulary/vocabulary-list.component.ts`

Add:
- Source type radio buttons (All / Word Map / Conversations)
- Cascading dropdowns (Map → Unit → Lesson)
- Filter state signals
- Auto-reload on filter change

---

## Phase 8: Games Integration (Est: 6 hours)

### 8.1 Backend: Update Game Vocabulary Service
**Priority**: MEDIUM | **Est**: 3 hours

**File**: `packages/backend/src/services/game.service.ts`

Add `getGameVocabulary(options)` with:
- `sourceType` filter (all / word_map / conversation)
- `mapId` filter (specific Word Map)
- Prioritize less practiced words

### 8.2 Frontend: Game Selector Filter
**Priority**: MEDIUM | **Est**: 3 hours

**File**: `packages/frontend/src/app/features/games/game-selector.component.ts`

Add:
- Source type selection (radio buttons)
- Word Map selector (when word_map selected)
- Pass filters to game start

---

## Phase 9: Daily Review Integration (Est: 4 hours)

### 9.1 Update Daily Review Queue Service
**Priority**: HIGH | **Est**: 2 hours

**File**: `packages/backend/src/services/v3/daily-review-queue.service.ts`

Update `buildDailyQueue()` to:
- Include vocabulary from BOTH sources (word_map + conversation)
- Add source_type info in response
- Show breakdown (wordMapItems vs conversationItems)

### 9.2 Frontend: Review Queue Source Display
**Priority**: LOW | **Est**: 2 hours

**File**: `packages/frontend/src/app/features/review/`

Add source badge/icon on flashcards to show Word Map vs Conversation origin.

---

## Phase 10: Content Import - Prepare 2e Level 1 (Est: 8 hours)

### 10.1 Copy Audio Files
**Priority**: HIGH | **Est**: 1 hour

Run sync script to copy from `D:\English\Prepare 2e Level 1\` to `public/audio/word-maps/prepare-2e-l1/`

### 10.2 Import Vocabulary & Grammar via MCP
**Priority**: HIGH | **Est**: 4 hours

Use `import_evolve_content` MCP tool with data from sync plans.

### 10.3 Create Exercises
**Priority**: HIGH | **Est**: 2 hours

Use `generate_exercises` or `import_exercises` MCP tools.

### 10.4 Link Media Resources
**Priority**: HIGH | **Est**: 1 hour

Use `link_media_resource` MCP tool to connect audio files to lessons.

---

## Implementation Order (Recommended)

### Week 1: Foundation
1. Phase 1: Backend Infrastructure (6h)
2. Phase 2.1-2.2: Audio Player + Image Viewer (7h)

### Week 2: Core Study UI
3. Phase 2.3-2.5: Video Player + Text + Transcript (8h)
4. Phase 3: Update Lesson Study Component (6h)

### Week 3: MCP & Content
5. Phase 4: MCP Media Sync Tools (8h)
6. Phase 10: Content Import Prepare 2e (8h)

### Week 4: Gamification
7. Phase 5: Word Map Achievements (8h)
8. Phase 6: Pet System Integration (6h)

### Week 5: Filters & Games
9. Phase 7: Vocabulary Page Filters (8h)
10. Phase 8: Games Integration (6h)
11. Phase 9: Daily Review Integration (4h)

---

## Summary

| Phase | Description | Est. Hours | Priority |
|-------|-------------|------------|----------|
| 1 | Backend Infrastructure | 6 | HIGH |
| 2 | Study Content UI Components | 15 | HIGH |
| 3 | Update Lesson Study Component | 6 | HIGH |
| 4 | MCP Media Sync Tools | 8 | HIGH |
| 5 | Word Map Achievements | 8 | HIGH |
| 6 | Pet System Integration | 6 | HIGH |
| 7 | Vocabulary Page Filters | 8 | MEDIUM |
| 8 | Games Integration | 6 | MEDIUM |
| 9 | Daily Review Integration | 4 | MEDIUM |
| 10 | Content Import Prepare 2e | 8 | HIGH |
| **Total** | | **75 hours** | |

---

## Dependencies

```
Phase 1 (Infrastructure)
    ├── Phase 2 (UI Components)
    │   └── Phase 3 (Lesson Study Update)
    │       └── Phase 10 (Content Import)
    │
    └── Phase 4 (MCP Media Tools)
        └── Phase 10 (Content Import)

Phase 5 (Achievements) - Independent
    └── Phase 6 (Pet Integration) - After Phase 5

Phase 7 (Vocabulary Filters) - Independent
Phase 8 (Games) - Depends on Phase 7 (filter logic)
Phase 9 (Daily Review) - Independent
```

---

**Next Steps**: Start with Phase 1 (Backend Infrastructure) since it's a prerequisite for media handling.
