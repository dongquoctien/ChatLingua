# ChatLingua Version 3 - Implementation Phases

## Tổng quan

Tài liệu này mô tả chi tiết các phases triển khai còn thiếu để hoàn thành Version 3 Word Map System.

**Trạng thái hiện tại:**
- ✅ Database migrations (031-035)
- ✅ Backend V3 services cơ bản
- ✅ Backend V3 routes (word-maps, progress)
- ✅ MCP V3 tools cơ bản
- ✅ Shared V3 types
- ✅ Frontend word-maps components
- ❌ Feature flags configuration
- ❌ User Grammar Service V3
- ❌ Dual-write logic
- ❌ Master content API routes
- ❌ Content import tools nâng cao
- ❌ Test coverage

---

## Phase 1: Foundation & Configuration (Priority: CRITICAL)

### 1.1 Feature Flags Configuration

**File cần tạo:** `packages/backend/src/config/features.ts`

```typescript
// Feature flags for gradual V3 migration
export const FEATURE_FLAGS = {
  // Phase 1: Enable V3 tables for reads (query từ V3 tables)
  USE_V3_TABLES: process.env.USE_V3_TABLES === 'true' || false,

  // Phase 2: Enable dual-write (write to both V2 and V3 tables)
  DUAL_WRITE_ENABLED: process.env.DUAL_WRITE_ENABLED === 'true' || true,

  // Phase 3: Deprecate old table writes
  DEPRECATE_V2_TABLES: process.env.DEPRECATE_V2_TABLES === 'true' || false,

  // Word Map specific
  WORD_MAP_ENABLED: process.env.WORD_MAP_ENABLED === 'true' || true,
};

export function isV3Enabled(): boolean {
  return FEATURE_FLAGS.USE_V3_TABLES;
}

export function isDualWriteEnabled(): boolean {
  return FEATURE_FLAGS.DUAL_WRITE_ENABLED && !FEATURE_FLAGS.DEPRECATE_V2_TABLES;
}
```

**Tasks:**
- [ ] Tạo file `packages/backend/src/config/features.ts`
- [ ] Thêm environment variables vào `.env.example`
- [ ] Document feature flags trong README

**Test:**
- [ ] Unit test feature flag logic
- [ ] Test environment variable parsing

---

### 1.2 User Grammar Service V3

**File cần tạo:** `packages/backend/src/services/v3/user-grammar.service.ts`

Tương tự `user-vocabulary.service.ts`, cần tạo service cho grammar với:
- CRUD operations cho user_grammar
- SM2 spaced repetition cho grammar
- Link với master_grammar table

**Tasks:**
- [ ] Tạo `user-grammar.service.ts` với các methods:
  - `getUserGrammar(userId, filters)` - Lấy danh sách grammar của user
  - `addGrammarToUser(userId, masterGrammarId, source)` - Thêm grammar vào learning
  - `updateGrammarProgress(userId, userGrammarId, progress)` - Cập nhật tiến độ
  - `getGrammarReviewQueue(userId)` - Lấy queue ôn tập grammar
  - `submitGrammarReview(userId, userGrammarId, quality)` - Submit review với SM2
- [ ] Export từ `v3/index.ts`
- [ ] Thêm types vào `grammar-v3.ts` nếu thiếu

**Test:**
- [ ] Unit test SM2 calculation
- [ ] Unit test CRUD operations
- [ ] Integration test với database

---

## Phase 2: Master Content API Routes (Priority: HIGH)

### 2.1 Master Vocabulary Routes

**File cần tạo:** `packages/backend/src/routes/v3/vocabulary.routes.ts`

Endpoints cần thiết:
- `GET /api/v3/vocabulary` - List master vocabulary với filters
- `GET /api/v3/vocabulary/:id` - Get single vocabulary entry
- `GET /api/v3/vocabulary/search` - Full-text search
- `POST /api/v3/vocabulary` - Create (admin only)
- `PUT /api/v3/vocabulary/:id` - Update (admin only)
- `DELETE /api/v3/vocabulary/:id` - Delete (admin only)

**Tasks:**
- [ ] Tạo `packages/backend/src/routes/v3/vocabulary.routes.ts`
- [ ] Implement all CRUD endpoints
- [ ] Add admin authorization middleware
- [ ] Register trong `v3/index.ts`

**Test:**
- [ ] API endpoint tests với different auth levels
- [ ] Search functionality tests
- [ ] Pagination tests

---

### 2.2 Master Grammar Routes

**File cần tạo:** `packages/backend/src/routes/v3/grammar.routes.ts`

