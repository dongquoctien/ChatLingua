import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Conversation {
  id: number;
  vietnameseText: string;
  englishTranslation: string;
  topic: string | null;
  difficultyLevel: string;
  vocabularyCount: number;
  grammarCount: number;
  createdAt: string;
}

export interface ConversationDetail extends Conversation {
  aiAnalysis: string | null;
  vocabulary: Vocabulary[];
  grammarPoints: GrammarPoint[];
}

export interface Vocabulary {
  id: number;
  vietnameseWord: string;
  englishWord: string;
  phonetic: string | null;
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  partOfSpeech: string | null;
  difficultyLevel: string;
  masteryLevel: number;
  timesPracticed: number;
  lastPracticedAt: string | null;
  createdAt: string;
  // Dictionary preview fields
  cefrLevel?: string | null;
  definitionCount?: number;
  exampleCount?: number;
  // Context-specific (from vocabulary_contexts when joined)
  exampleVi?: string | null;
  exampleEn?: string | null;
}

// Dictionary Types
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Register = 'formal' | 'informal' | 'neutral' | 'slang' | 'technical';

export interface DefinitionExample {
  en: string;
  vi: string;
}

export interface Definition {
  senseId: number;
  definition: string;
  definitionVi: string;
  grammar?: string;
  register?: Register;
  examples: DefinitionExample[];
  patterns?: string[];
  topics?: TopicTag[];
}

export interface TopicTag {
  name: string;
  level: CEFRLevel;
}

export interface WordForms {
  plural?: string;
  past?: string;
  pastParticiple?: string;
  presentParticiple?: string;
  thirdPerson?: string;
  comparative?: string;
  superlative?: string;
}

export interface WordFamily {
  noun?: string[];
  verb?: string[];
  adjective?: string[];
  adverb?: string[];
}

export interface Collocations {
  adjective?: string[];
  verbContract?: string[];
  contractVerb?: string[];
  contractNoun?: string[];
  preposition?: string[];
  phrases?: string[];
}

export interface Idiom {
  phrase: string;
  meaning: string;
  meaningVi: string;
}

export interface GrammarInfo {
  countable?: boolean;
  transitive?: boolean;
  patterns?: string[];
}

export interface VocabularyContext {
  id: number;
  vocabularyId: number;
  conversationId: number;
  vietnameseWord: string;
  exampleVi: string | null;
  exampleEn: string | null;
  createdAt: string;
}

export interface DictionaryEntry extends Vocabulary {
  // Audio URLs (pronunciation text is inherited from Vocabulary)
  audioUkUrl: string | null;
  audioUsUrl: string | null;
  // Word forms and definitions
  wordForms: WordForms | null;
  definitions: Definition[] | null;
  // Related vocabulary
  wordFamily: WordFamily | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  // Usage
  collocations: Collocations | null;
  idioms: Idiom[] | null;
  usageNotes: string | null;
  extraExamples: DefinitionExample[] | null;
  // Grammar and classification
  grammarInfo: GrammarInfo | null;
  register: Register | null;
  frequencyRank: number | null;
  cefrLevel: CEFRLevel | null;
  topics: TopicTag[] | null;
  wordOrigin: string | null;
  seeAlso: string[] | null;
  // Computed
  definitionCount: number;
  exampleCount: number;
  // Contexts (conversations where this word appeared)
  contexts?: VocabularyContext[];
}

export interface RelatedWords {
  wordFamily: Vocabulary[];
  synonyms: Vocabulary[];
  seeAlso: Vocabulary[];
}

export interface GrammarPoint {
  id: number;
  rule: string;
  explanationVi: string | null;
  explanationEn: string | null;
  exampleVi: string | null;
  exampleEn: string | null;
  difficultyLevel: string;
}

export interface Exercise {
  id: number;
  conversationId: number | null;
  exerciseType: 'multiple_choice' | 'fill_blank' | 'translation' | 'sentence_building' | 'matching' | 'spelling' | 'listening' | 'error_correction' | 'verb_conjugation' | 'cloze';
  questionText: string;
  options: string[] | null;
  correctAnswer?: string;
  difficultyLevel: string;
  exerciseData?: string | object; // JSON data for advanced exercise types
  audioUrl?: string; // Audio URL for listening/spelling exercises
}

export interface ExerciseResult {
  isCorrect: boolean;
  correctAnswer: string;
  attempt: {
    id: number;
    exerciseId: number;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  };
}

