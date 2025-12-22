import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseConnection } from '../database/connection';

import { analyzeConversation, analyzeConversationTool } from './analyze-conversation';
import { getVocabularyList, getVocabularyListTool } from './get-vocabulary-list';
import { generateExercises, generateExercisesTool } from './generate-exercises';
import { saveExerciseResult, saveExerciseResultTool } from './save-exercise-result';
import { getLearningSummary, getLearningSummaryTool } from './get-learning-summary';
import { getExerciseHistory, getExerciseHistoryTool } from './get-exercise-history';
import { saveExerciseSession, saveExerciseSessionTool } from './save-exercise-session';

// Export all tool definitions
export const tools: Tool[] = [
  analyzeConversationTool,
  getVocabularyListTool,
  generateExercisesTool,
  saveExerciseResultTool,
  saveExerciseSessionTool,
  getLearningSummaryTool,
  getExerciseHistoryTool,
];

// Tool handler router
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<unknown> {
  switch (name) {
    case 'analyze_conversation':
      return analyzeConversation(args, db);
    case 'get_vocabulary_list':
      return getVocabularyList(args, db);
    case 'generate_exercises':
      return generateExercises(args, db);
    case 'save_exercise_result':
      return saveExerciseResult(args, db);
    case 'save_exercise_session':
      return saveExerciseSession(args, db);
    case 'get_learning_summary':
      return getLearningSummary(args, db);
    case 'get_exercise_history':
      return getExerciseHistory(args, db);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
