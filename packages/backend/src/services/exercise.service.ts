import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { gamificationService } from './gamification.service.js';
import { challengeService } from './challenge.service.js';

// Extended exercise types
export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'translation'
  | 'sentence_building'
  | 'matching'
  | 'spelling'
  | 'listening'
  | 'error_correction'
  | 'verb_conjugation'
  | 'cloze';

interface ExerciseRow extends RowDataPacket {
  id: number;
  conversation_id: number | null;
  user_id: number;
  exercise_type: ExerciseType;
  question: string;
  options: string | string[] | null;
  correct_answer: string;
  explanation: string | null;
  related_vocabulary_ids: string | number[] | null;
  related_grammar_ids: string | number[] | null;
  difficulty_level: string;
  exercise_data: string | object | null;
  audio_url: string | null;
  time_limit_seconds: number | null;
  created_at: Date;
}

interface AttemptRow extends RowDataPacket {
  id: number;
  exercise_id: number;
  user_id: number;
  user_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
  attempted_at: Date;
}

export interface Exercise {
  id: number;
  conversationId: number | null;
  relatedVocabularyIds: number[] | null;
  relatedGrammarIds: number[] | null;
  exerciseType: ExerciseType;
  questionText: string;
  options: string[] | null;
  correctAnswer?: string; // Only included after answer is submitted
  explanation?: string | null;
  difficultyLevel: string;
  exerciseData?: any; // Type-specific data
  audioUrl?: string | null;
  timeLimitSeconds?: number | null;
  createdAt: Date;
}

export interface ExerciseAttempt {
  id: number;
  exerciseId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  attemptedAt: Date;
}

export interface GenerateExercisesInput {
  conversationIds?: number[];
  exerciseTypes?: ExerciseType[];
  count?: number;
}

// Grading result for complex exercise types
export interface GradingResult {
  isCorrect: boolean;
  score: number;        // 0-100 percentage
  feedback?: string;
  partialCredit?: boolean;
}