export interface QuestionPreview {
  id: number;
  questionText: string;
  exerciseType: string;
}

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  exerciseIds: number[];
  timeLimitMinutes: number | null;
  maxAttempts: number;
  attemptCount?: number;
  bestScore?: number;
  createdAt: string;
  questionPreviews?: QuestionPreview[];
}

export interface QuizStartResponse {
  attemptId: number;
  exercises: Exercise[];
}

export interface QuizSubmitResponse {
  score: number;
  totalQuestions: number;
  xpAwarded?: number;
  isPerfect?: boolean;
  results: {
    exerciseId: number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  startedAt: string;
  completedAt: string | null;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  isPassed: boolean;
  timeSpentSeconds: number;
}

export interface AttemptDetailResult {
  exerciseId: number;
  questionText: string;
  exerciseType: string;
  options: string[] | null;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizAttemptDetail extends QuizAttempt {
  quizTitle: string;
  results: AttemptDetailResult[];
}

// Exercise Session types
export type ExerciseType =
  | 'multiple_choice' | 'fill_blank' | 'translation'
  | 'sentence_building' | 'matching' | 'spelling'
  | 'listening' | 'error_correction' | 'verb_conjugation' | 'cloze';

export interface SessionExercise {
  id: number;
  exerciseType: ExerciseType;
  questionText: string;
  options: string[] | null;
  difficultyLevel: string;
  questionOrder: number;
  exerciseData?: unknown; // Type-specific data for new exercise types
  audioUrl?: string; // Audio URL for listening/spelling exercises
}

export interface ExerciseSessionStart {
  sessionId: number;
  exercises: SessionExercise[];
  startedAt: string;
}

export interface SessionAnswer {
  exerciseId: number;
  questionOrder: number;
  exerciseType: string;
  questionText: string;
  options: string[] | null;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface SessionResult {
  sessionId: number;
  score: number;
  total: number;
  percentage: number;
  timeSpent: number;
  xpAwarded?: number;
  results: SessionAnswer[];
}

export interface ExerciseSession {
  id: number;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSeconds: number;
  scorePercentage: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  exerciseTypes: string[];
  startedAt: string;
  completedAt: string | null;
}

export interface UserStats {
  totalConversations: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;
  totalQuizzes: number;
  correctRate: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

// ============================================================
// Spaced Repetition / Review Types
// ============================================================

export type ReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
export type ReviewType = 'flashcard' | 'quiz' | 'exercise';
export type FlashcardDirection = 'vi_to_en' | 'en_to_vi' | 'mixed';
export type QueuePriority = 'overdue' | 'due' | 'new';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface QueueItem {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic: string | null;
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  partOfSpeech: string | null;
  difficultyLevel: string;
  cefrLevel: string | null;
  definitions: Definition[] | null;
  reviewStatus: ReviewStatus;
  easeFactor: number;
  reviewInterval: number;
  nextReviewAt: Date | null;
  priority: QueuePriority;
}

export interface QueueStats {
  due: number;
  overdue: number;
  new: number;
  completed: number;
  total: number;
}

export interface ReviewResult {
  success: boolean;
  nextReviewAt: Date;
  newInterval: number;
  newEaseFactor: number;
  newStatus: ReviewStatus;
  intervalText: string;
  xpAwarded?: number;
}

export interface BatchReviewResult {
  success: boolean;
  processed: number;
  results: Array<{
    vocabularyId: number;
    nextReviewAt: Date;
    newStatus: ReviewStatus;
  }>;
}

export interface ReviewStats {
  dueToday: number;
  overdueCount: number;
  newAvailable: number;
  completedToday: number;
  totalReviews: number;
  averageEaseFactor: number;
  masteredCount: number;
  learningCount: number;
  reviewingCount: number;
}

export interface ReviewHistoryItem {
  id: number;
  vocabularyId: number;
  englishWord: string;
  vietnameseWord: string;
  quality: number;
  qualityLabel: string;
  easeFactorBefore: number;
  easeFactorAfter: number;
  intervalBefore: number;
  intervalAfter: number;
  reviewType: ReviewType;
  direction: 'vi_to_en' | 'en_to_vi';
  timeSpentSeconds: number;
  reviewedAt: Date;
}

export interface ReviewHistoryResponse {
  data: ReviewHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewStreak {
  currentStreak: number;
  longestStreak: number;
  lastReviewDate: Date | null;
  streakStartDate: Date | null;
  totalReviewDays: number;
}

export interface LearningGoals {
  id: number;
  userId: number;
  dailyNewWords: number;
  dailyReviews: number;
  reminderEnabled: boolean;
  reminderTime: string;
  preferredDirection: FlashcardDirection;
  isActive: boolean;
}

export interface LearningGoalsUpdate {
  dailyNewWords?: number;
  dailyReviews?: number;
  reminderEnabled?: boolean;
  reminderTime?: string;
  preferredDirection?: FlashcardDirection;
}

export interface PeriodReport {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalDaysActive: number;
    totalConversations: number;
    totalVocabulary: number;
    totalExercises: number;
    totalQuizzes: number;
    averageCorrectRate: number;
    totalTimeSpentMinutes: number;
  };
  dailyBreakdown: {
    date: string;
    conversationsAdded: number;
    vocabularyLearned: number;
    exercisesCompleted: number;
    correctAnswers: number;
    quizzesCompleted: number;
    timeSpentMinutes: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Conversations
  getConversations(page = 1, limit = 10): Observable<PaginatedResponse<Conversation>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Conversation>>(`${this.baseUrl}/conversations`, { params });
  }

