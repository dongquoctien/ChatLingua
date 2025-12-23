import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

export const getExerciseHistoryTool: Tool = {
  name: 'get_exercise_history',
  description: `Get user's exercise practice history.
Returns a list of past exercise sessions with scores and details.
Use this to review past performance or discuss learning progress with the user.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (use 1 for default user)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of sessions to return (default: 10, max: 50)',
      },
      includeDetails: {
        type: 'boolean',
        description: 'Include detailed answers for each session (default: false)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(), // Injected by handler from user context
  limit: z.number().min(1).max(50).optional().default(10),
  includeDetails: z.boolean().optional().default(false),
});

interface SessionRow extends RowDataPacket {
  id: number;
  user_id: number;
  total_questions: number;
  correct_answers: number;
  total_time_seconds: number;
  score_percentage: number;
  status: string;
  exercise_types: string | null;
  started_at: Date;
  completed_at: Date | null;
}

interface AnswerRow extends RowDataPacket {
  exercise_id: number;
  question_order: number;
  user_answer: string | null;
  is_correct: boolean | null;
  exercise_type: string;
  question_text: string;
  correct_answer: string;
}

export async function getExerciseHistory(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  sessions: {
    id: number;
    date: string;
    score: number;
    total: number;
    percentage: number;
    timeSpent: string;
    exerciseTypes: string[];
    details?: {
      question: string;
      userAnswer: string | null;
      correctAnswer: string;
      isCorrect: boolean;
    }[];
  }[];
  summary: {
    totalSessions: number;
    averageScore: number;
    bestScore: number;
    totalExercises: number;
    totalCorrect: number;
  };
}> {
  const input = inputSchema.parse(args);

  // Use explicit userId if provided, otherwise use resolved userId from env auth, fallback to 1
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const connection = await db.getConnection();

  try {
    // Get sessions
    const [sessionRows] = await connection.query<SessionRow[]>(
      `SELECT * FROM exercise_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT ?`,
      [effectiveUserId, input.limit]
    );

    const sessions: {
      id: number;
      date: string;
      score: number;
      total: number;
      percentage: number;
      timeSpent: string;
      exerciseTypes: string[];
      details?: {
        question: string;
        userAnswer: string | null;
        correctAnswer: string;
        isCorrect: boolean;
      }[];
    }[] = [];

    let totalExercises = 0;
    let totalCorrect = 0;
    let bestScore = 0;

    for (const session of sessionRows) {
      let exerciseTypes: string[] = [];
      if (session.exercise_types) {
        try {
          const parsed = JSON.parse(session.exercise_types);
          exerciseTypes = Array.isArray(parsed) ? parsed : [];
        } catch {
          exerciseTypes = [];
        }
      }

      const sessionData: typeof sessions[0] = {
        id: session.id,
        date: session.completed_at?.toISOString() || session.started_at.toISOString(),
        score: session.correct_answers,
        total: session.total_questions,
        percentage: Number(session.score_percentage),
        timeSpent: formatTime(session.total_time_seconds),
        exerciseTypes,
      };

      totalExercises += session.total_questions;
      totalCorrect += session.correct_answers;
      if (session.score_percentage > bestScore) {
        bestScore = Number(session.score_percentage);
      }

      // Include details if requested
      if (input.includeDetails) {
        const [answerRows] = await connection.execute<AnswerRow[]>(
          `SELECT esa.*, e.exercise_type, e.question as question_text, e.correct_answer
           FROM exercise_session_answers esa
           JOIN exercises e ON esa.exercise_id = e.id
           WHERE esa.session_id = ?
           ORDER BY esa.question_order`,
          [session.id]
        );

        sessionData.details = answerRows.map(row => ({
          question: row.question_text,
          userAnswer: row.user_answer,
          correctAnswer: row.correct_answer,
          isCorrect: row.is_correct || false,
        }));
      }

      sessions.push(sessionData);
    }

    connection.release();

    const averageScore = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.percentage, 0) / sessions.length)
      : 0;

    return {
      success: true,
      sessions,
      summary: {
        totalSessions: sessions.length,
        averageScore,
        bestScore,
        totalExercises,
        totalCorrect,
      },
    };
  } catch (error) {
    connection.release();
    throw error;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
