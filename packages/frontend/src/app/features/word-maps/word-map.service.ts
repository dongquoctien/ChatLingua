import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
// Word Map Types (V3)
// ============================================================

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type LessonType = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing' | 'mixed' | 'review' | 'project';
export type LessonProgressStatus = 'locked' | 'unlocked' | 'studying' | 'exam_ready' | 'completed';
export type UnitProgressStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type MapProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface WordMapSummary {
  id: number;
  name: string;
  description?: string;
  coverImageUrl?: string;
  cefrLevel: CEFRLevel;
  publisher?: string;
  totalUnits: number;
  totalLessons: number;
  estimatedHours?: number;
  isFree: boolean;
  priceCoins: number;
  isFeatured: boolean;
}

export interface WordMapWithProgress extends WordMapSummary {
  userProgress?: {
    isActivated: boolean;
    completionPercentage: number;
    currentUnitId?: number;
    currentLessonId?: number;
    unitsCompleted: number;
    lessonsCompleted: number;
    totalXpEarned: number;
    lastActivityAt?: string;
  };
}

export interface MapUnit {
  id: number;
  mapId: number;
  unitNumber: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isReviewUnit: boolean;
  bossExamCount: number;
  bossPassingScore: number;
  totalLessons: number;
  totalVocabulary: number;
  totalGrammar: number;
  completionXp: number;
  displayOrder: number;
}

export interface UnitWithProgress extends MapUnit {
  userProgress?: {
    status: UnitProgressStatus;
    lessonsCompleted: number;
    completionPercentage: number;
    bestBossExamScore: number;
    xpEarned: number;
  };
  lessons?: LessonWithProgress[];
}

export interface UnitLesson {
  id: number;
  unitId: number;
  lessonNumber: number;
  title: string;
  lessonType: LessonType;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  hasBossExam: boolean;
  bossPassingScore: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;
  estimatedMinutes: number;
  studyXp: number;
  examXp: number;
  displayOrder: number;
}

export interface LessonWithProgress extends UnitLesson {
  userProgress?: {
    status: LessonProgressStatus;
    contentProgressPercentage: number;
    bossExamPassed: boolean;
    bestExamScore: number;
    examAttempts: number;
    xpEarned: number;
  };
}

export interface LessonContent {
  id: number;
  lessonId: number;
  contentType: 'vocabulary' | 'grammar' | 'exercise' | 'text' | 'audio' | 'video' | 'image';
  masterVocabularyId?: number;
  masterGrammarId?: number;
  masterExerciseId?: number;
  customContent?: {
    title?: string;
    content?: string;
    url?: string;
    transcript?: string;
  };
  section: 'warmup' | 'study' | 'practice' | 'review' | 'extension';
  displayOrder: number;
}

export interface VocabularyContent {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic?: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
  partOfSpeech: string;
  cefrLevel: CEFRLevel;
  definitions?: {
    definition: string;
    definitionVi: string;
    examples?: { en: string; vi: string }[];
  }[];
  wordFamily?: {
    noun?: string[];
    verb?: string[];
    adjective?: string[];
    adverb?: string[];
  };
  synonyms?: string[];
  antonyms?: string[];
  collocations?: {
    adjective?: string[];
    phrases?: string[];
  };
  extraExamples?: { en: string; vi: string }[];
  usageNotes?: string;
}

export interface GrammarContent {
  id: number;
  grammarRule: string;
  category: string;
  cefrLevel: CEFRLevel;
  explanation: string;
  explanationVi: string;
  formula?: string;
  examples: { en: string; vi: string }[];
  commonMistakes?: { wrong: string; correct: string; explanation: string }[];
  usageTips?: string;
}

export interface ExerciseContent {
  id: number;
  exerciseType: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  exerciseData?: Record<string, unknown>;
  audioUrl?: string;
  timeLimitSeconds: number;
  points: number;
}

export interface LessonContentDetail {
  lesson: UnitLesson;
  vocabulary: VocabularyContent[];
  grammar: GrammarContent[];
  exercises: ExerciseContent[];
  customContent: LessonContent[];
}