  getConversation(id: number): Observable<ConversationDetail> {
    return this.http.get<ConversationDetail>(`${this.baseUrl}/conversations/${id}`);
  }

  // Vocabulary
  getVocabulary(page = 1, limit = 20, filters?: {
    difficulty?: string;
    partOfSpeech?: string;
    mastery?: number;
    cefr?: string;
    search?: string;
  }): Observable<PaginatedResponse<Vocabulary>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters?.partOfSpeech) params = params.set('partOfSpeech', filters.partOfSpeech);
    if (filters?.mastery !== undefined) params = params.set('mastery', filters.mastery);
    if (filters?.cefr) params = params.set('cefr', filters.cefr);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<PaginatedResponse<Vocabulary>>(`${this.baseUrl}/vocabulary`, { params });
  }

  // NEW: Search vocabulary
  searchVocabulary(query: string, options?: {
    partOfSpeech?: string;
    cefr?: string;
    limit?: number;
  }): Observable<Vocabulary[]> {
    let params = new HttpParams().set('q', query);
    if (options?.partOfSpeech) params = params.set('partOfSpeech', options.partOfSpeech);
    if (options?.cefr) params = params.set('cefr', options.cefr);
    if (options?.limit) params = params.set('limit', options.limit);
    return this.http.get<Vocabulary[]>(`${this.baseUrl}/vocabulary/search`, { params });
  }

  getVocabularyForReview(limit = 10): Observable<Vocabulary[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<Vocabulary[]>(`${this.baseUrl}/vocabulary/review`, { params });
  }

  // NEW: Get full dictionary entry
  getDictionaryEntry(id: number): Observable<DictionaryEntry> {
    return this.http.get<DictionaryEntry>(`${this.baseUrl}/vocabulary/${id}/detail`);
  }

  // NEW: Get dictionary entry by word
  getDictionaryByWord(word: string): Observable<DictionaryEntry> {
    return this.http.get<DictionaryEntry>(`${this.baseUrl}/vocabulary/word/${encodeURIComponent(word)}`);
  }

  // NEW: Get related words
  getRelatedWords(id: number): Observable<RelatedWords> {
    return this.http.get<RelatedWords>(`${this.baseUrl}/vocabulary/${id}/related`);
  }

  reviewVocabulary(id: number, correct: boolean): Observable<Vocabulary> {
    return this.http.post<Vocabulary>(`${this.baseUrl}/vocabulary/${id}/review`, { correct });
  }

  // Exercises
  getExercises(page = 1, limit = 20, filters?: {
    type?: string;
    difficulty?: string;
    conversationId?: number;
  }): Observable<PaginatedResponse<Exercise>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters?.conversationId) params = params.set('conversationId', filters.conversationId.toString());
    return this.http.get<PaginatedResponse<Exercise>>(`${this.baseUrl}/exercises`, { params });
  }

  getExerciseCountsByConversation(): Observable<{ conversationId: number | null; count: number }[]> {
    return this.http.get<{ conversationId: number | null; count: number }[]>(
      `${this.baseUrl}/exercises/counts-by-conversation`
    );
  }