Endpoints cần thiết:
- `GET /api/v3/grammar` - List master grammar với filters
- `GET /api/v3/grammar/:id` - Get single grammar entry
- `GET /api/v3/grammar/categories` - Get available categories
- `POST /api/v3/grammar` - Create (admin only)
- `PUT /api/v3/grammar/:id` - Update (admin only)

**Tasks:**
- [ ] Tạo `packages/backend/src/routes/v3/grammar.routes.ts`
- [ ] Implement endpoints
- [ ] Register trong `v3/index.ts`

**Test:**
- [ ] API endpoint tests
- [ ] Filter by category/CEFR tests

---

### 2.3 Master Exercises Routes

**File cần tạo:** `packages/backend/src/routes/v3/exercises.routes.ts`

Endpoints cần thiết:
- `GET /api/v3/exercises` - List master exercises
- `GET /api/v3/exercises/:id` - Get single exercise
- `GET /api/v3/exercises/by-type/:type` - Filter by exercise type
- `POST /api/v3/exercises` - Create (admin only)
- `PUT /api/v3/exercises/:id` - Update (admin only)

**Tasks:**
- [ ] Tạo `packages/backend/src/routes/v3/exercises.routes.ts`
- [ ] Implement endpoints
- [ ] Register trong `v3/index.ts`

**Test:**
- [ ] API endpoint tests
- [ ] Exercise type filtering tests

---

### 2.4 User Progress Routes Enhancement

**File cần update:** `packages/backend/src/routes/v3/progress.routes.ts`

Thêm endpoints cho user vocabulary/grammar tracking:
- `GET /api/v3/progress/vocabulary` - User's vocabulary progress
- `POST /api/v3/progress/vocabulary/:masterVocabId` - Add vocab to learning
- `GET /api/v3/progress/vocabulary/review-queue` - Review queue
- `POST /api/v3/progress/vocabulary/:userVocabId/review` - Submit review
- `GET /api/v3/progress/grammar` - User's grammar progress
- `POST /api/v3/progress/grammar/:masterGrammarId` - Add grammar to learning
- `GET /api/v3/progress/grammar/review-queue` - Grammar review queue
- `POST /api/v3/progress/grammar/:userGrammarId/review` - Submit grammar review

**Tasks:**
- [ ] Thêm vocabulary progress endpoints
- [ ] Thêm grammar progress endpoints
- [ ] Integrate với user-vocabulary.service và user-grammar.service

**Test:**
- [ ] Progress tracking tests
- [ ] Review queue tests
- [ ] SM2 algorithm integration tests

---

## Phase 3: Dual-Write Implementation (Priority: HIGH)

### 3.1 Vocabulary Service Dual-Write

**File cần update:** `packages/backend/src/services/vocabulary.service.ts`

Thêm logic để write vào cả V2 và V3 tables khi DUAL_WRITE_ENABLED = true

```typescript
// Pseudo-code for dual-write pattern
async createVocabulary(data) {
  // Always write to V2 (old) table
  const oldVocabId = await this.insertToVocabularyTable(data);

  if (isDualWriteEnabled()) {
    // Also write to V3 tables
    const masterVocabId = await this.findOrCreateMasterVocabulary(data);
    await this.createUserVocabulary(userId, masterVocabId, 'conversation', conversationId);
  }

  return oldVocabId;
}
```

**Tasks:**
- [ ] Import feature flags
- [ ] Add dual-write logic to `createVocabulary()`
- [ ] Add dual-write logic to `updateVocabulary()`
- [ ] Handle ID mapping between V2 and V3

**Test:**
- [ ] Test dual-write creates records in both tables
- [ ] Test feature flag disable prevents V3 write
- [ ] Test data consistency between V2 and V3

---

### 3.2 Spaced Repetition Service Dual-Write

**File cần update:** `packages/backend/src/services/spaced-repetition.service.ts`

Thêm logic để update SM2 fields trên cả V2 và V3 tables

**Tasks:**
- [ ] Add dual-write to `submitReview()`
- [ ] Add dual-write to `buildDailyQueue()`
- [ ] Sync `vocabulary_reviews` → `vocabulary_reviews_v3`
- [ ] Sync `daily_review_queue` → `daily_review_queue_v3`

**Test:**
- [ ] Test SM2 calculation consistency
- [ ] Test queue building for both tables
- [ ] Test review history sync

---

### 3.3 Exercise Service Dual-Write

**File cần update:** `packages/backend/src/services/exercise.service.ts`

