/**
 * Feature Flags Configuration for Version 3 Migration
 *
 * This module provides feature flags to control the gradual migration
 * from V2 (user-owned) tables to V3 (master-user separated) tables.
 *
 * Migration Strategy:
 * 1. DUAL_WRITE_ENABLED = true: Write to both V2 and V3 tables
 * 2. USE_V3_TABLES = true: Read from V3 tables
 * 3. DEPRECATE_V2_TABLES = true: Stop writing to V2 tables
 */

// ============================================================
// Feature Flags
// ============================================================

export const FEATURE_FLAGS = {
  /**
   * Enable reading from V3 tables (master_vocabulary, user_vocabulary, etc.)
   * When false, reads still come from V2 tables (vocabulary, grammar_points, etc.)
   */
  USE_V3_TABLES: process.env.USE_V3_TABLES === 'true',

  /**
   * Enable dual-write mode: write to both V2 and V3 tables simultaneously
   * This ensures data consistency during migration period
   * Default: true (enabled by default for safe migration)
   */
  DUAL_WRITE_ENABLED: process.env.DUAL_WRITE_ENABLED !== 'false',

  /**
   * Deprecate V2 tables: stop writing to old tables
   * Only enable this after confirming V3 tables have all data
   */
  DEPRECATE_V2_TABLES: process.env.DEPRECATE_V2_TABLES === 'true',

  /**
   * Enable Word Map curriculum features
   * Controls access to Word Map routes and functionality
   */
  WORD_MAP_ENABLED: process.env.WORD_MAP_ENABLED !== 'false',

  /**
   * Enable V3 spaced repetition system
   * Uses user_vocabulary/user_grammar tables for SM2 instead of vocabulary/grammar_points
   */
  V3_SPACED_REPETITION: process.env.V3_SPACED_REPETITION === 'true',

  /**
   * Enable V3 exercise system
   * Uses master_exercises and user_exercise_attempts tables
   */
  V3_EXERCISES: process.env.V3_EXERCISES === 'true',

  /**
   * Log dual-write operations for debugging
   */
  LOG_DUAL_WRITE: process.env.LOG_DUAL_WRITE === 'true',
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if V3 tables should be used for reading data
 */
export function isV3Enabled(): boolean {
  return FEATURE_FLAGS.USE_V3_TABLES;
}

/**
 * Check if dual-write mode is enabled
 * Dual-write is active when:
 * - DUAL_WRITE_ENABLED is true
 * - DEPRECATE_V2_TABLES is false (still writing to V2)
 */
export function isDualWriteEnabled(): boolean {
  return FEATURE_FLAGS.DUAL_WRITE_ENABLED && !FEATURE_FLAGS.DEPRECATE_V2_TABLES;
}

/**
 * Check if V2 tables should still receive writes
 */
export function shouldWriteToV2(): boolean {
  return !FEATURE_FLAGS.DEPRECATE_V2_TABLES;
}

/**
 * Check if V3 tables should receive writes
 * V3 writes are enabled when either:
 * - USE_V3_TABLES is true (V3 is primary)
 * - DUAL_WRITE_ENABLED is true (writing to both)
 */
export function shouldWriteToV3(): boolean {
  return FEATURE_FLAGS.USE_V3_TABLES || FEATURE_FLAGS.DUAL_WRITE_ENABLED;
}

/**
 * Check if Word Map features are available
 */
export function isWordMapEnabled(): boolean {
  return FEATURE_FLAGS.WORD_MAP_ENABLED;
}

/**
 * Check if V3 spaced repetition system should be used
 */
export function isV3SpacedRepetitionEnabled(): boolean {
  return FEATURE_FLAGS.V3_SPACED_REPETITION || FEATURE_FLAGS.USE_V3_TABLES;
}

/**
 * Check if V3 exercise system should be used
 */
export function isV3ExercisesEnabled(): boolean {
  return FEATURE_FLAGS.V3_EXERCISES || FEATURE_FLAGS.USE_V3_TABLES;
}

/**
 * Log a dual-write operation for debugging
 */
export function logDualWrite(operation: string, details: Record<string, unknown>): void {
  if (FEATURE_FLAGS.LOG_DUAL_WRITE) {
    console.log(`[DUAL-WRITE] ${operation}:`, JSON.stringify(details, null, 2));
  }
}

// ============================================================
// Migration Status Helper
// ============================================================

export interface MigrationStatus {
  phase: 'pre-migration' | 'dual-write' | 'v3-primary' | 'v2-deprecated';
  description: string;
  readFrom: 'V2' | 'V3';
  writeTo: ('V2' | 'V3')[];
}

/**
 * Get current migration status based on feature flags
 */
export function getMigrationStatus(): MigrationStatus {
  if (FEATURE_FLAGS.DEPRECATE_V2_TABLES) {
    return {
      phase: 'v2-deprecated',
      description: 'V3 is primary, V2 tables are no longer updated',
      readFrom: 'V3',
      writeTo: ['V3'],
    };
  }

  if (FEATURE_FLAGS.USE_V3_TABLES) {
    return {
      phase: 'v3-primary',
      description: 'Reading from V3 tables, dual-write still active',
      readFrom: 'V3',
      writeTo: FEATURE_FLAGS.DUAL_WRITE_ENABLED ? ['V2', 'V3'] : ['V3'],
    };
  }

  if (FEATURE_FLAGS.DUAL_WRITE_ENABLED) {
    return {
      phase: 'dual-write',
      description: 'Writing to both V2 and V3 tables, reading from V2',
      readFrom: 'V2',
      writeTo: ['V2', 'V3'],
    };
  }

  return {
    phase: 'pre-migration',
    description: 'V3 migration not yet started',
    readFrom: 'V2',
    writeTo: ['V2'],
  };
}

// ============================================================
// Export default config
// ============================================================

export default FEATURE_FLAGS;