  getRandomExercises(count = 10, types?: string[]): Observable<Exercise[]> {
    let params = new HttpParams().set('count', count);
    if (types?.length) params = params.set('types', types.join(','));
    return this.http.get<Exercise[]>(`${this.baseUrl}/exercises/random`, { params });
  }

  submitExercise(id: number, answer: string, timeSpentSeconds: number): Observable<ExerciseResult> {
    return this.http.post<ExerciseResult>(`${this.baseUrl}/exercises/${id}/submit`, {
      answer,
      timeSpentSeconds
    });
  }

  // Exercise Sessions
  startExerciseSession(count = 10, exerciseTypes?: string[]): Observable<ExerciseSessionStart> {
    return this.http.post<ExerciseSessionStart>(`${this.baseUrl}/exercises/sessions`, {
      count,
      exerciseTypes
    });
  }

  submitExerciseSession(sessionId: number, answers: Record<string, string>, totalTimeSeconds: number): Observable<SessionResult> {
    return this.http.post<SessionResult>(`${this.baseUrl}/exercises/sessions/${sessionId}/submit`, {
      answers,
      totalTimeSeconds
    });
  }

  getExerciseSessionHistory(page = 1, limit = 10): Observable<PaginatedResponse<ExerciseSession>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<ExerciseSession>>(`${this.baseUrl}/exercises/sessions/history`, { params });
  }

  getExerciseSessionDetail(sessionId: number): Observable<SessionResult> {
    return this.http.get<SessionResult>(`${this.baseUrl}/exercises/sessions/${sessionId}/detail`);
  }

  abandonExerciseSession(sessionId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/exercises/sessions/${sessionId}/abandon`, {});
  }

  // Quizzes
  getQuizzes(page = 1, limit = 10): Observable<PaginatedResponse<Quiz>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Quiz>>(`${this.baseUrl}/quizzes`, { params });
  }

  getQuiz(id: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.baseUrl}/quizzes/${id}`);
  }

  createQuiz(data: {
    title: string;
    description?: string;
    exerciseIds: number[];
    timeLimitMinutes?: number;
    maxAttempts?: number;
  }): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.baseUrl}/quizzes`, data);
  }

  startQuiz(id: number): Observable<QuizStartResponse> {
    return this.http.post<QuizStartResponse>(`${this.baseUrl}/quizzes/${id}/start`, {});
  }

  submitQuiz(id: number, attemptId: number, answers: Record<string, string>, timeSpentSeconds: number): Observable<QuizSubmitResponse> {
    const params = new HttpParams().set('attemptId', attemptId);
    return this.http.post<QuizSubmitResponse>(`${this.baseUrl}/quizzes/${id}/submit`, {
      answers,
      timeSpentSeconds
    }, { params });
  }

  deleteQuiz(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/quizzes/${id}`);
  }

  getQuizAttempts(quizId: number): Observable<QuizAttempt[]> {
    return this.http.get<QuizAttempt[]>(`${this.baseUrl}/quizzes/${quizId}/attempts`);
  }

  getQuizAttemptDetail(quizId: number, attemptId: number): Observable<QuizAttemptDetail> {
    return this.http.get<QuizAttemptDetail>(`${this.baseUrl}/quizzes/${quizId}/attempts/${attemptId}`);
  }

  // Stats
  getStatsOverview(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.baseUrl}/stats/overview`);
  }

  getWeeklyReport(): Observable<PeriodReport> {
    return this.http.get<PeriodReport>(`${this.baseUrl}/stats/weekly`);
  }

  getMonthlyReport(): Observable<PeriodReport> {
    return this.http.get<PeriodReport>(`${this.baseUrl}/stats/monthly`);
  }

  // ============================================================
  // Spaced Repetition / Review API
  // ============================================================

  // Get today's review queue
  getReviewQueue(includeCompleted = false): Observable<QueueItem[]> {
    const params = new HttpParams().set('includeCompleted', includeCompleted);
    return this.http.get<QueueItem[]>(`${this.baseUrl}/review/queue`, { params });
  }

  // Get queue statistics
  getQueueStats(): Observable<QueueStats> {
    return this.http.get<QueueStats>(`${this.baseUrl}/review/queue/stats`);
  }

  // Rebuild daily queue
  rebuildQueue(): Observable<{ message: string; stats: QueueStats }> {
    return this.http.post<{ message: string; stats: QueueStats }>(`${this.baseUrl}/review/queue/rebuild`, {});
  }

  // Submit a single review
  submitReview(data: {
    vocabularyId: number;
    rating: ReviewRating;
    direction?: 'vi_to_en' | 'en_to_vi';
    timeSpentSeconds?: number;
    reviewType?: ReviewType;
  }): Observable<ReviewResult> {
    return this.http.post<ReviewResult>(`${this.baseUrl}/review/submit`, data);
  }

  // Submit batch reviews
  submitBatchReviews(data: {
    reviews: Array<{ vocabularyId: number; rating: ReviewRating; timeSpentSeconds?: number }>;
    reviewType?: ReviewType;
  }): Observable<BatchReviewResult> {
    return this.http.post<BatchReviewResult>(`${this.baseUrl}/review/submit-batch`, data);
  }

  // Get review statistics
  getReviewStats(): Observable<ReviewStats> {
    return this.http.get<ReviewStats>(`${this.baseUrl}/review/stats`);
  }

  // Get review history
  getReviewHistory(page = 1, limit = 20): Observable<ReviewHistoryResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ReviewHistoryResponse>(`${this.baseUrl}/review/history`, { params });
  }

  // Get review streak
  getReviewStreak(): Observable<ReviewStreak> {
    return this.http.get<ReviewStreak>(`${this.baseUrl}/review/streak`);
  }

  // Get learning goals
  getLearningGoals(): Observable<LearningGoals> {
    return this.http.get<LearningGoals>(`${this.baseUrl}/review/goals`);
  }

  // Update learning goals
  updateLearningGoals(data: LearningGoalsUpdate): Observable<LearningGoals> {
    return this.http.put<LearningGoals>(`${this.baseUrl}/review/goals`, data);
  }

  // ============================================================
  // Gamification
  // ============================================================

  // Get XP and level info
  getXPStatus(): Observable<UserXPStatus> {
    return this.http.get<UserXPStatus>(`${this.baseUrl}/gamification/xp`);
  }

  // Get all achievements with progress
  getAchievements(): Observable<UserAchievementInfo[]> {
    interface ApiAchievementItem {
      id: number;
      achievementId: number;
      achievement: {
        achievementCode: string;
        name: string;
        description: string;
        category: string;
        icon: string;
        xpReward: number;
      };
      unlockedAt?: string;
      progressValue: number;
      progressTarget: number;
      isUnlocked: boolean;
      notified: number;
    }
    return this.http.get<{ unlocked: ApiAchievementItem[]; locked: ApiAchievementItem[] }>(`${this.baseUrl}/gamification/achievements`).pipe(
      map(response => {
        const mapItem = (item: ApiAchievementItem): UserAchievementInfo => ({
          id: item.id,
          achievementCode: item.achievement.achievementCode,
          name: item.achievement.name,
          description: item.achievement.description,
          category: item.achievement.category as UserAchievementInfo['category'],
          icon: item.achievement.icon,
          xpReward: item.achievement.xpReward,
          isUnlocked: item.isUnlocked,
          unlockedAt: item.unlockedAt,
          progressValue: item.progressValue,
          progressTarget: item.progressTarget,
          progressPercentage: item.progressTarget > 0 ? Math.round((item.progressValue / item.progressTarget) * 100) : 0,
          isNew: item.isUnlocked && item.notified === 0,
        });
        return [
          ...(response.unlocked || []).map(mapItem),
          ...(response.locked || []).map(mapItem)
        ];
      })
    );
  }

  // Mark achievement notification as seen
  markAchievementSeen(achievementId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/gamification/achievements/${achievementId}/seen`, {});
  }

  // Get today's challenges
  getDailyChallenges(): Observable<DailyChallengeInfo[]> {
    return this.http.get<Array<{
      id: number;
      template: { challengeType: string; name: string; description: string };
      status: string;
      currentProgress: number;
      targetValue: number;
      xpReward: number;
      expiresAt: string;
      completedAt?: string;
    }>>(`${this.baseUrl}/gamification/challenges`).pipe(
      map(challenges => challenges.map(c => ({
        id: c.id,
        name: c.template.name,
        description: c.template.description,
        challengeType: c.template.challengeType,
        status: c.status as DailyChallengeInfo['status'],
        currentProgress: c.currentProgress,
        targetValue: c.targetValue,
        xpReward: c.xpReward,
        progressPercentage: c.targetValue > 0 ? Math.round((c.currentProgress / c.targetValue) * 100) : 0,
        expiresAt: c.expiresAt,
        completedAt: c.completedAt,
      })))
    );
  }

  // Get weekly leaderboard
  getLeaderboard(): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>(`${this.baseUrl}/gamification/leaderboard`);
  }

  // Get notifications
  getNotifications(unreadOnly = false): Observable<GamificationNotification[]> {
    const params = new HttpParams().set('unreadOnly', unreadOnly);
    return this.http.get<GamificationNotification[]>(`${this.baseUrl}/gamification/notifications`, { params });
  }

  // Get notification badge count
  getNotificationBadge(): Observable<NotificationBadgeInfo> {
    return this.http.get<NotificationBadgeInfo>(`${this.baseUrl}/gamification/notifications/badge`);
  }

  // Mark notification as read
  markNotificationRead(notificationId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/gamification/notifications/${notificationId}/read`, {});
  }

  // Mark all notifications as read
  markAllNotificationsRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/gamification/notifications/read-all`, {});
  }

  // Get gamification summary for dashboard
  getGamificationSummary(): Observable<GamificationDashboard> {
    return this.http.get<GamificationDashboard>(`${this.baseUrl}/gamification/summary`);
  }

  // ============================================================
  // Grammar
  // ============================================================

  // Get grammar points list with filters
  getGrammarPoints(filters?: GrammarFilters): Observable<GrammarPointInfo[]> {
    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.reviewStatus) params = params.set('reviewStatus', filters.reviewStatus);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.conversationId) params = params.set('conversationId', filters.conversationId.toString());
    return this.http.get<GrammarPointInfo[]>(`${this.baseUrl}/grammar`, { params });
  }

  // Get single grammar point detail
  getGrammarPoint(id: number): Observable<GrammarPointDetail> {
    return this.http.get<GrammarPointDetail>(`${this.baseUrl}/grammar/${id}`);
  }

  // Get grammar review queue (SM2)
  getGrammarReviewQueue(): Observable<GrammarReviewQueueResponse> {
    return this.http.get<GrammarReviewQueueResponse>(`${this.baseUrl}/grammar/review/queue`);
  }

  // Submit grammar review (SM2)
  submitGrammarReview(grammarPointId: number, quality: number): Observable<GrammarReviewResult> {
    return this.http.post<GrammarReviewResult>(`${this.baseUrl}/grammar/review/submit`, {
      grammarPointId,
      quality
    });
  }

  // Get grammar statistics
  getGrammarStats(): Observable<GrammarStatsResponse> {
    return this.http.get<{
      totalGrammarPoints: number;
      masteredCount: number;
      reviewingCount: number;
      learningCount: number;
      newCount: number;
      averageMastery: number;
      dueToday: number;
      overdueCount: number;
    }>(`${this.baseUrl}/grammar/stats/overview`).pipe(
      map(response => ({
        total: response.totalGrammarPoints,
        byStatus: {
          new: response.newCount,
          learning: response.learningCount,
          reviewing: response.reviewingCount,
          mastered: response.masteredCount,
        },
        byCategory: [],
        averageMastery: response.averageMastery,
        reviewsDueToday: response.dueToday + response.overdueCount,
        streakDays: 0,
      }))
    );
  }

  // Get grammar exercises
  getGrammarExercises(filters?: GrammarExerciseFilters): Observable<GrammarExerciseInfo[]> {
    let params = new HttpParams();
    if (filters?.grammarPointId) params = params.set('grammarPointId', filters.grammarPointId.toString());
    if (filters?.exerciseType) params = params.set('exerciseType', filters.exerciseType);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    return this.http.get<GrammarExerciseInfo[]>(`${this.baseUrl}/grammar/exercises`, { params });
  }

  // Submit grammar exercise answer
  submitGrammarExercise(exerciseId: number, answer: string | string[]): Observable<GrammarExerciseResult> {
    return this.http.post<GrammarExerciseResult>(`${this.baseUrl}/grammar/exercises/${exerciseId}/submit`, {
      answer
    });
  }

  // Get grammar categories
  getGrammarCategories(): Observable<GrammarCategoryInfo[]> {
    return this.http.get<GrammarCategoryInfo[]>(`${this.baseUrl}/grammar/categories`);
  }
}