**Tasks:**
- [ ] Add dual-write to exercise creation
- [ ] Add dual-write to `exercise_attempts` → `user_exercise_attempts`
- [ ] Map exercise IDs between V2 and V3

**Test:**
- [ ] Test exercise creation dual-write
- [ ] Test attempt recording dual-write

---

### 3.4 Grammar Spaced Repetition Dual-Write

**File cần update:** `packages/backend/src/services/grammar-spaced-repetition.service.ts`

**Tasks:**
- [ ] Add dual-write to grammar review submission
- [ ] Sync `grammar_reviews` → `grammar_reviews_v3`

**Test:**
- [ ] Test grammar SM2 dual-write

---

## Phase 4: MCP Tools Dual-Write (Priority: HIGH)

### 4.1 analyze-conversation Tool

**File cần update:** `packages/mcp-server/src/tools/analyze-conversation.ts`

**Tasks:**
- [ ] Find or create master_vocabulary entries
- [ ] Create user_vocabulary entries linking to master
- [ ] Create user_grammar entries linking to master_grammar
- [ ] Maintain backward compatibility với V2 tables

**Test:**
- [ ] Test vocabulary extraction dual-write
- [ ] Test grammar extraction dual-write
- [ ] Test conversation linking

---

### 4.2 enrich-vocabulary Tool

**File cần update:** `packages/mcp-server/src/tools/enrich-vocabulary.ts`

**Tasks:**
- [ ] Update master_vocabulary với dictionary data
- [ ] Sync updates to V2 vocabulary table

**Test:**
- [ ] Test dictionary data enrichment
- [ ] Test sync to V2

---

### 4.3 generate-exercises Tool

**File cần update:** `packages/mcp-server/src/tools/generate-exercises.ts`

**Tasks:**
- [ ] Create master_exercises entries
- [ ] Link exercises to master_vocabulary/master_grammar
- [ ] Maintain V2 exercises table sync

**Test:**
- [ ] Test exercise generation dual-write
- [ ] Test relationship linking

---

### 4.4 submit-review Tool

**File cần update:** `packages/mcp-server/src/tools/submit-review.ts`

**Tasks:**
- [ ] Update user_vocabulary SM2 fields
- [ ] Write to vocabulary_reviews_v3
- [ ] Maintain V2 sync

**Test:**
- [ ] Test SM2 calculation
- [ ] Test review history dual-write

---

### 4.5 Grammar Tools Dual-Write

**Files cần update:**
- `packages/mcp-server/src/tools/generate-grammar-exercises.ts`
- `packages/mcp-server/src/tools/submit-grammar-review.ts`

**Tasks:**
- [ ] Dual-write grammar exercises
- [ ] Dual-write grammar reviews

**Test:**
- [ ] Grammar exercise generation tests
- [ ] Grammar review dual-write tests

---

## Phase 5: Content Import Tools (Priority: MEDIUM)

### 5.1 Advanced Import Tools

**Files cần tạo trong `packages/mcp-server/src/tools/v3/`:**

#### 5.1.1 import-audio-tracks.ts
```typescript
// Tool để import audio files và link với lessons
{
  name: "import_audio_tracks",
  description: "[ADMIN] Import audio tracks and auto-link to units/lessons",
  parameters: {
    map_id: number,
    audio_folder: string,
    naming_pattern: string  // e.g., "Track {track}.{sub} [EV_SB1_U{unit}_p{page}_Ex{ex}]"
  }
}
```

**Tasks:**
- [ ] Parse filename patterns
- [ ] Extract unit/page/exercise references
- [ ] Create media_resources entries
- [ ] Link to lesson_content

---

#### 5.1.2 import-evolve-content.ts
```typescript
// Tool để import nội dung từ Evolve textbook
{
  name: "import_evolve_content",
  description: "[ADMIN] Import vocabulary/grammar from Evolve textbook structure",
  parameters: {
    map_id: number,
    content_type: "vocabulary" | "grammar" | "both",
    unit_number: number,
    content_data: Array<VocabularyInput | GrammarInput>
  }
}
```

**Tasks:**
- [ ] Validate content structure
- [ ] Create master_vocabulary/master_grammar entries
- [ ] Link to appropriate lesson_content

---

#### 5.1.3 parse-pdf-structure.ts
```typescript
// Tool để parse PDF textbook structure
{
  name: "parse_pdf_structure",
  description: "[ADMIN] Parse textbook PDF and extract unit/lesson structure",
  parameters: {
    pdf_path: string,
    map_id: number
  }
}
```

**Tasks:**
- [ ] Extract unit titles
- [ ] Extract lesson structure
- [ ] Create map_units and unit_lessons entries

