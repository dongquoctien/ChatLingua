import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

interface MasterGrammarRow extends RowDataPacket {
  id: number;
  grammar_rule: string;
  category: string;
  subcategory: string | null;
  cefr_level: string;
  difficulty_level: string;
  explanation: string;
  explanation_vi: string;
  formula: string | null;
  examples: string;
  common_mistakes: string | null;
  usage_tips: string | null;
  related_grammar_ids: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface MasterGrammarItem {
  id: number;
  grammarRule: string;
  category: string;
  subcategory: string | null;
  cefrLevel: string;
  difficultyLevel: string;
  explanation: string;
  explanationVi: string;
  formula: string | null;
  examples: GrammarExample[];
  commonMistakes: CommonMistake[] | null;
  usageTips: string | null;
  relatedGrammarIds: number[] | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface GrammarExample {
  en: string;
  vi: string;
}

export interface CommonMistake {
  wrong: string;
  correct: string;
  explanation: string;
}

export interface MasterGrammarFilters {
  category?: string;
  subcategory?: string;
  cefrLevel?: string;
  difficultyLevel?: string;
  searchTerm?: string;
  isActive?: boolean;
}

export interface CreateMasterGrammarInput {
  grammarRule: string;
  category: string;
  subcategory?: string;
  cefrLevel?: string;
  difficultyLevel?: string;
  explanation: string;
  explanationVi: string;
  formula?: string;
  examples: GrammarExample[];
  commonMistakes?: CommonMistake[];
  usageTips?: string;
  relatedGrammarIds?: number[];
  createdBy?: number;
}

// ============================================================
// Service
// ============================================================

export class MasterGrammarService {
  /**
   * Get all master grammar with pagination and filters
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    filters: MasterGrammarFilters = {}
  ): Promise<{ data: MasterGrammarItem[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters.subcategory) {
      conditions.push('subcategory = ?');
      params.push(filters.subcategory);
    }

    if (filters.cefrLevel) {
      conditions.push('cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.difficultyLevel) {
      conditions.push('difficulty_level = ?');
      params.push(filters.difficultyLevel);
    }

    if (filters.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.isActive);
    } else {
      conditions.push('is_active = TRUE');
    }

    if (filters.searchTerm) {
      conditions.push('(grammar_rule LIKE ? OR explanation LIKE ? OR explanation_vi LIKE ?)');
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM master_grammar ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get grammar with pagination
    const [rows] = await pool.query<MasterGrammarRow[]>(
      `SELECT * FROM master_grammar ${whereClause}
       ORDER BY category ASC, grammar_rule ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: rows.map(row => this.mapToMasterGrammarItem(row)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get master grammar by ID
   */
  async getById(id: number): Promise<MasterGrammarItem | null> {
    const [rows] = await pool.execute<MasterGrammarRow[]>(
      'SELECT * FROM master_grammar WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToMasterGrammarItem(rows[0]);
  }

  /**
   * Get master grammar by rule and category
   */
  async getByRuleAndCategory(grammarRule: string, category: string): Promise<MasterGrammarItem | null> {
    const [rows] = await pool.execute<MasterGrammarRow[]>(
      'SELECT * FROM master_grammar WHERE grammar_rule = ? AND category = ?',
      [grammarRule, category]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToMasterGrammarItem(rows[0]);
  }

  /**
   * Get grammar by category
   */
  async getByCategory(category: string): Promise<MasterGrammarItem[]> {
    const [rows] = await pool.query<MasterGrammarRow[]>(
      `SELECT * FROM master_grammar
       WHERE category = ? AND is_active = TRUE
       ORDER BY cefr_level ASC, grammar_rule ASC`,
      [category]
    );

    return rows.map(row => this.mapToMasterGrammarItem(row));
  }

  /**
   * Get all grammar categories
   */
  async getCategories(): Promise<{ name: string; displayName: string; count: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT gc.name, gc.display_name, COUNT(mg.id) as count
       FROM grammar_categories gc
       LEFT JOIN master_grammar mg ON mg.category = gc.name AND mg.is_active = TRUE
       GROUP BY gc.name, gc.display_name
       ORDER BY gc.display_order`
    );

    return rows.map(row => ({
      name: row.name as string,
      displayName: row.display_name as string,
      count: row.count as number,
    }));
  }

  /**
   * Search master grammar
   */
  async search(query: string, limit: number = 20): Promise<MasterGrammarItem[]> {
    const [rows] = await pool.query<MasterGrammarRow[]>(
      `SELECT * FROM master_grammar
       WHERE is_active = TRUE AND (grammar_rule LIKE ? OR explanation LIKE ? OR explanation_vi LIKE ?)
       ORDER BY
         CASE WHEN grammar_rule LIKE ? THEN 0 ELSE 1 END,
         grammar_rule
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `${query}%`, Number(limit)]
    );

    return rows.map(row => this.mapToMasterGrammarItem(row));
  }

  /**
   * Create new master grammar (admin only)
   */
  async create(input: CreateMasterGrammarInput): Promise<MasterGrammarItem> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO master_grammar (
        grammar_rule, category, subcategory, cefr_level, difficulty_level,
        explanation, explanation_vi, formula, examples, common_mistakes,
        usage_tips, related_grammar_ids, created_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.grammarRule,
        input.category,
        input.subcategory || null,
        input.cefrLevel || 'A1',
        input.difficultyLevel || 'beginner',
        input.explanation,
        input.explanationVi,
        input.formula || null,
        JSON.stringify(input.examples),
        input.commonMistakes ? JSON.stringify(input.commonMistakes) : null,
        input.usageTips || null,
        input.relatedGrammarIds ? JSON.stringify(input.relatedGrammarIds) : null,
        input.createdBy || null,
      ]
    );

    const created = await this.getById(result.insertId);
    if (!created) {
      throw new Error('Failed to create master grammar');
    }
    return created;
  }

