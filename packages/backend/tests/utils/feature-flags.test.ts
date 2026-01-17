import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Feature Flags Tests
 *
 * Tests for the feature flag system that controls V3 migration.
 * Uses vitest to mock environment variables.
 */

// Store original env values
const originalEnv = { ...process.env };

describe('Feature Flags', () => {
  beforeEach(() => {
    // Reset modules to pick up new env values
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe('FEATURE_FLAGS configuration', () => {
    it('should have USE_V3_TABLES default to false', async () => {
      delete process.env.USE_V3_TABLES;
      const { FEATURE_FLAGS } = await import('../../src/config/features.js');
      expect(FEATURE_FLAGS.USE_V3_TABLES).toBe(false);
    });

    it('should enable USE_V3_TABLES when env is "true"', async () => {
      process.env.USE_V3_TABLES = 'true';
      const { FEATURE_FLAGS } = await import('../../src/config/features.js');
      expect(FEATURE_FLAGS.USE_V3_TABLES).toBe(true);
    });

    it('should have DUAL_WRITE_ENABLED default to true', async () => {
      delete process.env.DUAL_WRITE_ENABLED;
      const { FEATURE_FLAGS } = await import('../../src/config/features.js');
      expect(FEATURE_FLAGS.DUAL_WRITE_ENABLED).toBe(true);
    });

    it('should disable DUAL_WRITE_ENABLED when env is "false"', async () => {
      process.env.DUAL_WRITE_ENABLED = 'false';
      const { FEATURE_FLAGS } = await import('../../src/config/features.js');
      expect(FEATURE_FLAGS.DUAL_WRITE_ENABLED).toBe(false);
    });

    it('should have DEPRECATE_V2_TABLES default to false', async () => {
      delete process.env.DEPRECATE_V2_TABLES;
      const { FEATURE_FLAGS } = await import('../../src/config/features.js');
      expect(FEATURE_FLAGS.DEPRECATE_V2_TABLES).toBe(false);
    });

    it('should have WORD_MAP_ENABLED default to true', async () => {
      delete process.env.WORD_MAP_ENABLED;
      const { FEATURE_FLAGS } = await import('../../src/config/features.js');
      expect(FEATURE_FLAGS.WORD_MAP_ENABLED).toBe(true);
    });
  });

  describe('isV3Enabled()', () => {
    it('should return false when USE_V3_TABLES is not set', async () => {
      delete process.env.USE_V3_TABLES;
      const { isV3Enabled } = await import('../../src/config/features.js');
      expect(isV3Enabled()).toBe(false);
    });

    it('should return true when USE_V3_TABLES is "true"', async () => {
      process.env.USE_V3_TABLES = 'true';
      const { isV3Enabled } = await import('../../src/config/features.js');
      expect(isV3Enabled()).toBe(true);
    });
  });

  describe('isDualWriteEnabled()', () => {
    it('should return true when DUAL_WRITE_ENABLED and not deprecating V2', async () => {
      process.env.DUAL_WRITE_ENABLED = 'true';
      delete process.env.DEPRECATE_V2_TABLES;
      const { isDualWriteEnabled } = await import('../../src/config/features.js');
      expect(isDualWriteEnabled()).toBe(true);
    });

    it('should return false when DEPRECATE_V2_TABLES is true', async () => {
      process.env.DUAL_WRITE_ENABLED = 'true';
      process.env.DEPRECATE_V2_TABLES = 'true';
      const { isDualWriteEnabled } = await import('../../src/config/features.js');
      expect(isDualWriteEnabled()).toBe(false);
    });

    it('should return false when DUAL_WRITE_ENABLED is false', async () => {
      process.env.DUAL_WRITE_ENABLED = 'false';
      delete process.env.DEPRECATE_V2_TABLES;
      const { isDualWriteEnabled } = await import('../../src/config/features.js');
      expect(isDualWriteEnabled()).toBe(false);
    });
  });

  describe('shouldWriteToV2()', () => {
    it('should return true when DEPRECATE_V2_TABLES is not set', async () => {
      delete process.env.DEPRECATE_V2_TABLES;
      const { shouldWriteToV2 } = await import('../../src/config/features.js');
      expect(shouldWriteToV2()).toBe(true);
    });

    it('should return false when DEPRECATE_V2_TABLES is true', async () => {
      process.env.DEPRECATE_V2_TABLES = 'true';
      const { shouldWriteToV2 } = await import('../../src/config/features.js');
      expect(shouldWriteToV2()).toBe(false);
    });
  });

  describe('shouldWriteToV3()', () => {
    it('should return true when USE_V3_TABLES is true', async () => {
      process.env.USE_V3_TABLES = 'true';
      process.env.DUAL_WRITE_ENABLED = 'false';
      const { shouldWriteToV3 } = await import('../../src/config/features.js');
      expect(shouldWriteToV3()).toBe(true);
    });

    it('should return true when DUAL_WRITE_ENABLED is true', async () => {
      process.env.USE_V3_TABLES = 'false';
      process.env.DUAL_WRITE_ENABLED = 'true';
      const { shouldWriteToV3 } = await import('../../src/config/features.js');
      expect(shouldWriteToV3()).toBe(true);
    });

    it('should return false when both are false', async () => {
      process.env.USE_V3_TABLES = 'false';
      process.env.DUAL_WRITE_ENABLED = 'false';
      const { shouldWriteToV3 } = await import('../../src/config/features.js');
      expect(shouldWriteToV3()).toBe(false);
    });
  });

  describe('getMigrationStatus()', () => {
    it('should return pre-migration when no flags set', async () => {
      delete process.env.USE_V3_TABLES;
      process.env.DUAL_WRITE_ENABLED = 'false';
      delete process.env.DEPRECATE_V2_TABLES;
      const { getMigrationStatus } = await import('../../src/config/features.js');

      const status = getMigrationStatus();
      expect(status.phase).toBe('pre-migration');
      expect(status.readFrom).toBe('V2');
      expect(status.writeTo).toEqual(['V2']);
    });

    it('should return dual-write phase when DUAL_WRITE_ENABLED', async () => {
      delete process.env.USE_V3_TABLES;
      process.env.DUAL_WRITE_ENABLED = 'true';
      delete process.env.DEPRECATE_V2_TABLES;
      const { getMigrationStatus } = await import('../../src/config/features.js');

      const status = getMigrationStatus();
      expect(status.phase).toBe('dual-write');
      expect(status.readFrom).toBe('V2');
      expect(status.writeTo).toEqual(['V2', 'V3']);
    });

    it('should return v3-primary when USE_V3_TABLES is true', async () => {
      process.env.USE_V3_TABLES = 'true';
      process.env.DUAL_WRITE_ENABLED = 'true';
      delete process.env.DEPRECATE_V2_TABLES;
      const { getMigrationStatus } = await import('../../src/config/features.js');

      const status = getMigrationStatus();
      expect(status.phase).toBe('v3-primary');
      expect(status.readFrom).toBe('V3');
      expect(status.writeTo).toEqual(['V2', 'V3']);
    });

    it('should return v2-deprecated when DEPRECATE_V2_TABLES is true', async () => {
      process.env.USE_V3_TABLES = 'true';
      process.env.DUAL_WRITE_ENABLED = 'true';
      process.env.DEPRECATE_V2_TABLES = 'true';
      const { getMigrationStatus } = await import('../../src/config/features.js');

      const status = getMigrationStatus();
      expect(status.phase).toBe('v2-deprecated');
      expect(status.readFrom).toBe('V3');
      expect(status.writeTo).toEqual(['V3']);
    });
  });

  describe('Migration Phase Transitions', () => {
    it('should support typical migration path: pre -> dual-write -> v3-primary -> v2-deprecated', async () => {
      // Phase 1: Pre-migration
      delete process.env.USE_V3_TABLES;
      process.env.DUAL_WRITE_ENABLED = 'false';
      delete process.env.DEPRECATE_V2_TABLES;

      let { getMigrationStatus: getStatus1 } = await import('../../src/config/features.js');
      expect(getStatus1().phase).toBe('pre-migration');

      // Phase 2: Dual-write
      vi.resetModules();
      process.env.DUAL_WRITE_ENABLED = 'true';

      let { getMigrationStatus: getStatus2 } = await import('../../src/config/features.js');
      expect(getStatus2().phase).toBe('dual-write');

      // Phase 3: V3 Primary
      vi.resetModules();
      process.env.USE_V3_TABLES = 'true';

      let { getMigrationStatus: getStatus3 } = await import('../../src/config/features.js');
      expect(getStatus3().phase).toBe('v3-primary');

      // Phase 4: V2 Deprecated
      vi.resetModules();
      process.env.DEPRECATE_V2_TABLES = 'true';

      let { getMigrationStatus: getStatus4 } = await import('../../src/config/features.js');
      expect(getStatus4().phase).toBe('v2-deprecated');
    });
  });
});