// ============================================================
// Gamification Types
// ============================================================

export interface UserXPStatus {
  totalXp: number;
  currentLevel: number;
  title: string;
  xpToNextLevel: number;
  xpForCurrentLevel: number;
  progressPercentage: number;
  nextLevelTitle?: string;
}

export interface UserAchievementInfo {
  id: number;
  achievementCode: string;
  name: string;
  description: string;
  category: 'learning' | 'streak' | 'quiz' | 'speed' | 'milestone';
  icon: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressValue: number;
  progressTarget: number;
  progressPercentage: number;
  isNew: boolean; // Not yet notified
}

export interface DailyChallengeInfo {
  id: number;
  name: string;
  description: string;
  challengeType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  currentProgress: number;
  targetValue: number;
  xpReward: number;
  progressPercentage: number;
  expiresAt: string;
  completedAt?: string;
}

export interface LeaderboardEntry {
  rankPosition: number;
  userId: number;
  username: string;
  displayName?: string;
  nickname?: string;
  avatar?: string;
  totalXp: number;
  level: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  weekStart: string;
  weekEnd: string;
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  totalParticipants: number;
}

export interface GamificationNotification {
  id: number;
  notificationType: 'achievement' | 'level_up' | 'challenge' | 'streak' | 'leaderboard';
  title: string;
  message: string;
  icon?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationBadgeInfo {
  unreadCount: number;
  hasNewAchievements: boolean;
  hasNewChallenges: boolean;
}

export interface GamificationDashboard {
  xp: UserXPStatus;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastReviewDate?: string;
  };
  todaysChallenges: DailyChallengeInfo[];
  recentAchievements: UserAchievementInfo[];
  leaderboardRank?: number;
  notificationBadge: NotificationBadgeInfo;
}

