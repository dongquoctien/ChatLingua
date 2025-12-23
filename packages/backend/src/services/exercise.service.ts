import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ExerciseRow extends RowDataPacket {
  id: number;
  conversation_id: number | null;
  user_id: number;
  exercise_type: 'multiple_choice' | 'fill_blank' | 'translation';
  question: string;
  options: string | string[] | null;
  correct_answer: string;
  explanation: string | null;
  related_vocabulary_ids: string | number[] | null;
  related_grammar_ids: string | number[] | null;
  difficulty_level: string;
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
  exerciseType: 'multiple_choice' | 'fill_blank' | 'translation';
  questionText: string;
  options: string[] | null;
  correctAnswer?: string; // Only included after answer is submitted
  explanation?: string | null;
  difficultyLevel: string;
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
  exerciseTypes?: ('multiple_choice' | 'fill_blank' | 'translation')[];
  count?: number;
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
    userAnswer: string,
    timeSpentSeconds: number
  ): Promise<{ isCorrect: boolean; correctAnswer: string; attempt: ExerciseAttempt }> {
    // Get exercise
    const [exercises] = await pool.execute<ExerciseRow[]>(
      `SELECT * FROM exercises WHERE id = ? AND user_id = ?`,
      [exerciseId, userId]
    );

    if (exercises.length === 0) {
      throw new Error('Exercise not found');
    }

    const exercise = exercises[0];
    const isCorrect = userAnswer.trim().toLowerCase() === exercise.correct_answer.trim().toLowerCase();

    // Save attempt
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO exercise_attempts (exercise_id, user_id, user_answer, is_correct, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [exerciseId, userId, userAnswer, isCorrect, timeSpentSeconds]
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

    const attempt: ExerciseAttempt = {
      id: result.insertId,
      exerciseId,
      userAnswer,
      isCorrect,
      timeSpentSeconds,
      attemptedAt: new Date(),
    };

    return {
      isCorrect,
      correctAnswer: exercise.correct_answer,
      attempt,
    };
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
      createdAt: row.created_at,
    };
  };
}

export const exerciseService = new ExerciseService();
