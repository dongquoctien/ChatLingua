import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { StudyUnit, StudyPage, StudySection } from '@chatlingua/shared';

// ============================================================
// Types
// ============================================================

interface StudyPageDataRow extends RowDataPacket {
  id: number;
  unit_lesson_id: number;
  page_data: string;
  version: number;
  is_published: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

interface StudyUnitDataRow extends RowDataPacket {
  id: number;
  map_unit_id: number;
  unit_data: string;
  version: number;
  is_published: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudyPageData {
  id: number;
  unitLessonId: number;
  pageData: StudyPage[];
  version: number;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyUnitData {
  id: number;
  mapUnitId: number;
  unitData: StudyUnit;
  version: number;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Service
// ============================================================

export class StudyPageService {
  // ============================================================
  // Study Page JSON Data (per lesson)
  // ============================================================

  /**
   * Get study page data for a lesson
   */
  async getStudyPageByLessonId(lessonId: number): Promise<StudyPageData | null> {
    const [rows] = await pool.execute<StudyPageDataRow[]>(
      `SELECT * FROM study_page_data WHERE unit_lesson_id = ? AND is_published = TRUE`,
      [lessonId]
    );

    if (rows.length === 0) return null;
    return this.mapToStudyPageData(rows[0]);
  }

  /**
   * Get study page data by ID (for admin)
   */
  async getStudyPageById(id: number): Promise<StudyPageData | null> {
    const [rows] = await pool.execute<StudyPageDataRow[]>(
      `SELECT * FROM study_page_data WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapToStudyPageData(rows[0]);
  }

  /**
   * Get draft study page data (for admin)
   */
  async getStudyPageDraft(lessonId: number): Promise<StudyPageData | null> {
    const [rows] = await pool.execute<StudyPageDataRow[]>(
      `SELECT * FROM study_page_data WHERE unit_lesson_id = ? ORDER BY version DESC LIMIT 1`,
      [lessonId]
    );

    if (rows.length === 0) return null;
    return this.mapToStudyPageData(rows[0]);
  }

  /**
   * Create or update study page data
   */
  async saveStudyPage(input: {
    lessonId: number;
    pageData: StudyPage[];
    createdBy?: number;
    publish?: boolean;
  }): Promise<StudyPageData> {
    // Get current version
    const existing = await this.getStudyPageDraft(input.lessonId);
    const newVersion = existing ? existing.version + 1 : 1;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO study_page_data (
        unit_lesson_id, page_data, version, is_published, created_by
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        page_data = VALUES(page_data),
        version = VALUES(version),
        is_published = VALUES(is_published),
        updated_at = CURRENT_TIMESTAMP`,
      [
        input.lessonId,
        JSON.stringify(input.pageData),
        newVersion,
        input.publish ?? false,
        input.createdBy || null,
      ]
    );

    const saved = await this.getStudyPageById(result.insertId || existing?.id || 0);
    if (!saved) {
      // If no insertId (update case), get by lessonId
      return await this.getStudyPageDraft(input.lessonId) as StudyPageData;
    }
    return saved;
  }

  /**
   * Publish study page (make it live)
   */
  async publishStudyPage(lessonId: number): Promise<StudyPageData | null> {
    await pool.execute(
      `UPDATE study_page_data SET is_published = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE unit_lesson_id = ?`,
      [lessonId]
    );
    return this.getStudyPageByLessonId(lessonId);
  }

  /**
   * Unpublish study page
   */
  async unpublishStudyPage(lessonId: number): Promise<StudyPageData | null> {
    await pool.execute(
      `UPDATE study_page_data SET is_published = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE unit_lesson_id = ?`,
      [lessonId]
    );
    return this.getStudyPageDraft(lessonId);
  }

  // ============================================================
  // Study Unit JSON Data (per unit - contains all pages)
  // ============================================================

  /**
   * Get study unit data by unit ID
   */
  async getStudyUnitByMapUnitId(mapUnitId: number): Promise<StudyUnitData | null> {
    const [rows] = await pool.execute<StudyUnitDataRow[]>(
      `SELECT * FROM study_unit_data WHERE map_unit_id = ? AND is_published = TRUE`,
      [mapUnitId]
    );

    if (rows.length === 0) return null;
    return this.mapToStudyUnitData(rows[0]);
  }

  /**
   * Get study unit data by ID (for admin)
   */
  async getStudyUnitById(id: number): Promise<StudyUnitData | null> {
    const [rows] = await pool.execute<StudyUnitDataRow[]>(
      `SELECT * FROM study_unit_data WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapToStudyUnitData(rows[0]);
  }

  /**
   * Get draft study unit data (for admin)
   */
  async getStudyUnitDraft(mapUnitId: number): Promise<StudyUnitData | null> {
    const [rows] = await pool.execute<StudyUnitDataRow[]>(
      `SELECT * FROM study_unit_data WHERE map_unit_id = ? ORDER BY version DESC LIMIT 1`,
      [mapUnitId]
    );

    if (rows.length === 0) return null;
    return this.mapToStudyUnitData(rows[0]);
  }

  /**
   * Create or update study unit data
   */
  async saveStudyUnit(input: {
    mapUnitId: number;
    unitData: StudyUnit;
    createdBy?: number;
    publish?: boolean;
  }): Promise<StudyUnitData> {
    // Get current version
    const existing = await this.getStudyUnitDraft(input.mapUnitId);
    const newVersion = existing ? existing.version + 1 : 1;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO study_unit_data (
        map_unit_id, unit_data, version, is_published, created_by
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        unit_data = VALUES(unit_data),
        version = VALUES(version),
        is_published = VALUES(is_published),
        updated_at = CURRENT_TIMESTAMP`,
      [
        input.mapUnitId,
        JSON.stringify(input.unitData),
        newVersion,
        input.publish ?? false,
        input.createdBy || null,
      ]
    );

    const saved = await this.getStudyUnitById(result.insertId || existing?.id || 0);
    if (!saved) {
      return await this.getStudyUnitDraft(input.mapUnitId) as StudyUnitData;
    }
    return saved;
  }

  /**
   * Publish study unit (make it live)
   */
  async publishStudyUnit(mapUnitId: number): Promise<StudyUnitData | null> {
    await pool.execute(
      `UPDATE study_unit_data SET is_published = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE map_unit_id = ?`,
      [mapUnitId]
    );
    return this.getStudyUnitByMapUnitId(mapUnitId);
  }

  /**
   * Unpublish study unit
   */
  async unpublishStudyUnit(mapUnitId: number): Promise<StudyUnitData | null> {
    await pool.execute(
      `UPDATE study_unit_data SET is_published = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE map_unit_id = ?`,
      [mapUnitId]
    );
    return this.getStudyUnitDraft(mapUnitId);
  }

  // ============================================================
  // List all study pages/units for a map (admin)
  // ============================================================

  /**
   * Get all study units for a word map
   */
  async getStudyUnitsForMap(mapId: number): Promise<StudyUnitData[]> {
    const [rows] = await pool.execute<StudyUnitDataRow[]>(
      `SELECT sud.* FROM study_unit_data sud
       JOIN map_units mu ON sud.map_unit_id = mu.id
       WHERE mu.map_id = ?
       ORDER BY mu.unit_number ASC`,
      [mapId]
    );

    return rows.map(row => this.mapToStudyUnitData(row));
  }

  /**
   * Get all study pages for a unit
   */
  async getStudyPagesForUnit(unitId: number): Promise<StudyPageData[]> {
    const [rows] = await pool.execute<StudyPageDataRow[]>(
      `SELECT spd.* FROM study_page_data spd
       JOIN unit_lessons ul ON spd.unit_lesson_id = ul.id
       WHERE ul.unit_id = ?
       ORDER BY ul.lesson_number ASC`,
      [unitId]
    );

    return rows.map(row => this.mapToStudyPageData(row));
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private parseJson<T>(value: string | null): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private mapToStudyPageData(row: StudyPageDataRow): StudyPageData {
    return {
      id: row.id,
      unitLessonId: row.unit_lesson_id,
      pageData: this.parseJson<StudyPage[]>(row.page_data) || [],
      version: row.version,
      isPublished: row.is_published,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToStudyUnitData(row: StudyUnitDataRow): StudyUnitData {
    return {
      id: row.id,
      mapUnitId: row.map_unit_id,
      unitData: this.parseJson<StudyUnit>(row.unit_data) || {
        unitId: '',
        unitNumber: 0,
        title: '',
        cefrLevel: 'A1',
        pages: [],
      },
      version: row.version,
      isPublished: row.is_published,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const studyPageService = new StudyPageService();