// ============================================================
// Grammar Types
// ============================================================

export type GrammarReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export type GrammarExerciseType =
  | 'error_correction'
  | 'verb_conjugation'
  | 'tense_selection'
  | 'article_usage'
  | 'preposition_fill'
  | 'sentence_transformation'
  | 'word_order';

export interface GrammarFilters {
  category?: string;
  reviewStatus?: GrammarReviewStatus;
  search?: string;
  conversationId?: number;
}

export interface GrammarPointInfo {
  id: number;
  grammarRule: string;
  explanation: string;
  category: string;
  exampleEn?: string;
  exampleVi?: string;
  conversationId?: number;
  reviewStatus: GrammarReviewStatus;
  masteryLevel: number;
  nextReviewAt?: string;
  reviewInterval: number;
  easeFactor: number;
  repetitionCount: number;
  lastReviewedAt?: string;
  createdAt: string;
}

export interface GrammarPointDetail extends GrammarPointInfo {
  examples: { en: string; vi: string }[];
  relatedRules: string[];
  commonMistakes: string[];
  usageNotes?: string;
}

export interface GrammarReviewQueueResponse {
  date: string;
  overdue: GrammarQueueItem[];
  due: GrammarQueueItem[];
  newItems: GrammarQueueItem[];
  totalCount: number;
  completedCount: number;
  stats: {
    overdueCount: number;
    dueCount: number;
    newCount: number;
  };
}

