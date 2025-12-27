# Plan: MCP Tools Optimization - Chia nhỏ xử lý

## Mục tiêu

Tối ưu performance của MCP tools bằng cách chia nhỏ flow xử lý:
1. **analyze_conversation** (quick) → Lưu conversation + basic vocabulary
2. **enrich_vocabulary** (background/parallel) → Enrich dictionary data
3. **generate_exercises** (giữ nguyên) → Tạo bài tập

## Flow mới

```
┌─────────────────────────────────────────────────────────┐
│                    User Input                           │
│              "Hôm nay tôi đi làm muộn..."              │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 1: analyze_conversation (~5-10s)                  │
│  ─────────────────────────────────────────────          │
│  Input:                                                 │
│    - vietnameseText                                     │
│    - englishTranslation                                 │
│    - vocabulary[] (basic fields only)                   │
│    - grammarPoints[]                                    │
│                                                         │
│  Output:                                                │
│    - conversationId                                     │
│    - vocabularyIds[]                                    │
│    - grammarPointIds[]                                  │
│    - pendingEnrichment: true                            │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│ STEP 2a:        │ │ STEP 2b:    │ │ STEP 3:             │
│ enrich_vocab    │ │ enrich_vocab│ │ generate_exercises  │
│ (batch 1: 3-5)  │ │ (batch 2)   │ │ (chạy song song)    │
│ ~10-15s         │ │ ~10-15s     │ │ ~5-10s              │
└─────────────────┘ └─────────────┘ └─────────────────────┘
```

---

## Chi tiết thay đổi

### 1. analyze_conversation (MODIFIED)

**Thay đổi:**
- Giảm required fields cho vocabulary
- Chỉ cần basic info để lưu nhanh
- Return thêm `vocabularyIds[]` cho step tiếp theo

**Basic vocabulary fields (required):**
```typescript
{
  vietnameseWord: string;      // "đi làm"
  englishWord: string;         // "go to work"
  partOfSpeech: PartOfSpeech;  // "verb" | "noun" | ...
  cefrLevel?: CEFRLevel;       // "A1" | "A2" | ... (optional estimate)
}
```

**Response mới:**
```typescript
{
  success: true,
  conversationId: 123,
  vocabularyIds: [456, 457, 458, ...],  // NEW: để gọi enrich
  grammarPointIds: [789, ...],
  message: "Saved 10 vocabulary items. Ready for enrichment.",
  summary: {
    vocabularyCount: 10,
    grammarPointsCount: 3,
    pendingEnrichment: true  // NEW: flag cho Claude biết cần enrich
  }
}
```

**File thay đổi:** `packages/mcp-server/src/tools/analyze-conversation.ts`

---

### 2. enrich_vocabulary (NEW TOOL)

**Mục đích:** Enrich vocabulary với dictionary data đầy đủ

**Input:**
```typescript
{
  vocabularyIds: number[];  // Batch 3-5 IDs mỗi lần
  vocabulary: {
    id: number;
    // Dictionary fields - Claude generate
    pronunciationUk?: string;
    pronunciationUs?: string;
    wordForms?: WordForms;
    definitions?: Definition[];
    wordFamily?: WordFamily;
    synonyms?: string[];
    antonyms?: string[];
    collocations?: Collocations;
    idioms?: Idiom[];
    usageNotes?: string;
    grammarInfo?: GrammarInfo;
    register?: Register;
    extraExamples?: DefinitionExample[];
    topics?: TopicTag[];
    wordOrigin?: string;
    seeAlso?: string[];
  }[];
}
```

**Output:**
```typescript
{
  success: true,
  enriched: [
    { id: 456, englishWord: "contract", status: "success" },
    { id: 457, englishWord: "agreement", status: "success" },
    { id: 458, englishWord: "negotiate", status: "failed", error: "..." }
  ],
  summary: {
    total: 5,
    succeeded: 4,
    failed: 1,
    retried: 1
  }
}
```

**Retry logic:**
```typescript
for (const vocab of input.vocabulary) {
  let attempts = 0;
  let success = false;

  while (attempts < 2 && !success) {  // Max 2 attempts (1 retry)
    try {
      await updateVocabulary(vocab);
      success = true;
    } catch (error) {
      attempts++;
      if (attempts >= 2) {
        // Skip after 1 retry
        logError(vocab.id, error);
      }
    }
  }
}
```