---

### 5.2 Update v3/index.ts

**Tasks:**
- [ ] Export new import tools
- [ ] Register in v3Tools array
- [ ] Add handlers to v3ToolHandlers

**Test:**
- [ ] Audio import tests
- [ ] Content import tests
- [ ] PDF parsing tests (if applicable)

---

## Phase 6: Frontend Enhancements (Priority: MEDIUM)

### 6.1 Unit Detail Component

**File cần tạo:** `packages/frontend/src/app/features/word-maps/unit-detail/`

Plan có route `/word-maps/:mapId/unit/:unitId` nhưng chưa có component riêng.

**Tasks:**
- [ ] Tạo `unit-detail.component.ts`
- [ ] Tạo `unit-detail.component.html`
- [ ] Tạo `unit-detail.component.scss`
- [ ] Thêm route trong `app.routes.ts`

---

### 6.2 Word Map Service Enhancement

**File cần update:** `packages/frontend/src/app/features/word-maps/word-map.service.ts`

**Tasks:**
- [ ] Thêm methods cho master vocabulary API
- [ ] Thêm methods cho master grammar API
- [ ] Thêm methods cho user vocabulary progress API
- [ ] Thêm methods cho review queue V3 API

---

### 6.3 V3 Review Components

**Files cần tạo hoặc update:**
- Review flashcard cho V3 vocabulary
- Review flashcard cho V3 grammar

**Tasks:**
- [ ] Create/update flashcard component để support V3 data structure
- [ ] Handle user_vocabulary_id thay vì vocabulary_id
- [ ] Integrate với V3 review queue

---

## Phase 7: Testing (Priority: CRITICAL)

### 7.1 Unit Tests

**Files cần tạo:**

#### Backend Unit Tests
```
packages/backend/tests/
├── services/
│   ├── v3/
│   │   ├── master-vocabulary.service.test.ts
│   │   ├── master-grammar.service.test.ts
│   │   ├── master-exercises.service.test.ts
│   │   ├── user-vocabulary.service.test.ts
│   │   ├── user-grammar.service.test.ts
│   │   ├── user-progress.service.test.ts
│   │   ├── word-map.service.test.ts
│   │   └── exam.service.test.ts
│   └── dual-write.test.ts
├── routes/
│   └── v3/
│       ├── word-maps.routes.test.ts
│       ├── vocabulary.routes.test.ts
│       ├── grammar.routes.test.ts
│       ├── exercises.routes.test.ts
│       └── progress.routes.test.ts
└── utils/
    ├── sm2-algorithm.test.ts
    └── feature-flags.test.ts
```

**Tasks:**
- [ ] Setup test framework (Jest/Vitest)
- [ ] Create test database configuration
- [ ] Write service unit tests
- [ ] Write route integration tests
- [ ] Write SM2 algorithm tests
- [ ] Write feature flag tests

---

### 7.2 Integration Tests

**Test Scenarios:**

#### 7.2.1 Complete Learning Flow
```
1. User activates Word Map
2. User starts Lesson 1
3. User studies vocabulary (creates user_vocabulary entries)
4. User completes lesson study
5. User takes lesson exam
6. Exam passed → Lesson 2 unlocked
7. Vocabulary added to review queue
8. User reviews vocabulary (SM2 update)
```

**Tasks:**
- [ ] Write end-to-end learning flow test
- [ ] Verify all database entries created correctly
- [ ] Verify XP and achievements awarded
- [ ] Verify unlock logic works

---

#### 7.2.2 Dual-Write Consistency
```
1. Create vocabulary via MCP tool
2. Verify V2 table entry
3. Verify V3 table entries (master + user)
4. Submit review
5. Verify both tables updated with SM2
```

**Tasks:**
- [ ] Write dual-write consistency test
- [ ] Verify data sync between tables
- [ ] Test rollback on failure

---

#### 7.2.3 Data Migration Verification
```
1. Run migration scripts
2. Verify all V2 data migrated to V3
3. Verify ID mappings correct
4. Verify SM2 state preserved
5. Verify no data loss
```

**Tasks:**
- [ ] Create migration verification script
- [ ] Compare record counts
- [ ] Compare data integrity
- [ ] Verify foreign key relationships

---

### 7.3 Frontend Tests

**Tasks:**
- [ ] Component unit tests cho word-map components
- [ ] Service tests cho word-map.service
- [ ] E2E tests cho learning flow

---

### 7.4 MCP Tool Tests