export interface GrammarQueueItem {
  id: number;
  grammarPointId: number;
  grammarPoint: {
    id: number;
    grammarRule: string;
    explanation: string;
    category?: string;
    exampleEn?: string;
    exampleVi?: string;
    reviewStatus: GrammarReviewStatus;
    masteryLevel: number;
  };
  priority: 'overdue' | 'due' | 'new';
  queueOrder: number;
  isCompleted: boolean;
}

export interface GrammarReviewResult {
  success: boolean;
  newInterval: number;
  newEaseFactor: number;
  newStatus: GrammarReviewStatus;
  nextReviewAt: string;
  masteryLevel: number;
  xpEarned?: number;
}

export interface GrammarStatsResponse {
  total: number;
  byStatus: {
    new: number;
    learning: number;
    reviewing: number;
    mastered: number;
  };
  byCategory: { category: string; count: number }[];
  averageMastery: number;
  reviewsDueToday: number;
  streakDays: number;
}

export interface GrammarExerciseFilters {
  grammarPointId?: number;
  exerciseType?: GrammarExerciseType;
  category?: string;
  limit?: number;
}

export interface GrammarExerciseInfo {
  id: number;
  grammarPointId?: number;
  exerciseType: GrammarExerciseType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  category?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface GrammarExerciseResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  xpEarned?: number;
}

export interface GrammarCategoryInfo {
  category: string;
  count: number;
  masteredCount: number;
  reviewingCount: number;
}