**File mới:** `packages/mcp-server/src/tools/enrich-vocabulary.ts`

---

### 3. generate_exercises (NO CHANGES)

Giữ nguyên logic hiện tại. Tool này có thể chạy:
- Ngay sau Step 1 (dùng basic vocabulary)
- Sau Step 2 (dùng enriched vocabulary - optional)

---

## Mapping fields

### Fields bỏ khỏi required (Step 1):

| Field | Move to Step 2 | Reason |
|-------|----------------|--------|
| pronunciationUk | Yes | Claude generate |
| pronunciationUs | Yes | Claude generate |
| audioUkUrl | SKIP | Cần external API |
| audioUsUrl | SKIP | Cần external API |
| wordForms | Yes | Claude generate |
| definitions | Yes | Heavy - nhiều examples |
| wordFamily | Yes | Claude generate |
| synonyms | Yes | Claude generate |
| antonyms | Yes | Claude generate |
| collocations | Yes | Claude generate |
| idioms | Yes | Claude generate |
| usageNotes | Yes | Claude generate |
| grammarInfo | Yes | Claude generate |
| extraExamples | Yes | Heavy - nhiều sentences |
| frequencyRank | SKIP | Cần corpus data |
| topics | Yes | Claude generate |
| wordOrigin | Yes | Claude generate |
| seeAlso | Yes | Claude generate |

### Fields giữ trong Step 1:

| Field | Reason |
|-------|--------|
| vietnameseWord | Required for basic save |
| englishWord | Required for basic save |
| partOfSpeech | Required for unique key |
| cefrLevel | Quick estimate OK |
| difficultyLevel | Auto from conversation |

### Fields tự động (Database):

| Field | Source |
|-------|--------|
| id | AUTO_INCREMENT |
| userId | From context |
| masteryLevel | Default 0, update on practice |
| timesPracticed | Default 0, update on practice |
| lastPracticedAt | Update on practice |
| createdAt | CURRENT_TIMESTAMP |
| updatedAt | ON UPDATE CURRENT_TIMESTAMP |

---

## Hướng dẫn cho Claude

Sau khi implement, update tool description để Claude biết flow mới:

### analyze_conversation description:
```
Step 1 of learning flow. Quickly saves conversation and basic vocabulary.
Returns vocabularyIds[] - ALWAYS call enrich_vocabulary next with these IDs.
```

### enrich_vocabulary description:
```
Step 2 of learning flow. Enriches vocabulary with dictionary data.
Call this after analyze_conversation. Process in batches of 3-5 words.
```

### generate_exercises description:
```
Step 3 of learning flow. Can run in parallel with enrich_vocabulary.
Only requires conversationId from Step 1.
```

---

## Sequence cho Claude (tự động)

```
User: "Hôm nay tôi đi gặp đối tác ký hợp đồng..."

Claude:
1. Call analyze_conversation(text, translation, basic_vocab)
   → Nhận: conversationId=123, vocabularyIds=[456,457,458,459,460]

2. Call enrich_vocabulary(ids=[456,457,458]) // Batch 1
   Call enrich_vocabulary(ids=[459,460])     // Batch 2 (parallel if possible)
   Call generate_exercises(conversationId=123) // Parallel

3. Return final summary to user
```

---

## Files cần thay đổi

1. `packages/mcp-server/src/tools/analyze-conversation.ts`
   - Giảm required fields
   - Return vocabularyIds[]

2. `packages/mcp-server/src/tools/enrich-vocabulary.ts` (NEW)
   - New tool for enrichment
   - Retry logic (1 retry, then skip)

3. `packages/mcp-server/src/tools/index.ts`
   - Export new tool
   - Add to handler

---

## Backward Compatibility

- `analyze_conversation` vẫn accept full vocabulary data (optional fields)
- Nếu Claude gửi full data như cũ → vẫn hoạt động
- Chỉ khác: required fields ít hơn → nhanh hơn nếu dùng flow mới

---

## Testing

1. Test Step 1 alone: Verify basic vocabulary saved
2. Test Step 2 alone: Verify enrichment works with retry
3. Test full flow: Step 1 → Step 2 → Step 3
4. Test backward compat: Old full-data call still works
