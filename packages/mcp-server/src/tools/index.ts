import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseConnection } from '../database/connection';

import { analyzeConversation, analyzeConversationTool } from './analyze-conversation';
import { enrichVocabulary, enrichVocabularyTool } from './enrich-vocabulary';
import { getVocabularyList, getVocabularyListTool } from './get-vocabulary-list';
import { generateExercises, generateExercisesTool } from './generate-exercises';
import { saveExerciseResult, saveExerciseResultTool } from './save-exercise-result';
import { getLearningSummary, getLearningSummaryTool } from './get-learning-summary';
import { getExerciseHistory, getExerciseHistoryTool } from './get-exercise-history';
import { saveExerciseSession, saveExerciseSessionTool } from './save-exercise-session';
import { getReviewQueue, getReviewQueueTool } from './get-review-queue';
import { submitReview, submitReviewTool } from './submit-review';

// Grammar tools
import { generateGrammarExercises, generateGrammarExercisesTool } from './generate-grammar-exercises';
import { getGrammarList, getGrammarListTool } from './get-grammar-list';
import { submitGrammarReview, submitGrammarReviewTool } from './submit-grammar-review';
import { getGrammarReviewQueue, getGrammarReviewQueueTool } from './get-grammar-review-queue';

// Auth tools
import { login, loginTool, loginStatus, loginStatusTool, getAuthStatus, getAuthStatusTool } from './login';

// Export all tool definitions
// Order matters for Claude's understanding of the flow:
// Auth tools first (so user can login)
// Then learning flow tools
export const tools: Tool[] = [
  // Auth tools
  loginTool,
  loginStatusTool,
  getAuthStatusTool,
  // Learning flow
  analyzeConversationTool,
  enrichVocabularyTool,
  generateExercisesTool,
  getVocabularyListTool,
  saveExerciseResultTool,
  saveExerciseSessionTool,
  getLearningSummaryTool,
  getExerciseHistoryTool,
  // Spaced Repetition tools (Vocabulary)
  getReviewQueueTool,
  submitReviewTool,
  // Grammar tools
  generateGrammarExercisesTool,
  getGrammarListTool,
  getGrammarReviewQueueTool,
  submitGrammarReviewTool,
];

// Tool handler router
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  db: DatabaseConnection,
  resolvedUserId: number
): Promise<unknown> {
  // Inject the resolved userId into args (tools can still override if explicitly provided)
  const argsWithUser = { ...args, _resolvedUserId: resolvedUserId };

  switch (name) {
    // Auth tools
    case 'login':
      return login(argsWithUser, db);
    case 'login_status':
      return loginStatus(argsWithUser, db);
    case 'get_auth_status':
      return getAuthStatus(argsWithUser, db);
    // Learning flow tools
    case 'analyze_conversation':
      return analyzeConversation(argsWithUser, db);
    case 'enrich_vocabulary':
      return enrichVocabulary(argsWithUser, db);
    case 'get_vocabulary_list':
      return getVocabularyList(argsWithUser, db);
    case 'generate_exercises':
      return generateExercises(argsWithUser, db);
    case 'save_exercise_result':
      return saveExerciseResult(argsWithUser, db);
    case 'save_exercise_session':
      return saveExerciseSession(argsWithUser, db);
    case 'get_learning_summary':
      return getLearningSummary(argsWithUser, db);
    case 'get_exercise_history':
      return getExerciseHistory(argsWithUser, db);
    case 'get_review_queue':
      return getReviewQueue(argsWithUser, db);
    case 'submit_review':
      return submitReview(argsWithUser, db);
    // Grammar tools
    case 'generate_grammar_exercises':
      return generateGrammarExercises(argsWithUser, db);
    case 'get_grammar_list':
      return getGrammarList(argsWithUser, db);
    case 'get_grammar_review_queue':
      return getGrammarReviewQueue(argsWithUser, db);
    case 'submit_grammar_review':
      return submitGrammarReview(argsWithUser, db);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