export class ExerciseService {
  async getExercises(
    userId: number,
    page: number = 1,
    limit: number = 20,
    filters: { exerciseType?: string; difficultyLevel?: string; conversationId?: number } = {}
  ): Promise<{ data: Exercise[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['e.user_id = ?'];
    const params: (string | number)[] = [userId];

    if (filters.exerciseType) {
      conditions.push('e.exercise_type = ?');
      params.push(filters.exerciseType);
    }

    if (filters.difficultyLevel) {
      conditions.push('e.difficulty_level = ?');
      params.push(filters.difficultyLevel);
    }

    if (filters.conversationId) {
      conditions.push('e.conversation_id = ?');
      params.push(filters.conversationId);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM exercises e WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get exercises
    // Note: Using query instead of execute because LIMIT/OFFSET don't work well with prepared statements
    const [rows] = await pool.query<ExerciseRow[]>(
      `SELECT e.* FROM exercises e
       WHERE ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const data = rows.map(this.mapToExercise);

    return { data, total, page, limit };
  }

  async getExerciseById(
    userId: number,
    exerciseId: number,
    includeAnswer: boolean = false
  ): Promise<Exercise | null> {
    const [rows] = await pool.execute<ExerciseRow[]>(
      `SELECT * FROM exercises WHERE id = ? AND user_id = ?`,
      [exerciseId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const exercise = this.mapToExercise(rows[0]);
    if (includeAnswer) {
      exercise.correctAnswer = rows[0].correct_answer;
      exercise.explanation = rows[0].explanation;
    }

    return exercise;
  }

  async submitAnswer(
    userId: number,
    exerciseId: number,
    userAnswer: string | object,  // Can be string or complex object for matching/cloze
    timeSpentSeconds: number
  ): Promise<{ isCorrect: boolean; correctAnswer: string; attempt: ExerciseAttempt; gradingResult?: GradingResult; xpAwarded?: number }> {
    // Get exercise
    const [exercises] = await pool.execute<ExerciseRow[]>(
      `SELECT * FROM exercises WHERE id = ? AND user_id = ?`,
      [exerciseId, userId]
    );

    if (exercises.length === 0) {
      throw new Error('Exercise not found');
    }

    const exercise = exercises[0];

    // Grade based on exercise type
    const gradingResult = this.gradeAnswer(exercise, userAnswer);
    const isCorrect = gradingResult.isCorrect;

    // Save attempt (stringify object answers)
    const answerString = typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : userAnswer;
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO exercise_attempts (exercise_id, user_id, user_answer, is_correct, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [exerciseId, userId, answerString, isCorrect, timeSpentSeconds]
    );

    // Update vocabulary mastery if applicable
    let vocabularyIds: number[] = [];
    if (exercise.related_vocabulary_ids) {
      if (Array.isArray(exercise.related_vocabulary_ids)) {
        vocabularyIds = exercise.related_vocabulary_ids;
      } else if (typeof exercise.related_vocabulary_ids === 'string') {
        try {
          const parsed = JSON.parse(exercise.related_vocabulary_ids);
          vocabularyIds = Array.isArray(parsed) ? parsed : [];
        } catch {
          vocabularyIds = [];
        }
      }
    }

    if (vocabularyIds.length > 0) {
      const masteryDelta = isCorrect ? 1 : -1;
      const placeholders = vocabularyIds.map(() => '?').join(', ');
      await pool.execute(
        `UPDATE vocabulary
         SET mastery_level = GREATEST(0, LEAST(5, mastery_level + ?)),
             times_practiced = times_practiced + 1,
             last_practiced_at = NOW()
         WHERE id IN (${placeholders})`,
        [masteryDelta, ...vocabularyIds]
      );
    }

    // Update user statistics
    await pool.execute(
      `UPDATE user_statistics
       SET total_exercises_completed = total_exercises_completed + 1,
           total_correct_answers = total_correct_answers + ?
       WHERE user_id = ?`,
      [isCorrect ? 1 : 0, userId]
    );

    // Log daily activity
    await pool.execute(
      `INSERT INTO daily_activity_log (user_id, activity_date, exercises_completed, correct_answers)
       VALUES (?, CURDATE(), 1, ?)
       ON DUPLICATE KEY UPDATE
         exercises_completed = exercises_completed + 1,
         correct_answers = correct_answers + VALUES(correct_answers)`,
      [userId, isCorrect ? 1 : 0]
    );

    // Award XP for completing exercise
    let xpAwarded = 0;
    if (isCorrect) {
      // Base XP for correct answer
      let baseXP = 5;

      // Bonus XP based on difficulty
      switch (exercise.difficulty_level) {
        case 'intermediate':
          baseXP += 2;
          break;
        case 'advanced':
          baseXP += 5;
          break;
      }

      // Bonus for partial credit (matching, cloze, etc.)
      if (gradingResult.score === 100) {
        baseXP += 2; // Perfect score bonus
      }

      xpAwarded = baseXP;

      try {
        await gamificationService.awardXP(userId, xpAwarded, 'exercise', exerciseId, `Completed exercise #${exerciseId}`);

        // Update leaderboard
        await gamificationService.updateLeaderboard(userId, { xp: xpAwarded, exercises: 1 });

        // Check achievements
        await gamificationService.checkAchievements(userId, 'exercise_complete', { isCorrect });
      } catch (error) {
        console.error('Failed to award XP:', error);
        // Don't fail the exercise submission if XP fails
      }
    }

    // Update challenge progress
    try {
      await challengeService.updateProgress(userId, 'exercise', 1);
      if (isCorrect) {
        await challengeService.updateProgress(userId, 'perfect_score', 1);
      }
    } catch (error) {
      console.error('Failed to update challenge progress:', error);
    }

    const attempt: ExerciseAttempt = {
      id: result.insertId,
      exerciseId,
      userAnswer: answerString,
      isCorrect,
      timeSpentSeconds,
      attemptedAt: new Date(),
    };

    return {
      isCorrect,
      correctAnswer: exercise.correct_answer,
      attempt,
      gradingResult,
      xpAwarded,
    };
  }

  /**
   * Grade answer based on exercise type
   */
  private gradeAnswer(exercise: ExerciseRow, userAnswer: string | object): GradingResult {
    const exerciseData = this.parseExerciseData(exercise.exercise_data);

    switch (exercise.exercise_type) {
      case 'multiple_choice':
      case 'fill_blank':
      case 'translation':
      case 'spelling':
        return this.gradeSimpleAnswer(exercise.correct_answer, userAnswer as string);

      case 'sentence_building':
        return this.gradeSentenceBuilding(exerciseData, userAnswer);

      case 'matching':
        return this.gradeMatching(exerciseData, userAnswer);

      case 'error_correction':
        return this.gradeErrorCorrection(exerciseData, userAnswer as string);

      case 'verb_conjugation':
        return this.gradeVerbConjugation(exercise.correct_answer, userAnswer as string);

      case 'cloze':
        return this.gradeCloze(exerciseData, userAnswer);

      case 'listening':
        return this.gradeListening(exerciseData, userAnswer as string);

      default:
        return this.gradeSimpleAnswer(exercise.correct_answer, userAnswer as string);
    }
  }

  /**
   * Simple string comparison grading (multiple_choice, fill_blank, translation, spelling)
   */
  private gradeSimpleAnswer(correctAnswer: string, userAnswer: string): GradingResult {
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return {
      isCorrect,
      score: isCorrect ? 100 : 0,
    };
  }

  /**
   * Grade sentence building exercise
   * User provides array of word indices in their order
   */
  private gradeSentenceBuilding(data: any, userAnswer: string | object): GradingResult {
    if (!data?.correctOrder) {
      return { isCorrect: false, score: 0, feedback: 'Invalid exercise data' };
    }

    let userOrder: number[];
    if (typeof userAnswer === 'string') {
      try {
        userOrder = JSON.parse(userAnswer);
      } catch {
        return { isCorrect: false, score: 0, feedback: 'Invalid answer format' };
      }
    } else if (Array.isArray(userAnswer)) {
      userOrder = userAnswer as number[];
    } else {
      return { isCorrect: false, score: 0, feedback: 'Invalid answer format' };
    }

    const correctOrder = data.correctOrder as number[];

    if (userOrder.length !== correctOrder.length) {
      return { isCorrect: false, score: 0, feedback: 'Incorrect number of words' };
    }

    // Count correct positions
    let correct = 0;
    for (let i = 0; i < correctOrder.length; i++) {
      if (userOrder[i] === correctOrder[i]) {
        correct++;
      }
    }

    const score = Math.round((correct / correctOrder.length) * 100);
    const isCorrect = score === 100;

    return {
      isCorrect,
      score,
      partialCredit: score > 0 && score < 100,
      feedback: isCorrect ? undefined : `${correct}/${correctOrder.length} words in correct position`,
    };
  }

  /**
   * Grade matching exercise
   * User provides array of matched pairs
   */
  private gradeMatching(data: any, userAnswer: string | object): GradingResult {
    if (!data?.pairs) {
      return { isCorrect: false, score: 0, feedback: 'Invalid exercise data' };
    }

    let userPairs: Array<{ en: string; vi: string }>;
    if (typeof userAnswer === 'string') {
      try {
        userPairs = JSON.parse(userAnswer);
      } catch {
        return { isCorrect: false, score: 0, feedback: 'Invalid answer format' };
      }
    } else if (Array.isArray(userAnswer)) {
      userPairs = userAnswer as Array<{ en: string; vi: string }>;
    } else {
      return { isCorrect: false, score: 0, feedback: 'Invalid answer format' };
    }

    const correctPairs = data.pairs as Array<{ en: string; vi: string }>;

    // Create a map of correct answers
    const correctMap = new Map<string, string>();
    correctPairs.forEach(p => correctMap.set(p.en.toLowerCase(), p.vi.toLowerCase()));

    // Count correct matches
    let correct = 0;
    for (const pair of userPairs) {
      const expected = correctMap.get(pair.en.toLowerCase());
      if (expected === pair.vi.toLowerCase()) {
        correct++;
      }
    }

    const score = Math.round((correct / correctPairs.length) * 100);
    const isCorrect = score === 100;

    return {
      isCorrect,
      score,
      partialCredit: score > 0 && score < 100,
      feedback: isCorrect ? undefined : `${correct}/${correctPairs.length} pairs matched correctly`,
    };
  }

  /**
   * Grade error correction exercise
   */
  private gradeErrorCorrection(data: any, userAnswer: string): GradingResult {
    if (!data?.correctWord) {
      return { isCorrect: false, score: 0, feedback: 'Invalid exercise data' };
    }

    const isCorrect = userAnswer.trim().toLowerCase() === data.correctWord.trim().toLowerCase();
    return {
      isCorrect,
      score: isCorrect ? 100 : 0,
    };
  }

  /**
   * Grade verb conjugation exercise
   */
  private gradeVerbConjugation(correctAnswer: string, userAnswer: string): GradingResult {
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return {
      isCorrect,
      score: isCorrect ? 100 : 0,
    };
  }

  /**
   * Grade cloze exercise (fill in multiple blanks)
   */
  private gradeCloze(data: any, userAnswer: string | object): GradingResult {
    if (!data?.blanks) {
      return { isCorrect: false, score: 0, feedback: 'Invalid exercise data' };
    }

    let userAnswers: string[];
    if (typeof userAnswer === 'string') {
      try {
        userAnswers = JSON.parse(userAnswer);
      } catch {
        userAnswers = [userAnswer];
      }
    } else if (Array.isArray(userAnswer)) {
      userAnswers = userAnswer as string[];
    } else {
      return { isCorrect: false, score: 0, feedback: 'Invalid answer format' };
    }

    const blanks = data.blanks as Array<{ index: number; answer: string }>;

    // Count correct answers
    let correct = 0;
    for (let i = 0; i < blanks.length; i++) {
      const userAns = userAnswers[i]?.trim().toLowerCase() || '';
      const correctAns = blanks[i].answer.trim().toLowerCase();
      if (userAns === correctAns) {
        correct++;
      }
    }

    const score = Math.round((correct / blanks.length) * 100);
    const isCorrect = score === 100;

    return {
      isCorrect,
      score,
      partialCredit: score > 0 && score < 100,
      feedback: isCorrect ? undefined : `${correct}/${blanks.length} blanks filled correctly`,
    };
  }

  /**
   * Grade listening exercise (dictation or comprehension)
   */
  private gradeListening(data: any, userAnswer: string): GradingResult {
    if (!data?.transcript) {
      return { isCorrect: false, score: 0, feedback: 'Invalid exercise data' };
    }

    if (data.questionType === 'dictation') {
      // For dictation, compare with transcript (allow some leniency)
      const transcript = data.transcript.trim().toLowerCase();
      const answer = userAnswer.trim().toLowerCase();

      // Exact match
      if (transcript === answer) {
        return { isCorrect: true, score: 100 };
      }

      // Calculate word-level accuracy
      const transcriptWords = transcript.split(/\s+/);
      const answerWords = answer.split(/\s+/);

      let correct = 0;
      for (let i = 0; i < Math.min(transcriptWords.length, answerWords.length); i++) {
        if (transcriptWords[i] === answerWords[i]) {
          correct++;
        }
      }

      const score = Math.round((correct / transcriptWords.length) * 100);
      const isCorrect = score >= 80; // 80% threshold for dictation

      return {
        isCorrect,
        score,
        partialCredit: score > 0 && score < 100,
        feedback: `${correct}/${transcriptWords.length} words correct`,
      };
    } else {
      // Comprehension - simple answer matching
      return this.gradeSimpleAnswer(data.transcript, userAnswer);
    }
  }

  /**
   * Parse exercise_data from JSON string or object
   */
  private parseExerciseData(data: string | object | null): any {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async getExerciseHistory(
    userId: number,
    exerciseId: number
  ): Promise<ExerciseAttempt[]> {
    const [rows] = await pool.execute<AttemptRow[]>(
      `SELECT ea.* FROM exercise_attempts ea
       WHERE ea.exercise_id = ? AND ea.user_id = ?
       ORDER BY ea.attempted_at DESC`,
      [exerciseId, userId]
    );

    return rows.map((row) => ({
      id: row.id,
      exerciseId: row.exercise_id,
      userAnswer: row.user_answer,
      isCorrect: row.is_correct,
      timeSpentSeconds: row.time_spent_seconds,
      attemptedAt: row.attempted_at,
    }));
  }

  async getRandomExercises(
    userId: number,
    count: number = 10,
    exerciseTypes?: string[]
  ): Promise<Exercise[]> {
    let typeFilter = '';
    const params: (string | number)[] = [userId];

    if (exerciseTypes && exerciseTypes.length > 0) {
      const placeholders = exerciseTypes.map(() => '?').join(', ');
      typeFilter = `AND e.exercise_type IN (${placeholders})`;
      params.push(...exerciseTypes);
    }

    params.push(Number(count));

    const [rows] = await pool.query<ExerciseRow[]>(
      `SELECT e.* FROM exercises e
       WHERE e.user_id = ? ${typeFilter}
       ORDER BY RAND()
       LIMIT ?`,
      params
    );

    return rows.map(this.mapToExercise);
  }

  async getExerciseCountsByConversation(
    userId: number
  ): Promise<{ conversationId: number | null; count: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT conversation_id, COUNT(*) as count
       FROM exercises
       WHERE user_id = ?
       GROUP BY conversation_id
       ORDER BY count DESC`,
      [userId]
    );

    return rows.map(row => ({
      conversationId: row.conversation_id as number | null,
      count: row.count as number,
    }));
  }

  private parseJsonArray = (value: string | number[] | null): number[] | null => {
    if (!value) return null;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  private mapToExercise = (row: ExerciseRow): Exercise => {
    let options: string[] | null = null;
    if (row.options) {
      // Handle both cases: JSON column returns array, TEXT column returns string
      if (Array.isArray(row.options)) {
        options = row.options;
      } else if (typeof row.options === 'string') {
        try {
          const parsed = JSON.parse(row.options);
          options = Array.isArray(parsed) ? parsed : null;
        } catch (e) {
          // options is not valid JSON, treat as null
          console.warn(`Invalid JSON in options field for exercise ${row.id}:`, row.options);
          options = null;
        }
      }
    }

    return {
      id: row.id,
      conversationId: row.conversation_id,
      relatedVocabularyIds: this.parseJsonArray(row.related_vocabulary_ids),
      relatedGrammarIds: this.parseJsonArray(row.related_grammar_ids),
      exerciseType: row.exercise_type,
      questionText: row.question,
      options,
      difficultyLevel: row.difficulty_level,
      exerciseData: this.parseExerciseData(row.exercise_data),
      audioUrl: row.audio_url,
      timeLimitSeconds: row.time_limit_seconds,
      createdAt: row.created_at,
    };
  };
}

export const exerciseService = new ExerciseService();