export interface LessonExam {
  id: number;
  lessonId?: number;
  unitId?: number;
  examNumber: number;
  title: string;
  description?: string;
  timeLimitSeconds: number;
  passingScore: number;
  shuffleQuestions: boolean;
  showAnswersAfter: boolean;
  exerciseIds: number[];
  totalQuestions: number;
  totalPoints: number;
  passXp: number;
  perfectScoreBonusXp: number;
}

export interface ExamQuestion {
  id: number;
  exerciseType: string;
  question: string;
  options?: string[];
  exerciseData?: Record<string, unknown>;
  audioUrl?: string;
  points: number;
}

export interface StartExamResponse {
  attemptId: number;
  exam: LessonExam;
  questions: ExamQuestion[];
  startedAt: string;
}

export interface ExamAnswer {
  questionId: number;
  answer: string;
}

export interface ExamQuestionResult {
  questionId: number;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  explanation?: string;
}

export interface AchievementUnlock {
  name: string;
  icon: string;
  xpReward: number;
}

export interface LevelUpEvent {
  previousLevel: number;
  newLevel: number;
  newTitle: string;
  xpAtLevelUp: number;
}

export interface ExamResult {
  attemptId: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  isPassed: boolean;
  passed?: boolean; // New API compatibility
  xpEarned: number;
  coinsEarned: number;
  questionResults: ExamQuestionResult[];
  unlockedNext?: {
    type: 'lesson' | 'unit';
    id: number;
    title: string;
  };
  // Gamification data
  levelUp?: LevelUpEvent | null;
  achievements?: AchievementUnlock[];
}

export interface CompleteLessonStudyResult {
  xpEarned: number;
  coinsEarned: number;
  unlockedExam: boolean;
  progress?: {
    status: string;
    completedAt?: string;
  };
  nextLesson?: {
    id: number;
    title: string;
    status: string;
  } | null;
  // Gamification data
  levelUp?: LevelUpEvent | null;
  achievements?: AchievementUnlock[];
}

export interface UserProgressOverview {
  totalMapsActivated: number;
  totalMapsCompleted: number;
  totalUnitsCompleted: number;
  totalLessonsCompleted: number;
  vocabularyStats: {
    total: number;
    mastered: number;
    reviewing: number;
    learning: number;
    new: number;
  };
  grammarStats: {
    total: number;
    mastered: number;
    reviewing: number;
    learning: number;
    new: number;
  };
  exerciseStats: {
    totalAttempted: number;
    totalCorrect: number;
    accuracyRate: number;
  };
  totalXpEarned: number;
  totalCoinsEarned: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  dueVocabularyCount: number;
  dueGrammarCount: number;
}

export interface MapLeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  value: number;
  metric: 'xp' | 'vocabulary' | 'streak' | 'accuracy';
}

export interface MapLeaderboard {
  mapId: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: MapLeaderboardEntry[];
  userRank?: MapLeaderboardEntry;
  totalParticipants: number;
}

export interface StudyStats {
  period: 'today' | 'week' | 'month' | 'all';
  vocabularyReviewed: number;
  grammarReviewed: number;
  exercisesCompleted: number;
  studyTimeMinutes: number;
  xpEarned: number;
  coinsEarned: number;
  streakDays: number;
  accuracy: number;
}