**Files cần tạo:**
```
packages/mcp-server/tests/
├── tools/
│   ├── v3/
│   │   ├── word-map-tools.test.ts
│   │   ├── exam-tools.test.ts
│   │   ├── progress-tools.test.ts
│   │   └── content-import-tools.test.ts
│   └── dual-write.test.ts
└── integration/
    └── mcp-flow.test.ts
```

**Tasks:**
- [ ] Setup MCP test harness
- [ ] Write tool unit tests
- [ ] Write integration tests với database

---

## Phase 8: Documentation & Cleanup (Priority: LOW)

### 8.1 API Documentation

**Tasks:**
- [ ] Document all V3 API endpoints
- [ ] Create OpenAPI/Swagger spec
- [ ] Update README với V3 features

---

### 8.2 Code Cleanup

**Tasks:**
- [ ] Remove commented code
- [ ] Ensure consistent naming conventions
- [ ] Add JSDoc comments cho public APIs

---

### 8.3 Migration Guide

**Tasks:**
- [ ] Document migration steps for existing users
- [ ] Create rollback procedures
- [ ] Document feature flag usage

---

## Implementation Order Summary

### Week 1: Foundation
1. Phase 1.1 - Feature Flags Configuration
2. Phase 1.2 - User Grammar Service V3
3. Phase 7.4 - Setup test framework

### Week 2: API Routes
1. Phase 2.1 - Master Vocabulary Routes
2. Phase 2.2 - Master Grammar Routes
3. Phase 2.3 - Master Exercises Routes
4. Phase 2.4 - User Progress Routes Enhancement

### Week 3: Dual-Write Backend
1. Phase 3.1 - Vocabulary Service Dual-Write
2. Phase 3.2 - Spaced Repetition Service Dual-Write
3. Phase 3.3 - Exercise Service Dual-Write
4. Phase 3.4 - Grammar SR Dual-Write

### Week 4: Dual-Write MCP
1. Phase 4.1 - analyze-conversation Tool
2. Phase 4.2 - enrich-vocabulary Tool
3. Phase 4.3 - generate-exercises Tool
4. Phase 4.4 - submit-review Tool
5. Phase 4.5 - Grammar Tools

### Week 5: Content Import & Frontend
1. Phase 5.1 - Advanced Import Tools
2. Phase 6.1 - Unit Detail Component
3. Phase 6.2 - Word Map Service Enhancement

### Week 6: Testing & Documentation
1. Phase 7.1 - Unit Tests
2. Phase 7.2 - Integration Tests
3. Phase 7.3 - Frontend Tests
4. Phase 8 - Documentation

---

## Checklist Summary

### Phase 1: Foundation ⬜
- [ ] `packages/backend/src/config/features.ts`
- [ ] `packages/backend/src/services/v3/user-grammar.service.ts`
- [ ] Update `v3/index.ts` exports

### Phase 2: API Routes ⬜
- [ ] `packages/backend/src/routes/v3/vocabulary.routes.ts`
- [ ] `packages/backend/src/routes/v3/grammar.routes.ts`
- [ ] `packages/backend/src/routes/v3/exercises.routes.ts`
- [ ] Update `packages/backend/src/routes/v3/progress.routes.ts`
- [ ] Update `packages/backend/src/routes/v3/index.ts`

### Phase 3: Dual-Write Backend ⬜
- [ ] Update `vocabulary.service.ts`
- [ ] Update `spaced-repetition.service.ts`
- [ ] Update `exercise.service.ts`
- [ ] Update `grammar-spaced-repetition.service.ts`

### Phase 4: Dual-Write MCP ⬜
- [ ] Update `analyze-conversation.ts`
- [ ] Update `enrich-vocabulary.ts`
- [ ] Update `generate-exercises.ts`
- [ ] Update `submit-review.ts`
- [ ] Update `generate-grammar-exercises.ts`
- [ ] Update `submit-grammar-review.ts`

### Phase 5: Content Import ⬜
- [ ] `import-audio-tracks.ts`
- [ ] `import-evolve-content.ts`
- [ ] `parse-pdf-structure.ts`
- [ ] Update `v3/index.ts`

### Phase 6: Frontend ⬜
- [ ] Unit detail component
- [ ] Word Map service enhancement
- [ ] V3 review components

### Phase 7: Testing ⬜
- [ ] Backend unit tests
- [ ] Backend integration tests
- [ ] Frontend tests
- [ ] MCP tool tests

### Phase 8: Documentation ⬜
- [ ] API documentation
- [ ] Code cleanup
- [ ] Migration guide

---

**Document Version**: 1.0
**Created**: 2026-01-10
**Status**: Ready for Implementation