  /**
   * Update master grammar (admin only)
   */
  async update(id: number, input: Partial<CreateMasterGrammarInput>): Promise<MasterGrammarItem | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.grammarRule !== undefined) {
      updates.push('grammar_rule = ?');
      params.push(input.grammarRule);
    }
    if (input.category !== undefined) {
      updates.push('category = ?');
      params.push(input.category);
    }
    if (input.subcategory !== undefined) {
      updates.push('subcategory = ?');
      params.push(input.subcategory || null);
    }
    if (input.cefrLevel !== undefined) {
      updates.push('cefr_level = ?');
      params.push(input.cefrLevel);
    }
    if (input.difficultyLevel !== undefined) {
      updates.push('difficulty_level = ?');
      params.push(input.difficultyLevel);
    }
    if (input.explanation !== undefined) {
      updates.push('explanation = ?');
      params.push(input.explanation);
    }
    if (input.explanationVi !== undefined) {
      updates.push('explanation_vi = ?');
      params.push(input.explanationVi);
    }
    if (input.formula !== undefined) {
      updates.push('formula = ?');
      params.push(input.formula || null);
    }
    if (input.examples !== undefined) {
      updates.push('examples = ?');
      params.push(JSON.stringify(input.examples));
    }
    if (input.commonMistakes !== undefined) {
      updates.push('common_mistakes = ?');
      params.push(input.commonMistakes ? JSON.stringify(input.commonMistakes) : null);
    }
    if (input.usageTips !== undefined) {
      updates.push('usage_tips = ?');
      params.push(input.usageTips || null);
    }
    if (input.relatedGrammarIds !== undefined) {
      updates.push('related_grammar_ids = ?');
      params.push(input.relatedGrammarIds ? JSON.stringify(input.relatedGrammarIds) : null);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    params.push(id);
    await pool.execute(
      `UPDATE master_grammar SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  /**
   * Soft delete master grammar (admin only)
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE master_grammar SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get grammar by CEFR level (for Word Map lessons)
   */
  async getByCefrLevel(cefrLevel: string, limit: number = 50): Promise<MasterGrammarItem[]> {
    const [rows] = await pool.query<MasterGrammarRow[]>(
      `SELECT * FROM master_grammar
       WHERE cefr_level = ? AND is_active = TRUE
       ORDER BY category ASC, grammar_rule ASC
       LIMIT ?`,
      [cefrLevel, Number(limit)]
    );

    return rows.map(row => this.mapToMasterGrammarItem(row));
  }

  /**
   * Get grammar count by category (for stats)
   */
  async getCountByCategory(): Promise<Record<string, number>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT category, COUNT(*) as count
       FROM master_grammar WHERE is_active = TRUE
       GROUP BY category`
    );

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.category as string] = row.count as number;
    }
    return result;
  }

  /**
   * Get related grammar items
   */
  async getRelatedGrammar(id: number): Promise<MasterGrammarItem[]> {
    const grammar = await this.getById(id);
    if (!grammar || !grammar.relatedGrammarIds || grammar.relatedGrammarIds.length === 0) {
      return [];
    }

    const placeholders = grammar.relatedGrammarIds.map(() => '?').join(',');
    const [rows] = await pool.query<MasterGrammarRow[]>(
      `SELECT * FROM master_grammar
       WHERE id IN (${placeholders}) AND is_active = TRUE`,
      grammar.relatedGrammarIds
    );

    return rows.map(row => this.mapToMasterGrammarItem(row));
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private parseJson<T>(value: string | object | null): T | null {
    if (!value) return null;
    if (typeof value === 'object') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private mapToMasterGrammarItem(row: MasterGrammarRow): MasterGrammarItem {
    return {
      id: row.id,
      grammarRule: row.grammar_rule,
      category: row.category,
      subcategory: row.subcategory,
      cefrLevel: row.cefr_level,
      difficultyLevel: row.difficulty_level,
      explanation: row.explanation,
      explanationVi: row.explanation_vi,
      formula: row.formula,
      examples: this.parseJson<GrammarExample[]>(row.examples) || [],
      commonMistakes: this.parseJson<CommonMistake[]>(row.common_mistakes),
      usageTips: row.usage_tips,
      relatedGrammarIds: this.parseJson<number[]>(row.related_grammar_ids),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
    };
  }
}

export const masterGrammarService = new MasterGrammarService();
