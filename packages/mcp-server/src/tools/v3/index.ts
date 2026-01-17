// V3 MCP Tools - Word Map System
// ============================================================

// Export all tool definitions and implementations

// Word Map Management Tools
export {
  getWordMapsTool,
  getWordMapDetailTool,
  activateWordMapTool,
  getLessonContentTool,
  completeLessonStudyTool,
  getWordMaps,
  getWordMapDetail,
  activateWordMap,
  getLessonContent,
  completeLessonStudy,
} from './word-map-tools.js';

// Exam Tools
export {
  startLessonExamTool,
  submitExamAnswersTool,
  getExamResultsTool,
  getExamHistoryTool,
  startLessonExam,
  submitExamAnswers,
  getExamResults,
  getExamHistory,
} from './exam-tools.js';

// Progress Tracking Tools
export {
  getUserProgressTool,
  getVocabularyReviewQueueTool,
  submitVocabularyReviewTool,
  getLeaderboardTool,
  getStudyStatsTool,
  getUserProgress,
  getVocabularyReviewQueue,
  submitVocabularyReview,
  getLeaderboard,
  getStudyStats,
} from './progress-tools.js';

// Content Import Tools (Admin)
export {
  importVocabularyTool,
  importGrammarTool,
  importExercisesTool,
  createWordMapTool,
  addLessonContentTool,
  importAudioTracksTool,
  importEvolveContentTool,
  parsePdfStructureTool,
  linkMediaResourceTool,
  importVocabulary,
  importGrammar,
  importExercises,
  createWordMap,
  addLessonContent,
  importAudioTracks,
  importEvolveContent,
  parsePdfStructure,
  linkMediaResource,
} from './content-import-tools.js';

// Media Sync Tools (Admin)
export {
  syncMediaFilesTool,
  listMediaFilesTool,
  validateMediaUrlsTool,
  syncMediaFiles,
  listMediaFiles,
  validateMediaUrls,
} from './media-sync-tools.js';

// All V3 Tool Definitions Array
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  getWordMapsTool,
  getWordMapDetailTool,
  activateWordMapTool,
  getLessonContentTool,
  completeLessonStudyTool,
} from './word-map-tools.js';
import {
  startLessonExamTool,
  submitExamAnswersTool,
  getExamResultsTool,
  getExamHistoryTool,
} from './exam-tools.js';
import {
  getUserProgressTool,
  getVocabularyReviewQueueTool,
  submitVocabularyReviewTool,
  getLeaderboardTool,
  getStudyStatsTool,
} from './progress-tools.js';
import {
  importVocabularyTool,
  importGrammarTool,
  importExercisesTool,
  createWordMapTool,
  addLessonContentTool,
  importAudioTracksTool,
  importEvolveContentTool,
  parsePdfStructureTool,
  linkMediaResourceTool,
} from './content-import-tools.js';
import {
  syncMediaFilesTool,
  listMediaFilesTool,
  validateMediaUrlsTool,
} from './media-sync-tools.js';

export const v3Tools: Tool[] = [
  // Word Map Management
  getWordMapsTool,
  getWordMapDetailTool,
  activateWordMapTool,
  getLessonContentTool,
  completeLessonStudyTool,

  // Exam
  startLessonExamTool,
  submitExamAnswersTool,
  getExamResultsTool,
  getExamHistoryTool,

  // Progress Tracking
  getUserProgressTool,
  getVocabularyReviewQueueTool,
  submitVocabularyReviewTool,
  getLeaderboardTool,
  getStudyStatsTool,

  // Content Import (Admin)
  importVocabularyTool,
  importGrammarTool,
  importExercisesTool,
  createWordMapTool,
  addLessonContentTool,
  importAudioTracksTool,
  importEvolveContentTool,
  parsePdfStructureTool,
  linkMediaResourceTool,

  // Media Sync (Admin)
  syncMediaFilesTool,
  listMediaFilesTool,
  validateMediaUrlsTool,
];

// V3 Tool Handler Map
import { DatabaseConnection } from '../../database/connection.js';
import {
  getWordMaps,
  getWordMapDetail,
  activateWordMap,
  getLessonContent,
  completeLessonStudy,
} from './word-map-tools.js';
import {
  startLessonExam,
  submitExamAnswers,
  getExamResults,
  getExamHistory,
} from './exam-tools.js';
import {
  getUserProgress,
  getVocabularyReviewQueue,
  submitVocabularyReview,
  getLeaderboard,
  getStudyStats,
} from './progress-tools.js';
import {
  importVocabulary,
  importGrammar,
  importExercises,
  createWordMap,
  addLessonContent,
  importAudioTracks,
  importEvolveContent,
  parsePdfStructure,
  linkMediaResource,
} from './content-import-tools.js';
import {
  syncMediaFiles,
  listMediaFiles,
  validateMediaUrls,
} from './media-sync-tools.js';

export type V3ToolHandler = (
  args: Record<string, unknown>,
  db: DatabaseConnection
) => Promise<unknown>;

export const v3ToolHandlers: Record<string, V3ToolHandler> = {
  // Word Map Management
  get_word_maps: getWordMaps,
  get_word_map_detail: getWordMapDetail,
  activate_word_map: activateWordMap,
  get_lesson_content: getLessonContent,
  complete_lesson_study: completeLessonStudy,

  // Exam
  start_lesson_exam: startLessonExam,
  submit_exam_answers: submitExamAnswers,
  get_exam_results: getExamResults,
  get_exam_history: getExamHistory,

  // Progress Tracking
  get_user_progress: getUserProgress,
  get_vocabulary_review_queue: getVocabularyReviewQueue,
  submit_vocabulary_review: submitVocabularyReview,
  get_leaderboard: getLeaderboard,
  get_study_stats: getStudyStats,

  // Content Import (Admin)
  import_vocabulary: importVocabulary,
  import_grammar: importGrammar,
  import_exercises: importExercises,
  create_word_map: createWordMap,
  add_lesson_content: addLessonContent,
  import_audio_tracks: importAudioTracks,
  import_evolve_content: importEvolveContent,
  parse_pdf_structure: parsePdfStructure,
  link_media_resource: linkMediaResource,

  // Media Sync (Admin)
  sync_media_files: syncMediaFiles,
  list_media_files: listMediaFiles,
  validate_media_urls: validateMediaUrls,
};