// ============================================================
// Word Map Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class WordMapService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/v3`;

  // ============================================================
  // Word Maps
  // ============================================================

  /**
   * Get all available Word Maps with user progress
   */
  getWordMaps(cefrLevel?: CEFRLevel): Observable<{ maps: WordMapWithProgress[] }> {
    let params = new HttpParams();
    if (cefrLevel) {
      params = params.set('cefrLevel', cefrLevel);
    }
    return this.http.get<{ maps: WordMapWithProgress[] }>(`${this.baseUrl}/word-maps`, { params });
  }

  /**
   * Get Word Map detail with units and progress
   */
  getWordMapDetail(mapId: number): Observable<{
    map: WordMapWithProgress;
    units: UnitWithProgress[];
  }> {
    return this.http.get<{
      map: WordMapWithProgress;
      units: UnitWithProgress[];
    }>(`${this.baseUrl}/word-maps/${mapId}`);
  }

  /**
   * Activate a Word Map for learning
   */
  activateWordMap(mapId: number): Observable<{
    success: boolean;
    message: string;
    progress: WordMapWithProgress['userProgress'];
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      progress: WordMapWithProgress['userProgress'];
    }>(`${this.baseUrl}/word-maps/${mapId}/activate`, {});
  }

  // ============================================================
  // Units
  // ============================================================

  /**
   * Get unit detail with lessons
   */
  getUnitDetail(unitId: number): Observable<{
    unit: UnitWithProgress;
    lessons: LessonWithProgress[];
  }> {
    return this.http.get<{
      unit: UnitWithProgress;
      lessons: LessonWithProgress[];
    }>(`${this.baseUrl}/word-maps/units/${unitId}`);
  }

  // ============================================================
  // Lessons
  // ============================================================

  /**
   * Get lesson content for study
   */
  getLessonContent(lessonId: number): Observable<LessonContentDetail> {
    return this.http.get<LessonContentDetail>(`${this.baseUrl}/word-maps/lessons/${lessonId}/content`);
  }

  /**
   * Mark lesson study as complete
   */
  completeLessonStudy(lessonId: number, data: {
    vocabularyMastered?: number;
    grammarMastered?: number;
    timeSpentSeconds?: number;
    sessionId?: number;
  }): Observable<CompleteLessonStudyResult> {
    return this.http.post<CompleteLessonStudyResult>(
      `${this.baseUrl}/word-maps/lessons/${lessonId}/complete`,
      data
    );
  }

  // ============================================================
  // Exams
  // ============================================================

  /**
   * Start a lesson exam
   */
  startExam(lessonId: number): Observable<StartExamResponse> {
    return this.http.post<StartExamResponse>(`${this.baseUrl}/word-maps/lessons/${lessonId}/exam/start`, {});
  }

  /**
   * Submit exam answers
   */
  submitExamAnswers(attemptId: number, data: {
    answers: ExamAnswer[];
    timeSpentSeconds: number;
  }): Observable<ExamResult> {
    return this.http.post<ExamResult>(
      `${this.baseUrl}/word-maps/exams/${attemptId}/submit`,
      data
    );
  }

  /**
   * Get exam results
   */
  getExamResults(attemptId: number): Observable<ExamResult> {
    return this.http.get<ExamResult>(`${this.baseUrl}/word-maps/exams/${attemptId}/results`);
  }

  /**
   * Get exam history
   */
  getExamHistory(lessonId?: number, limit = 20): Observable<{
    attempts: {
      id: number;
      examId: number;
      examTitle: string;
      score: number;
      isPassed: boolean;
      timeTakenSeconds: number;
      completedAt: string;
    }[];
  }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (lessonId) {
      params = params.set('lessonId', lessonId.toString());
    }
    return this.http.get<{
      attempts: {
        id: number;
        examId: number;
        examTitle: string;
        score: number;
        isPassed: boolean;
        timeTakenSeconds: number;
        completedAt: string;
      }[];
    }>(`${this.baseUrl}/word-maps/exams/history`, { params });
  }

  // ============================================================
  // Progress
  // ============================================================

  /**
   * Get user's overall progress
   */
  getUserProgress(): Observable<UserProgressOverview> {
    return this.http.get<UserProgressOverview>(`${this.baseUrl}/progress`);
  }

  /**
   * Get vocabulary review queue
   */
  getVocabularyReviewQueue(limit = 20): Observable<{
    items: {
      id: number;
      masterVocabularyId: number;
      englishWord: string;
      vietnameseWord: string;
      phonetic?: string;
      partOfSpeech: string;
      masteryLevel: number;
      nextReviewAt: string;
      reviewStatus: string;
    }[];
    totalDue: number;
  }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<{
      items: {
        id: number;
        masterVocabularyId: number;
        englishWord: string;
        vietnameseWord: string;
        phonetic?: string;
        partOfSpeech: string;
        masteryLevel: number;
        nextReviewAt: string;
        reviewStatus: string;
      }[];
      totalDue: number;
    }>(`${this.baseUrl}/progress/vocabulary/review-queue`, { params });
  }

  /**
   * Submit vocabulary review
   */
  submitVocabularyReview(userVocabularyId: number, quality: number): Observable<{
    success: boolean;
    nextReviewAt: string;
    newInterval: number;
    newStatus: string;
    xpEarned: number;
  }> {
    return this.http.post<{
      success: boolean;
      nextReviewAt: string;
      newInterval: number;
      newStatus: string;
      xpEarned: number;
    }>(`${this.baseUrl}/progress/vocabulary/${userVocabularyId}/review`, { quality });
  }

  /**
   * Get leaderboard for a map
   */
  getLeaderboard(mapId?: number, period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly'): Observable<MapLeaderboard> {
    let params = new HttpParams().set('period', period);
    if (mapId) {
      params = params.set('mapId', mapId.toString());
    }
    return this.http.get<MapLeaderboard>(`${this.baseUrl}/progress/leaderboard`, { params });
  }

  /**
   * Get study statistics
   */
  getStudyStats(period: 'today' | 'week' | 'month' | 'all' = 'week'): Observable<StudyStats> {
    const params = new HttpParams().set('period', period);
    return this.http.get<StudyStats>(`${this.baseUrl}/progress/stats`, { params });
  }

  // ============================================================
  // Master Vocabulary API
  // ============================================================

  /**
   * Get master vocabulary list with filters
   */
  getMasterVocabulary(options?: {
    cefrLevel?: CEFRLevel;
    partOfSpeech?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<{
    items: VocabularyContent[];
    total: number;
    page: number;
    limit: number;
  }> {
    let params = new HttpParams();
    if (options?.cefrLevel) params = params.set('cefrLevel', options.cefrLevel);
    if (options?.partOfSpeech) params = params.set('partOfSpeech', options.partOfSpeech);
    if (options?.search) params = params.set('search', options.search);
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<{
      items: VocabularyContent[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.baseUrl}/vocabulary`, { params });
  }

  /**
   * Get single master vocabulary entry
   */
  getMasterVocabularyById(id: number): Observable<VocabularyContent> {
    return this.http.get<VocabularyContent>(`${this.baseUrl}/vocabulary/${id}`);
  }

  /**
   * Search master vocabulary
   */
  searchVocabulary(query: string, limit = 20): Observable<VocabularyContent[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());
    return this.http.get<VocabularyContent[]>(`${this.baseUrl}/vocabulary/search`, { params });
  }

  // ============================================================
  // Master Grammar API
  // ============================================================

  /**
   * Get master grammar list with filters
   */
  getMasterGrammar(options?: {
    cefrLevel?: CEFRLevel;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<{
    items: GrammarContent[];
    total: number;
    page: number;
    limit: number;
  }> {
    let params = new HttpParams();
    if (options?.cefrLevel) params = params.set('cefrLevel', options.cefrLevel);
    if (options?.category) params = params.set('category', options.category);
    if (options?.search) params = params.set('search', options.search);
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<{
      items: GrammarContent[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.baseUrl}/grammar`, { params });
  }

  /**
   * Get single master grammar entry
   */
  getMasterGrammarById(id: number): Observable<GrammarContent> {
    return this.http.get<GrammarContent>(`${this.baseUrl}/grammar/${id}`);
  }

  /**
   * Get available grammar categories
   */
  getGrammarCategories(): Observable<{ categories: string[] }> {
    return this.http.get<{ categories: string[] }>(`${this.baseUrl}/grammar/categories`);
  }

  // ============================================================
  // User Vocabulary Progress
  // ============================================================

  /**
   * Get user's vocabulary progress list
   */
  getUserVocabulary(options?: {
    status?: 'new' | 'learning' | 'reviewing' | 'mastered';
    cefrLevel?: CEFRLevel;
    limit?: number;
  }): Observable<{
    items: {
      id: number;
      masterVocabularyId: number;
      englishWord: string;
      vietnameseWord: string;
      phonetic?: string;
      partOfSpeech: string;
      cefrLevel: CEFRLevel;
      masteryLevel: number;
      reviewStatus: string;
      nextReviewAt?: string;
      timesPracticed: number;
      lastPracticedAt?: string;
    }[];
    total: number;
  }> {
    let params = new HttpParams();
    if (options?.status) params = params.set('status', options.status);
    if (options?.cefrLevel) params = params.set('cefrLevel', options.cefrLevel);
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<{
      items: {
        id: number;
        masterVocabularyId: number;
        englishWord: string;
        vietnameseWord: string;
        phonetic?: string;
        partOfSpeech: string;
        cefrLevel: CEFRLevel;
        masteryLevel: number;
        reviewStatus: string;
        nextReviewAt?: string;
        timesPracticed: number;
        lastPracticedAt?: string;
      }[];
      total: number;
    }>(`${this.baseUrl}/progress/vocabulary`, { params });
  }

  /**
   * Add vocabulary to user's learning queue
   */
  addVocabularyToLearning(masterVocabularyId: number, source?: string): Observable<{
    success: boolean;
    userVocabularyId: number;
  }> {
    return this.http.post<{
      success: boolean;
      userVocabularyId: number;
    }>(`${this.baseUrl}/progress/vocabulary/${masterVocabularyId}`, { source });
  }

  // ============================================================
  // User Grammar Progress
  // ============================================================

  /**
   * Get user's grammar progress list
   */
  getUserGrammar(options?: {
    status?: 'new' | 'learning' | 'reviewing' | 'mastered';
    category?: string;
    limit?: number;
  }): Observable<{
    items: {
      id: number;
      masterGrammarId: number;
      grammarRule: string;
      category: string;
      cefrLevel: CEFRLevel;
      masteryLevel: number;
      reviewStatus: string;
      nextReviewAt?: string;
      timesPracticed: number;
      lastPracticedAt?: string;
    }[];
    total: number;
  }> {
    let params = new HttpParams();
    if (options?.status) params = params.set('status', options.status);
    if (options?.category) params = params.set('category', options.category);
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<{
      items: {
        id: number;
        masterGrammarId: number;
        grammarRule: string;
        category: string;
        cefrLevel: CEFRLevel;
        masteryLevel: number;
        reviewStatus: string;
        nextReviewAt?: string;
        timesPracticed: number;
        lastPracticedAt?: string;
      }[];
      total: number;
    }>(`${this.baseUrl}/progress/grammar`, { params });
  }

  /**
   * Add grammar to user's learning queue
   */
  addGrammarToLearning(masterGrammarId: number, source?: string): Observable<{
    success: boolean;
    userGrammarId: number;
  }> {
    return this.http.post<{
      success: boolean;
      userGrammarId: number;
    }>(`${this.baseUrl}/progress/grammar/${masterGrammarId}`, { source });
  }

  /**
   * Get grammar review queue
   */
  getGrammarReviewQueue(limit = 20): Observable<{
    items: {
      id: number;
      masterGrammarId: number;
      grammarRule: string;
      category: string;
      explanation: string;
      explanationVi: string;
      formula?: string;
      examples: { en: string; vi: string }[];
      masteryLevel: number;
      nextReviewAt: string;
      reviewStatus: string;
    }[];
    totalDue: number;
  }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<{
      items: {
        id: number;
        masterGrammarId: number;
        grammarRule: string;
        category: string;
        explanation: string;
        explanationVi: string;
        formula?: string;
        examples: { en: string; vi: string }[];
        masteryLevel: number;
        nextReviewAt: string;
        reviewStatus: string;
      }[];
      totalDue: number;
    }>(`${this.baseUrl}/progress/grammar/review-queue`, { params });
  }

  /**
   * Submit grammar review
   */
  submitGrammarReview(userGrammarId: number, quality: number): Observable<{
    success: boolean;
    nextReviewAt: string;
    newInterval: number;
    newStatus: string;
    xpEarned: number;
  }> {
    return this.http.post<{
      success: boolean;
      nextReviewAt: string;
      newInterval: number;
      newStatus: string;
      xpEarned: number;
    }>(`${this.baseUrl}/progress/grammar/${userGrammarId}/review`, { quality });
  }
}
