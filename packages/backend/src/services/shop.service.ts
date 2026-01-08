import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { gamificationService } from './gamification.service.js';
import { chatService } from './chat.service.js';
import { emitToUser } from '../socket/index.js';

// ============================================================
// Types
// ============================================================

export type ItemType =
  | 'avatar_frame'
  | 'avatar_effect'
  | 'avatar_badge'
  | 'profile_theme'
  | 'profile_banner'
  | 'name_effect'
  | 'chat_bubble'
  | 'emoji_pack'
  | 'sticker_pack'
  | 'game_theme'
  | 'card_back'
  | 'sound_pack'
  | 'booster'
  | 'title'
  | 'pet_egg'
  | 'pet_item'
  | 'pet_equipment';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CurrencyType = 'coins' | 'gems';
export type TransactionType =
  | 'game_reward'
  | 'daily_bonus'
  | 'achievement'
  | 'quest'
  | 'purchase'
  | 'gift_sent'
  | 'gift_received'
  | 'refund'
  | 'admin_grant'
  | 'exercise_reward'
  | 'pet_care_reward'
  | 'egg_purchase'
  | 'pet_purchase'
  | 'pet_item_purchase';

export interface ShopCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  children?: ShopCategory[];
  itemCount?: number;
}

export interface ShopItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  categoryId: number;
  categoryName?: string;
  itemType: ItemType;
  priceCoins: number;
  priceGems: number;
  originalPrice: number | null;
  rarity: Rarity;
  isAvailable: boolean;
  isLimited: boolean;
  limitedQuantity: number | null;
  soldCount: number;
  availableFrom: Date | null;
  availableUntil: Date | null;
  requiredLevel: number;
  requiredAchievement: string | null;
  assetUrl: string | null;
  previewUrl: string | null;
  assetData: Record<string, any> | null;
  isConsumable: boolean;
  effectDurationMinutes: number | null;
  purchaseCount: number;
  favoriteCount: number;
  isOwned?: boolean;
  isEquipped?: boolean;
  ownedQuantity?: number;
}

export interface UserCurrency {
  userId: number;
  coins: number;
  gems: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  totalGemsEarned: number;
  totalGemsSpent: number;
}

export interface InventoryItem {
  id: number;
  userId: number;
  itemId: number;
  item: ShopItem;
  quantity: number;
  isEquipped: boolean;
  activatedAt: Date | null;
  expiresAt: Date | null;
  purchasedAt: Date;
  purchasePrice: number;
  giftedBy: number | null;
}

export interface EquippedItems {
  avatarFrame: ShopItem | null;
  avatarEffect: ShopItem | null;
  avatarBadge: ShopItem | null;
  profileTheme: ShopItem | null;
  profileBanner: ShopItem | null;
  nameEffect: ShopItem | null;
  chatBubble: ShopItem | null;
  title: ShopItem | null;
  gameTheme: ShopItem | null;
  cardBack: ShopItem | null;
  soundPack: ShopItem | null;
}

export interface DailyDeal {
  id: number;
  item: ShopItem;
  discountPercent: number;
  dealPrice: number;
  originalPrice: number;
  maxPurchases: number;
  purchasesCount: number;
  purchased: boolean;
  remainingTime: number;
}

export interface CurrencyTransaction {
  id: number;
  userId: number;
  currencyType: CurrencyType;
  amount: number;
  balanceAfter: number;
  transactionType: TransactionType;
  referenceType: string | null;
  referenceId: number | null;
  description: string | null;
  createdAt: Date;
}

export interface PurchaseResult {
  success: boolean;
  item: ShopItem;
  newBalance: number;
  message?: string;
}

export interface Gift {
  id: number;
  senderId: number;
  senderName?: string;
  recipientId: number;
  recipientName?: string;
  itemId: number;
  itemName?: string;
  itemSlug?: string;
  itemRarity?: Rarity;
  itemPreviewUrl?: string | null;
  item?: ShopItem;
  message: string | null;
  status: 'pending' | 'claimed' | 'expired' | 'returned';
  sentAt: Date;
  claimedAt?: Date | null;
  expiresAt: Date;
}

export interface ActiveBooster {
  itemId: number;
  name: string;
  effectType: string;
  multiplier: number;
  activatedAt: Date;
  expiresAt: Date;
  remainingMinutes: number;
}

export interface ShopBundle {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  priceCoins: number;
  priceGems: number;
  originalPrice: number;
  discountPercent: number;
  previewUrl: string | null;
  isAvailable: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
  isLimited: boolean;
  limitedQuantity: number | null;
  soldCount: number;
  items: ShopItem[];
  isOwned?: boolean;
}

export interface BundlePurchaseResult {
  success: boolean;
  bundle: ShopBundle;
  itemsAdded: number;
  newBalance: number;
}

// ============================================================
// Pet/Egg types - DEPRECATED: Use pet.service.ts instead
// These types are kept for backwards compatibility with shop_items
// that have item_type = 'pet_egg' or 'pet'. All pet/egg purchases
// should go through petService.purchaseEgg() or petService.purchasePet()
// ============================================================

/** @deprecated Use petService.getEggTypes() instead */
export interface EggShopItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  rarity: Rarity;
  priceCoins: number;
  priceGems: number;
  hatchXpRequired: number;
  hatchHoursMin: number;
  imageUrl: string | null;
  possiblePets: EggPossiblePet[];
  isAvailable: boolean;
}

/** @deprecated Use petService types instead */
export interface EggPossiblePet {
  petTypeId: number;
  name: string;
  slug: string;
  rarity: Rarity;
  weight: number;
  probability: number;
  imageUrl: string | null;
}

/** @deprecated Use petService.purchaseEgg() instead */
export interface EggPurchaseResult {
  success: boolean;
  egg: {
    id: number;
    userId: number;
    petTypeId: number;
    nickname: string | null;
    isHatched: boolean;
    hatchXpProgress: number;
    hatchStartedAt: string;
  };
  newBalance: number;
  message: string;
}

interface GetItemsOptions {
  categorySlug?: string;
  itemType?: ItemType;
  rarity?: Rarity;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'popularity' | 'newest';
  limit?: number;
  offset?: number;
  userId?: number; // For checking owned status
}

// ============================================================
// Shop Service
// ============================================================

class ShopService {
  // ==================== CATEGORIES ====================

  async getCategories(): Promise<ShopCategory[]> {
    // Get categories with their direct item counts
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        c.id, c.name, c.slug, c.description, c.icon,
        c.parent_id as parentId, c.sort_order as sortOrder, c.is_active as isActive,
        (SELECT COUNT(*) FROM shop_items si WHERE si.category_id = c.id AND si.is_available = TRUE) as directItemCount
      FROM shop_categories c
      WHERE c.is_active = TRUE
      ORDER BY c.sort_order, c.name
    `);

    // Get pet_items count for Pet Care category
    const [petCareCount] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM pet_items WHERE is_available = TRUE
    `);
    const petCareItemCount = petCareCount[0]?.count || 0;

    // Get eggs count for Pets & Eggs category (eggs are in shop_items with item_type like 'egg' or in a separate table)
    // For now, count pets with item_type='pet' and add eggs if they exist
    const [petsEggsCount] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM shop_items WHERE item_type IN ('pet', 'egg') AND is_available = TRUE
    `);
    const petsEggsItemCount = petsEggsCount[0]?.count || 0;

    // Build tree structure
    const categories: ShopCategory[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      parentId: row.parentId,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      itemCount: row.directItemCount,
      children: []
    }));

    const rootCategories: ShopCategory[] = [];
    const categoryMap = new Map<number, ShopCategory>();

    categories.forEach(cat => categoryMap.set(cat.id, cat));

    // Build parent-child relationships
    categories.forEach(cat => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(cat);
        }
      } else {
        rootCategories.push(cat);
      }
    });

    // Special handling for certain categories
    // Note: Frontend uses getTotalItemCount() to recursively sum parent + children
    // So we only set the DIRECT item count here, not aggregated totals
    rootCategories.forEach(parent => {
      // Special handling for Pet Care category (slug: 'pet-care')
      // This category's items are in pet_items table, not shop_items
      if (parent.slug === 'pet-care') {
        parent.itemCount = petCareItemCount;
      }

      // Special handling for Pets & Eggs category (slug: 'pets-eggs')
      // Count pets and eggs from shop_items
      if (parent.slug === 'pets-eggs') {
        parent.itemCount = petsEggsItemCount;
      }
    });

    return rootCategories;
  }

  async getCategoryBySlug(slug: string): Promise<ShopCategory | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description, icon,
        parent_id as parentId, sort_order as sortOrder, is_active as isActive
      FROM shop_categories
      WHERE slug = ? AND is_active = TRUE
    `, [slug]);

    return rows.length > 0 ? rows[0] as ShopCategory : null;
  }

  // ==================== ITEMS ====================

  async getItems(options: GetItemsOptions = {}): Promise<{ items: ShopItem[]; total: number }> {
    const {
      categorySlug,
      itemType,
      rarity,
      minPrice,
      maxPrice,
      search,
      sortBy = 'popularity',
      limit = 20,
      offset = 0,
      userId
    } = options;

    let whereClause = 'WHERE si.is_available = TRUE';
    const params: any[] = [];

    // Add filter conditions
    if (categorySlug) {
      whereClause += ` AND (c.slug = ? OR pc.slug = ?)`;
      params.push(categorySlug, categorySlug);
    }

    if (itemType) {
      whereClause += ` AND si.item_type = ?`;
      params.push(itemType);
    }

    if (rarity) {
      whereClause += ` AND si.rarity = ?`;
      params.push(rarity);
    }

    if (minPrice !== undefined) {
      whereClause += ` AND si.price_coins >= ?`;
      params.push(minPrice);
    }

    if (maxPrice !== undefined) {
      whereClause += ` AND si.price_coins <= ?`;
      params.push(maxPrice);
    }

    if (search) {
      whereClause += ` AND (si.name LIKE ? OR si.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Time-limited availability check
    whereClause += ` AND (si.available_from IS NULL OR si.available_from <= NOW())`;
    whereClause += ` AND (si.available_until IS NULL OR si.available_until > NOW())`;

    // Determine sort order
    let orderBy = 'si.purchase_count DESC';
    switch (sortBy) {
      case 'price_asc':
        orderBy = 'si.price_coins ASC';
        break;
      case 'price_desc':
        orderBy = 'si.price_coins DESC';
        break;
      case 'newest':
        orderBy = 'si.created_at DESC';
        break;
      case 'popularity':
      default:
        orderBy = 'si.purchase_count DESC, si.favorite_count DESC';
    }

    // Get total count
    const [countResult] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as total
      FROM shop_items si
      JOIN shop_categories c ON si.category_id = c.id
      LEFT JOIN shop_categories pc ON c.parent_id = pc.id
      ${whereClause}
    `, params);

    const total = countResult[0].total;

    // Get items with owned status if userId provided
    let ownershipJoin = '';
    let ownershipSelect = '';
    if (userId) {
      ownershipJoin = `LEFT JOIN user_inventory ui ON si.id = ui.item_id AND ui.user_id = ?`;
      ownershipSelect = `, ui.quantity as ownedQuantity, ui.is_equipped as isEquipped`;
      params.unshift(userId);
    }

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        si.id, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as priceCoins,
        si.price_gems as priceGems, si.original_price as originalPrice,
        si.rarity, si.is_available as isAvailable, si.is_limited as isLimited,
        si.limited_quantity as limitedQuantity, si.sold_count as soldCount,
        si.available_from as availableFrom, si.available_until as availableUntil,
        si.required_level as requiredLevel, si.required_achievement as requiredAchievement,
        si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData, si.is_consumable as isConsumable,
        si.effect_duration_minutes as effectDurationMinutes,
        si.purchase_count as purchaseCount, si.favorite_count as favoriteCount
        ${ownershipSelect}
      FROM shop_items si
      JOIN shop_categories c ON si.category_id = c.id
      LEFT JOIN shop_categories pc ON c.parent_id = pc.id
      ${ownershipJoin}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const items: ShopItem[] = rows.map(row => ({
      ...this.mapItemRow(row),
      isOwned: userId ? (row.ownedQuantity || 0) > 0 : undefined,
      isEquipped: userId ? !!row.isEquipped : undefined,
      ownedQuantity: userId ? row.ownedQuantity || 0 : undefined
    }));

    return { items, total };
  }

  async getItemBySlug(slug: string, userId?: number): Promise<ShopItem | null> {
    let query = `
      SELECT
        si.id, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as priceCoins,
        si.price_gems as priceGems, si.original_price as originalPrice,
        si.rarity, si.is_available as isAvailable, si.is_limited as isLimited,
        si.limited_quantity as limitedQuantity, si.sold_count as soldCount,
        si.available_from as availableFrom, si.available_until as availableUntil,
        si.required_level as requiredLevel, si.required_achievement as requiredAchievement,
        si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData, si.is_consumable as isConsumable,
        si.effect_duration_minutes as effectDurationMinutes,
        si.purchase_count as purchaseCount, si.favorite_count as favoriteCount,
        dd.id as dealId, dd.discount_percent as dealDiscountPercent, dd.deal_price as dealPrice
    `;

    const params: any[] = [];

    if (userId) {
      query += `, ui.quantity as ownedQuantity, ui.is_equipped as isEquipped`;
    }

    query += `
      FROM shop_items si
      JOIN shop_categories c ON si.category_id = c.id
      LEFT JOIN shop_daily_deals dd ON si.id = dd.item_id AND dd.deal_date = CURDATE()
    `;

    if (userId) {
      query += ` LEFT JOIN user_inventory ui ON si.id = ui.item_id AND ui.user_id = ?`;
      params.push(userId);
    }

    query += ` WHERE si.slug = ?`;
    params.push(slug);

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    if (rows.length === 0) return null;

    const row = rows[0];
    const item = this.mapItemRow(row);

    // Add deal info if item has an active deal today
    const result: any = {
      ...item,
      isOwned: userId ? (row.ownedQuantity || 0) > 0 : undefined,
      isEquipped: userId ? !!row.isEquipped : undefined,
      ownedQuantity: userId ? row.ownedQuantity || 0 : undefined
    };

    if (row.dealId) {
      result.deal = {
        dealId: row.dealId,
        discountPercent: row.dealDiscountPercent,
        dealPrice: row.dealPrice,
        originalPrice: item.priceCoins
      };
    }

    return result;
  }

  async getItemById(id: number): Promise<ShopItem | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        si.id, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as priceCoins,
        si.price_gems as priceGems, si.original_price as originalPrice,
        si.rarity, si.is_available as isAvailable, si.is_limited as isLimited,
        si.limited_quantity as limitedQuantity, si.sold_count as soldCount,
        si.available_from as availableFrom, si.available_until as availableUntil,
        si.required_level as requiredLevel, si.required_achievement as requiredAchievement,
        si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData, si.is_consumable as isConsumable,
        si.effect_duration_minutes as effectDurationMinutes,
        si.purchase_count as purchaseCount, si.favorite_count as favoriteCount
      FROM shop_items si
      JOIN shop_categories c ON si.category_id = c.id
      WHERE si.id = ?
    `, [id]);

    return rows.length > 0 ? this.mapItemRow(rows[0]) : null;
  }

  async getFeaturedItems(userId?: number, limit: number = 8): Promise<ShopItem[]> {
    // Get popular items
    let whereClause = `WHERE si.is_available = TRUE
      AND (si.available_from IS NULL OR si.available_from <= NOW())
      AND (si.available_until IS NULL OR si.available_until > NOW())`;

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        si.id, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as priceCoins,
        si.price_gems as priceGems, si.original_price as originalPrice,
        si.rarity, si.is_available as isAvailable, si.is_limited as isLimited,
        si.limited_quantity as limitedQuantity, si.sold_count as soldCount,
        si.available_from as availableFrom, si.available_until as availableUntil,
        si.required_level as requiredLevel, si.required_achievement as requiredAchievement,
        si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData, si.is_consumable as isConsumable,
        si.effect_duration_minutes as effectDurationMinutes,
        si.purchase_count as purchaseCount, si.favorite_count as favoriteCount
      FROM shop_items si
      JOIN shop_categories c ON si.category_id = c.id
      ${whereClause}
      ORDER BY RAND()
      LIMIT ?
    `, [limit]);

    return rows.map(row => this.mapItemRow(row));
  }

  // ==================== PURCHASE ====================

  async purchaseItem(userId: number, itemId: number, quantity: number = 1): Promise<PurchaseResult> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Lock user's currency row
      const [currencyRows] = await connection.query<RowDataPacket[]>(`
        SELECT coins, gems FROM user_currency
        WHERE user_id = ? FOR UPDATE
      `, [userId]);

      if (currencyRows.length === 0) {
        throw new Error('USER_CURRENCY_NOT_FOUND');
      }

      const currency = currencyRows[0];

      // 2. Lock and get item
      const [itemRows] = await connection.query<RowDataPacket[]>(`
        SELECT * FROM shop_items
        WHERE id = ?
        AND is_available = TRUE
        AND (available_from IS NULL OR available_from <= NOW())
        AND (available_until IS NULL OR available_until > NOW())
        FOR UPDATE
      `, [itemId]);

      if (itemRows.length === 0) {
        throw new Error('ITEM_NOT_AVAILABLE');
      }

      const item = itemRows[0];
      const price = item.price_coins * quantity;

      // 3. Check balance
      if (currency.coins < price) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // 4. Check limited quantity
      if (item.is_limited && item.limited_quantity !== null) {
        if (item.sold_count + quantity > item.limited_quantity) {
          throw new Error('ITEM_SOLD_OUT');
        }
      }

      // 5. Check required level
      if (item.required_level > 0) {
        const [userRows] = await connection.query<RowDataPacket[]>(`
          SELECT level FROM user_xp WHERE user_id = ?
        `, [userId]);
        const userLevel = userRows.length > 0 ? userRows[0].level : 1;
        if (userLevel < item.required_level) {
          throw new Error('LEVEL_REQUIREMENT_NOT_MET');
        }
      }

      // 6. Check required achievement
      if (item.required_achievement) {
        const [achievementRows] = await connection.query<RowDataPacket[]>(`
          SELECT id FROM user_achievements
          WHERE user_id = ? AND achievement_id = (
            SELECT id FROM achievements WHERE achievement_code = ?
          )
        `, [userId, item.required_achievement]);
        if (achievementRows.length === 0) {
          throw new Error('ACHIEVEMENT_REQUIREMENT_NOT_MET');
        }
      }

      // 7. Check if already owned (non-consumable)
      if (!item.is_consumable) {
        const [existingRows] = await connection.query<RowDataPacket[]>(`
          SELECT id FROM user_inventory
          WHERE user_id = ? AND item_id = ?
        `, [userId, itemId]);

        if (existingRows.length > 0) {
          throw new Error('ALREADY_OWNED');
        }
      }

      // 8. Deduct coins
      await connection.query(`
        UPDATE user_currency
        SET coins = coins - ?,
            total_coins_spent = total_coins_spent + ?,
            updated_at = NOW()
        WHERE user_id = ?
      `, [price, price, userId]);

      // 9. Add to inventory
      await connection.query(`
        INSERT INTO user_inventory (user_id, item_id, quantity, purchase_price, purchased_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
      `, [userId, itemId, quantity, price, quantity]);

      // 10. Record transaction
      await connection.query(`
        INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (?, 'coins', ?, ?, 'purchase', 'shop_item', ?, ?)
      `, [userId, -price, currency.coins - price, itemId, `Purchased ${item.name}`]);

      // 11. Record purchase
      await connection.query(`
        INSERT INTO shop_purchases
        (user_id, item_id, quantity, unit_price, total_price, status)
        VALUES (?, ?, ?, ?, ?, 'completed')
      `, [userId, itemId, quantity, item.price_coins, price]);

      await connection.commit();

      const purchasedItem = await this.getItemById(itemId);

      return {
        success: true,
        item: purchasedItem!,
        newBalance: currency.coins - price
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==================== INVENTORY ====================

  async getInventory(userId: number, itemType?: ItemType): Promise<InventoryItem[]> {
    let query = `
      SELECT
        ui.id, ui.user_id as userId, ui.item_id as itemId,
        ui.quantity, ui.is_equipped as isEquipped,
        ui.activated_at as activatedAt, ui.expires_at as expiresAt,
        ui.purchased_at as purchasedAt, ui.purchase_price as purchasePrice,
        ui.gifted_by as giftedBy,
        si.id as si_id, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as priceCoins,
        si.price_gems as priceGems, si.rarity,
        si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData, si.is_consumable as isConsumable,
        si.effect_duration_minutes as effectDurationMinutes
      FROM user_inventory ui
      JOIN shop_items si ON ui.item_id = si.id
      JOIN shop_categories c ON si.category_id = c.id
      WHERE ui.user_id = ?
    `;

    const params: any[] = [userId];

    if (itemType) {
      query += ` AND si.item_type = ?`;
      params.push(itemType);
    }

    query += ` ORDER BY ui.purchased_at DESC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      itemId: row.itemId,
      quantity: row.quantity,
      isEquipped: !!row.isEquipped,
      activatedAt: row.activatedAt,
      expiresAt: row.expiresAt,
      purchasedAt: row.purchasedAt,
      purchasePrice: row.purchasePrice,
      giftedBy: row.giftedBy,
      item: {
        id: row.si_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        itemType: row.itemType,
        priceCoins: row.priceCoins,
        priceGems: row.priceGems,
        originalPrice: null,
        rarity: row.rarity,
        isAvailable: true,
        isLimited: false,
        limitedQuantity: null,
        soldCount: 0,
        availableFrom: null,
        availableUntil: null,
        requiredLevel: 0,
        requiredAchievement: null,
        assetUrl: row.assetUrl,
        previewUrl: row.previewUrl,
        assetData: typeof row.assetData === 'string' ? JSON.parse(row.assetData) : row.assetData,
        isConsumable: row.isConsumable,
        effectDurationMinutes: row.effectDurationMinutes,
        purchaseCount: 0,
        favoriteCount: 0
      }
    }));
  }

  async equipItem(userId: number, itemId: number): Promise<void> {
    // Get item details
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    // Check ownership
    const [inventory] = await pool.query<RowDataPacket[]>(`
      SELECT id FROM user_inventory
      WHERE user_id = ? AND item_id = ?
    `, [userId, itemId]);

    if (inventory.length === 0) {
      throw new Error('ITEM_NOT_OWNED');
    }

    // Determine which column to update
    const columnMap: Record<ItemType, string> = {
      avatar_frame: 'avatar_frame_id',
      avatar_effect: 'avatar_effect_id',
      avatar_badge: 'avatar_badge_id',
      profile_theme: 'profile_theme_id',
      profile_banner: 'profile_banner_id',
      name_effect: 'name_effect_id',
      chat_bubble: 'chat_bubble_id',
      title: 'title_id',
      game_theme: 'game_theme_id',
      card_back: 'card_back_id',
      sound_pack: 'sound_pack_id',
      emoji_pack: 'chat_bubble_id', // Not directly equippable
      sticker_pack: 'chat_bubble_id', // Not directly equippable
      booster: 'avatar_frame_id', // Boosters are activated, not equipped
      pet_egg: 'pet_id', // Eggs are not directly equippable - use pet system
      pet_item: 'pet_id', // Pet items are used via pet system
      pet_equipment: 'pet_id' // Pet equipment is equipped via pet system
    };

    const column = columnMap[item.itemType];
    if (!column || item.isConsumable) {
      throw new Error('ITEM_CANNOT_BE_EQUIPPED');
    }

    // Unequip old item of same type
    await pool.query(`
      UPDATE user_inventory ui
      JOIN shop_items si ON ui.item_id = si.id
      SET ui.is_equipped = FALSE
      WHERE ui.user_id = ? AND si.item_type = ? AND ui.is_equipped = TRUE
    `, [userId, item.itemType]);

    // Equip new item
    await pool.query(`
      UPDATE user_inventory
      SET is_equipped = TRUE
      WHERE user_id = ? AND item_id = ?
    `, [userId, itemId]);

    // Update quick lookup table
    await pool.query(`
      INSERT INTO user_equipped_items (user_id, ${column})
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE ${column} = ?
    `, [userId, itemId, itemId]);
  }

  async unequipItem(userId: number, itemId: number): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    const columnMap: Record<ItemType, string> = {
      avatar_frame: 'avatar_frame_id',
      avatar_effect: 'avatar_effect_id',
      avatar_badge: 'avatar_badge_id',
      profile_theme: 'profile_theme_id',
      profile_banner: 'profile_banner_id',
      name_effect: 'name_effect_id',
      chat_bubble: 'chat_bubble_id',
      title: 'title_id',
      game_theme: 'game_theme_id',
      card_back: 'card_back_id',
      sound_pack: 'sound_pack_id',
      emoji_pack: 'chat_bubble_id',
      sticker_pack: 'chat_bubble_id',
      booster: 'avatar_frame_id',
      pet_egg: 'pet_id', // Eggs are not directly equippable - use pet system
      pet_item: 'pet_id', // Pet items are used via pet system
      pet_equipment: 'pet_id' // Pet equipment is equipped via pet system
    };

    const column = columnMap[item.itemType];

    await pool.query(`
      UPDATE user_inventory
      SET is_equipped = FALSE
      WHERE user_id = ? AND item_id = ?
    `, [userId, itemId]);

    if (column) {
      await pool.query(`
        UPDATE user_equipped_items
        SET ${column} = NULL
        WHERE user_id = ? AND ${column} = ?
      `, [userId, itemId]);
    }
  }

  async getEquippedItems(userId: number): Promise<EquippedItems> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        ue.*,
        af.id as af_id, af.name as af_name, af.slug as af_slug, af.asset_url as af_asset_url, af.preview_url as af_preview_url, af.asset_data as af_asset_data, af.rarity as af_rarity,
        ae.id as ae_id, ae.name as ae_name, ae.slug as ae_slug, ae.asset_url as ae_asset_url, ae.preview_url as ae_preview_url, ae.asset_data as ae_asset_data, ae.rarity as ae_rarity,
        ab.id as ab_id, ab.name as ab_name, ab.slug as ab_slug, ab.asset_url as ab_asset_url, ab.preview_url as ab_preview_url, ab.asset_data as ab_asset_data, ab.rarity as ab_rarity,
        pt.id as pt_id, pt.name as pt_name, pt.slug as pt_slug, pt.asset_url as pt_asset_url, pt.preview_url as pt_preview_url, pt.asset_data as pt_asset_data, pt.rarity as pt_rarity,
        pb.id as pb_id, pb.name as pb_name, pb.slug as pb_slug, pb.asset_url as pb_asset_url, pb.preview_url as pb_preview_url, pb.asset_data as pb_asset_data, pb.rarity as pb_rarity,
        ne.id as ne_id, ne.name as ne_name, ne.slug as ne_slug, ne.asset_url as ne_asset_url, ne.preview_url as ne_preview_url, ne.asset_data as ne_asset_data, ne.rarity as ne_rarity,
        cb.id as cb_id, cb.name as cb_name, cb.slug as cb_slug, cb.asset_url as cb_asset_url, cb.preview_url as cb_preview_url, cb.asset_data as cb_asset_data, cb.rarity as cb_rarity,
        ti.id as ti_id, ti.name as ti_name, ti.slug as ti_slug, ti.asset_url as ti_asset_url, ti.preview_url as ti_preview_url, ti.asset_data as ti_asset_data, ti.rarity as ti_rarity,
        pe.id as pe_id, pe.name as pe_name, pe.slug as pe_slug, pe.asset_url as pe_asset_url, pe.preview_url as pe_preview_url, pe.asset_data as pe_asset_data, pe.rarity as pe_rarity,
        gt.id as gt_id, gt.name as gt_name, gt.slug as gt_slug, gt.asset_url as gt_asset_url, gt.preview_url as gt_preview_url, gt.asset_data as gt_asset_data, gt.rarity as gt_rarity,
        cback.id as cback_id, cback.name as cback_name, cback.slug as cback_slug, cback.asset_url as cback_asset_url, cback.preview_url as cback_preview_url, cback.asset_data as cback_asset_data, cback.rarity as cback_rarity,
        sp.id as sp_id, sp.name as sp_name, sp.slug as sp_slug, sp.asset_url as sp_asset_url, sp.preview_url as sp_preview_url, sp.asset_data as sp_asset_data, sp.rarity as sp_rarity
      FROM user_equipped_items ue
      LEFT JOIN shop_items af ON ue.avatar_frame_id = af.id
      LEFT JOIN shop_items ae ON ue.avatar_effect_id = ae.id
      LEFT JOIN shop_items ab ON ue.avatar_badge_id = ab.id
      LEFT JOIN shop_items pt ON ue.profile_theme_id = pt.id
      LEFT JOIN shop_items pb ON ue.profile_banner_id = pb.id
      LEFT JOIN shop_items ne ON ue.name_effect_id = ne.id
      LEFT JOIN shop_items cb ON ue.chat_bubble_id = cb.id
      LEFT JOIN shop_items ti ON ue.title_id = ti.id
      LEFT JOIN shop_items pe ON ue.pet_id = pe.id
      LEFT JOIN shop_items gt ON ue.game_theme_id = gt.id
      LEFT JOIN shop_items cback ON ue.card_back_id = cback.id
      LEFT JOIN shop_items sp ON ue.sound_pack_id = sp.id
      WHERE ue.user_id = ?
    `, [userId]);

    if (rows.length === 0) {
      return {
        avatarFrame: null,
        avatarEffect: null,
        avatarBadge: null,
        profileTheme: null,
        profileBanner: null,
        nameEffect: null,
        chatBubble: null,
        title: null,
        gameTheme: null,
        cardBack: null,
        soundPack: null
      };
    }

    const row = rows[0];

    const mapEquippedItem = (prefix: string, itemType: ItemType): ShopItem | null => {
      const id = row[`${prefix}_id`];
      if (!id) return null;

      return {
        id,
        name: row[`${prefix}_name`],
        slug: row[`${prefix}_slug`],
        description: null,
        categoryId: 0,
        itemType,
        priceCoins: 0,
        priceGems: 0,
        originalPrice: null,
        rarity: row[`${prefix}_rarity`],
        isAvailable: true,
        isLimited: false,
        limitedQuantity: null,
        soldCount: 0,
        availableFrom: null,
        availableUntil: null,
        requiredLevel: 0,
        requiredAchievement: null,
        assetUrl: row[`${prefix}_asset_url`],
        previewUrl: row[`${prefix}_preview_url`],
        assetData: typeof row[`${prefix}_asset_data`] === 'string'
          ? JSON.parse(row[`${prefix}_asset_data`])
          : row[`${prefix}_asset_data`],
        isConsumable: false,
        effectDurationMinutes: null,
        purchaseCount: 0,
        favoriteCount: 0
      };
    };

    return {
      avatarFrame: mapEquippedItem('af', 'avatar_frame'),
      avatarEffect: mapEquippedItem('ae', 'avatar_effect'),
      avatarBadge: mapEquippedItem('ab', 'avatar_badge'),
      profileTheme: mapEquippedItem('pt', 'profile_theme'),
      profileBanner: mapEquippedItem('pb', 'profile_banner'),
      nameEffect: mapEquippedItem('ne', 'name_effect'),
      chatBubble: mapEquippedItem('cb', 'chat_bubble'),
      title: mapEquippedItem('ti', 'title'),
      gameTheme: mapEquippedItem('gt', 'game_theme'),
      cardBack: mapEquippedItem('cback', 'card_back'),
      soundPack: mapEquippedItem('sp', 'sound_pack')
    };
  }

  // ==================== CURRENCY ====================

  async getUserCurrency(userId: number): Promise<UserCurrency> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        user_id as userId, coins, gems,
        total_coins_earned as totalCoinsEarned,
        total_coins_spent as totalCoinsSpent,
        total_gems_earned as totalGemsEarned,
        total_gems_spent as totalGemsSpent
      FROM user_currency
      WHERE user_id = ?
    `, [userId]);

    if (rows.length === 0) {
      // Create currency record if not exists
      await pool.query(`
        INSERT INTO user_currency (user_id, coins, gems)
        VALUES (?, 100, 0)
      `, [userId]);

      return {
        userId,
        coins: 100,
        gems: 0,
        totalCoinsEarned: 100,
        totalCoinsSpent: 0,
        totalGemsEarned: 0,
        totalGemsSpent: 0
      };
    }

    return rows[0] as UserCurrency;
  }

  async addCoins(
    userId: number,
    amount: number,
    transactionType: TransactionType,
    referenceType?: string,
    referenceId?: number,
    description?: string
  ): Promise<number> {
    if (amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Update balance
      await connection.query(`
        UPDATE user_currency
        SET coins = coins + ?,
            total_coins_earned = total_coins_earned + ?,
            updated_at = NOW()
        WHERE user_id = ?
      `, [amount, amount, userId]);

      // Get new balance
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT coins FROM user_currency WHERE user_id = ?
      `, [userId]);

      const newBalance = rows[0]?.coins || 0;

      // Record transaction
      await connection.query(`
        INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (?, 'coins', ?, ?, ?, ?, ?, ?)
      `, [userId, amount, newBalance, transactionType, referenceType || null, referenceId || null, description || null]);

      await connection.commit();

      return newBalance;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getCurrencyHistory(userId: number, limit: number = 20, offset: number = 0): Promise<CurrencyTransaction[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, user_id as userId, currency_type as currencyType,
        amount, balance_after as balanceAfter,
        transaction_type as transactionType,
        reference_type as referenceType, reference_id as referenceId,
        description, created_at as createdAt
      FROM currency_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    return rows as CurrencyTransaction[];
  }

  // ==================== DAILY DEALS ====================

  async getDailyDeals(userId?: number): Promise<DailyDeal[]> {
    let query = `
      SELECT
        dd.id, dd.discount_percent as discountPercent, dd.deal_price as dealPrice,
        dd.max_purchases as maxPurchases, dd.purchases_count as purchasesCount,
        si.id as itemId, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as originalPrice,
        si.rarity, si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData
    `;

    const params: any[] = [];

    if (userId) {
      query += `, (SELECT COUNT(*) FROM shop_purchases p WHERE p.user_id = ? AND p.item_id = si.id AND DATE(p.created_at) = CURDATE()) as purchasedCount`;
      params.push(userId);
    }

    query += `
      FROM shop_daily_deals dd
      JOIN shop_items si ON dd.item_id = si.id
      JOIN shop_categories c ON si.category_id = c.id
      WHERE dd.deal_date = CURDATE()
      ORDER BY dd.slot_number
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Calculate remaining time until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const remainingTime = Math.floor((midnight.getTime() - now.getTime()) / 1000);

    return rows.map(row => ({
      id: row.id,
      discountPercent: row.discountPercent,
      dealPrice: row.dealPrice,
      originalPrice: row.originalPrice,
      maxPurchases: row.maxPurchases,
      purchasesCount: row.purchasesCount,
      purchased: userId ? row.purchasedCount > 0 : false,
      remainingTime,
      item: {
        id: row.itemId,
        name: row.name,
        slug: row.slug,
        description: row.description,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        itemType: row.itemType,
        priceCoins: row.originalPrice,
        priceGems: 0,
        originalPrice: null,
        rarity: row.rarity,
        isAvailable: true,
        isLimited: false,
        limitedQuantity: null,
        soldCount: 0,
        availableFrom: null,
        availableUntil: null,
        requiredLevel: 0,
        requiredAchievement: null,
        assetUrl: row.assetUrl,
        previewUrl: row.previewUrl,
        assetData: typeof row.assetData === 'string' ? JSON.parse(row.assetData) : row.assetData,
        isConsumable: false,
        effectDurationMinutes: null,
        purchaseCount: 0,
        favoriteCount: 0
      }
    }));
  }

  async purchaseDailyDeal(userId: number, dealId: number): Promise<PurchaseResult> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Lock user's currency row
      const [currencyRows] = await connection.query<RowDataPacket[]>(`
        SELECT coins, gems FROM user_currency
        WHERE user_id = ? FOR UPDATE
      `, [userId]);

      if (currencyRows.length === 0) {
        throw new Error('USER_CURRENCY_NOT_FOUND');
      }

      const currency = currencyRows[0];

      // 2. Lock and get the daily deal
      const [dealRows] = await connection.query<RowDataPacket[]>(`
        SELECT dd.*, si.name, si.is_consumable, si.required_level, si.required_achievement
        FROM shop_daily_deals dd
        JOIN shop_items si ON dd.item_id = si.id
        WHERE dd.id = ? AND dd.deal_date = CURDATE()
        FOR UPDATE
      `, [dealId]);

      if (dealRows.length === 0) {
        throw new Error('DEAL_NOT_FOUND');
      }

      const deal = dealRows[0];
      const price = deal.deal_price; // Use the deal price, not original price!

      // 3. Check if already purchased today
      const [purchasedRows] = await connection.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM shop_purchases
        WHERE user_id = ? AND item_id = ? AND DATE(created_at) = CURDATE()
      `, [userId, deal.item_id]);

      if (purchasedRows[0].count > 0) {
        throw new Error('DEAL_ALREADY_PURCHASED');
      }

      // 4. Check max purchases for this deal
      if (deal.max_purchases && deal.purchases_count >= deal.max_purchases) {
        throw new Error('DEAL_SOLD_OUT');
      }

      // 5. Check balance
      if (currency.coins < price) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // 6. Check required level
      if (deal.required_level > 0) {
        const [userRows] = await connection.query<RowDataPacket[]>(`
          SELECT level FROM user_xp WHERE user_id = ?
        `, [userId]);
        const userLevel = userRows.length > 0 ? userRows[0].level : 1;
        if (userLevel < deal.required_level) {
          throw new Error('LEVEL_REQUIREMENT_NOT_MET');
        }
      }

      // 7. Check required achievement
      if (deal.required_achievement) {
        const [achievementRows] = await connection.query<RowDataPacket[]>(`
          SELECT id FROM user_achievements
          WHERE user_id = ? AND achievement_id = (
            SELECT id FROM achievements WHERE achievement_code = ?
          )
        `, [userId, deal.required_achievement]);
        if (achievementRows.length === 0) {
          throw new Error('ACHIEVEMENT_REQUIREMENT_NOT_MET');
        }
      }

      // 8. Check if already owned (non-consumable)
      if (!deal.is_consumable) {
        const [existingRows] = await connection.query<RowDataPacket[]>(`
          SELECT id FROM user_inventory
          WHERE user_id = ? AND item_id = ?
        `, [userId, deal.item_id]);

        if (existingRows.length > 0) {
          throw new Error('ALREADY_OWNED');
        }
      }

      // 9. Deduct coins (deal price!)
      await connection.query(`
        UPDATE user_currency
        SET coins = coins - ?,
            total_coins_spent = total_coins_spent + ?,
            updated_at = NOW()
        WHERE user_id = ?
      `, [price, price, userId]);

      // 10. Add to inventory
      await connection.query(`
        INSERT INTO user_inventory (user_id, item_id, quantity, purchase_price, purchased_at)
        VALUES (?, ?, 1, ?, NOW())
        ON DUPLICATE KEY UPDATE quantity = quantity + 1
      `, [userId, deal.item_id, price]);

      // 11. Record transaction
      await connection.query(`
        INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (?, 'coins', ?, ?, 'purchase', 'daily_deal', ?, ?)
      `, [userId, -price, currency.coins - price, dealId, `Daily Deal: ${deal.name}`]);

      // 12. Record purchase
      await connection.query(`
        INSERT INTO shop_purchases
        (user_id, item_id, quantity, unit_price, total_price, status)
        VALUES (?, ?, 1, ?, ?, 'completed')
      `, [userId, deal.item_id, price, price]);

      // 13. Increment deal purchases count
      await connection.query(`
        UPDATE shop_daily_deals
        SET purchases_count = purchases_count + 1
        WHERE id = ?
      `, [dealId]);

      await connection.commit();

      const purchasedItem = await this.getItemById(deal.item_id);

      return {
        success: true,
        item: purchasedItem!,
        newBalance: currency.coins - price
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async generateDailyDeals(): Promise<void> {
    // Check if deals already exist for today
    const [existing] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM shop_daily_deals WHERE deal_date = CURDATE()
    `);

    if (existing[0].count > 0) {
      return; // Deals already generated
    }

    // Get random items for deals
    const [items] = await pool.query<RowDataPacket[]>(`
      SELECT id, price_coins FROM shop_items
      WHERE is_available = TRUE AND is_consumable = FALSE AND price_coins >= 200
      ORDER BY RAND()
      LIMIT 6
    `);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const discountPercent = Math.floor(Math.random() * 31) + 20; // 20-50%
      const dealPrice = Math.floor(item.price_coins * (1 - discountPercent / 100));

      await pool.query(`
        INSERT INTO shop_daily_deals (item_id, discount_percent, deal_price, deal_date, slot_number)
        VALUES (?, ?, ?, CURDATE(), ?)
      `, [item.id, discountPercent, dealPrice, i + 1]);
    }
  }

  // ==================== BOOSTERS ====================

  async activateBooster(userId: number, itemId: number): Promise<ActiveBooster> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Lock inventory row - first check if item exists in inventory at all
      const [inventoryRows] = await connection.query<RowDataPacket[]>(`
        SELECT ui.*, si.name, si.asset_data, si.effect_duration_minutes
        FROM user_inventory ui
        JOIN shop_items si ON ui.item_id = si.id
        WHERE ui.user_id = ? AND ui.item_id = ?
        FOR UPDATE
      `, [userId, itemId]);

      if (inventoryRows.length === 0) {
        throw new Error('BOOSTER_NOT_OWNED');
      }

      const inventory = inventoryRows[0];

      // Check if quantity is 0 (already used)
      if (inventory.quantity <= 0) {
        throw new Error('BOOSTER_ALREADY_USED');
      }

      if (!inventory.effect_duration_minutes) {
        throw new Error('NOT_A_BOOSTER');
      }

      const activatedAt = new Date();
      const expiresAt = new Date(activatedAt.getTime() + inventory.effect_duration_minutes * 60 * 1000);

      // Decrement quantity and set activation time
      await connection.query(`
        UPDATE user_inventory
        SET quantity = quantity - 1,
            activated_at = ?,
            expires_at = ?
        WHERE user_id = ? AND item_id = ?
      `, [activatedAt, expiresAt, userId, itemId]);

      await connection.commit();

      const assetData = typeof inventory.asset_data === 'string'
        ? JSON.parse(inventory.asset_data)
        : inventory.asset_data;

      return {
        itemId,
        name: inventory.name,
        effectType: assetData?.type || 'xp',
        multiplier: assetData?.multiplier || 2,
        activatedAt,
        expiresAt,
        remainingMinutes: inventory.effect_duration_minutes
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getActiveBoosters(userId: number): Promise<ActiveBooster[]> {
    // Use UTC_TIMESTAMP() for consistent timezone comparison with stored UTC timestamps
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        ui.item_id as itemId, si.name, si.asset_data, si.effect_duration_minutes,
        ui.activated_at as activatedAt, ui.expires_at as expiresAt
      FROM user_inventory ui
      JOIN shop_items si ON ui.item_id = si.id
      WHERE ui.user_id = ?
      AND si.is_consumable = TRUE
      AND ui.activated_at IS NOT NULL
      AND ui.expires_at > UTC_TIMESTAMP()
    `, [userId]);

    const now = new Date();

    return rows
      .map(row => {
        const assetData = typeof row.asset_data === 'string'
          ? JSON.parse(row.asset_data)
          : row.asset_data;

        const expiresAt = new Date(row.expiresAt);
        const remainingMinutes = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));

        return {
          itemId: row.itemId,
          name: row.name,
          effectType: assetData?.type || 'xp',
          multiplier: assetData?.multiplier || 2,
          activatedAt: row.activatedAt,
          expiresAt: row.expiresAt,
          remainingMinutes
        };
      })
      // Double-check in JavaScript to filter out any boosters that might have just expired
      .filter(booster => booster.remainingMinutes > 0);
  }

  async checkBoosterEffect(userId: number, effectType: string): Promise<number> {
    // Use UTC_TIMESTAMP() for consistent timezone comparison with stored UTC timestamps
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT si.asset_data, ui.expires_at
      FROM user_inventory ui
      JOIN shop_items si ON ui.item_id = si.id
      WHERE ui.user_id = ?
      AND si.is_consumable = TRUE
      AND ui.activated_at IS NOT NULL
      AND ui.expires_at > UTC_TIMESTAMP()
    `, [userId]);

    for (const row of rows) {
      const assetData = typeof row.asset_data === 'string'
        ? JSON.parse(row.asset_data)
        : row.asset_data;

      if (assetData?.type === effectType) {
        return assetData.multiplier || 2;
      }
    }

    return 1; // No multiplier
  }

  // ==================== WISHLIST ====================

  async getWishlist(userId: number): Promise<ShopItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        si.id, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as priceCoins,
        si.price_gems as priceGems, si.original_price as originalPrice,
        si.rarity, si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData
      FROM shop_wishlists w
      JOIN shop_items si ON w.item_id = si.id
      JOIN shop_categories c ON si.category_id = c.id
      WHERE w.user_id = ?
      ORDER BY w.added_at DESC
    `, [userId]);

    return rows.map(row => this.mapItemRow(row));
  }

  async addToWishlist(userId: number, itemId: number): Promise<void> {
    await pool.query(`
      INSERT IGNORE INTO shop_wishlists (user_id, item_id)
      VALUES (?, ?)
    `, [userId, itemId]);
  }

  async removeFromWishlist(userId: number, itemId: number): Promise<void> {
    await pool.query(`
      DELETE FROM shop_wishlists
      WHERE user_id = ? AND item_id = ?
    `, [userId, itemId]);
  }

  // ==================== GIFTS ====================

  async sendGift(senderId: number, recipientId: number, itemId: number, message?: string): Promise<Gift> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify sender has enough coins and item exists
      const [itemRows] = await connection.query<RowDataPacket[]>(`
        SELECT id, name, price_coins, is_available, rarity, preview_url, item_type
        FROM shop_items
        WHERE id = ? AND is_available = TRUE
      `, [itemId]);

      if (itemRows.length === 0) {
        throw new Error('Item not available');
      }

      const item = itemRows[0];

      // Check sender balance
      const [balanceRows] = await connection.query<RowDataPacket[]>(`
        SELECT coins FROM user_currency WHERE user_id = ? FOR UPDATE
      `, [senderId]);

      const senderBalance = balanceRows[0]?.coins || 0;

      if (senderBalance < item.price_coins) {
        throw new Error('Insufficient coins');
      }

      // Check recipient exists
      const [recipientRows] = await connection.query<RowDataPacket[]>(`
        SELECT id, username, nickname FROM users WHERE id = ?
      `, [recipientId]);

      if (recipientRows.length === 0) {
        throw new Error('Recipient not found');
      }

      // Get sender info for return value
      const [senderRows] = await connection.query<RowDataPacket[]>(`
        SELECT username, nickname FROM users WHERE id = ?
      `, [senderId]);
      const sender = senderRows[0];

      // Deduct coins from sender
      await connection.query(`
        UPDATE user_currency
        SET coins = coins - ?,
            total_coins_spent = total_coins_spent + ?,
            updated_at = NOW()
        WHERE user_id = ?
      `, [item.price_coins, item.price_coins, senderId]);

      // Gift expires in 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create gift record
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO shop_gifts (sender_id, recipient_id, item_id, message, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `, [senderId, recipientId, itemId, message || null, expiresAt]);

      // Record transaction
      const [newBalance] = await connection.query<RowDataPacket[]>(`
        SELECT coins FROM user_currency WHERE user_id = ?
      `, [senderId]);

      await connection.query(`
        INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (?, 'coins', ?, ?, 'gift_sent', 'gift', ?, ?)
      `, [senderId, -item.price_coins, newBalance[0]?.coins || 0, result.insertId, `Gift: ${item.name}`]);

      await connection.commit();

      const recipient = recipientRows[0];

      // Create gift notification for recipient
      try {
        await gamificationService.createNotification(recipientId, {
          notificationType: 'gift',
          title: 'You received a gift!',
          message: `${sender?.nickname || sender?.username || 'Someone'} sent you ${item.name}`,
          icon: '🎁',
          actionUrl: `/shop/gifts?giftId=${result.insertId}`,
          metadata: {
            giftId: result.insertId,
            itemId,
            itemName: item.name,
            senderId,
            senderName: sender?.nickname || sender?.username || 'Unknown'
          }
        });
      } catch (notifError) {
        // Log but don't fail the gift transaction
        console.error('Failed to create gift notification:', notifError);
      }

      // Send chat message to recipient about the gift
      try {
        const conversation = await chatService.getOrCreateConversation(senderId, recipientId);
        const chatMessage = await chatService.createMessage({
          conversationId: conversation.id,
          senderId,
          messageType: 'gift',
          content: message || `🎁 I sent you a gift!`,
          metadata: {
            giftId: result.insertId,
            itemId,
            itemName: item.name,
            itemRarity: item.rarity,
            itemPreviewUrl: item.preview_url,
            itemType: item.item_type,
            giftMessage: message || null,
            status: 'pending',
            expiresAt: expiresAt.toISOString()
          }
        });
        // Emit real-time notification to recipient
        emitToUser(recipientId, 'message:new', chatMessage);
      } catch (chatError) {
        // Log but don't fail the gift transaction
        console.error('Failed to send gift chat message:', chatError);
      }

      return {
        id: result.insertId,
        senderId,
        senderName: sender?.nickname || sender?.username || 'Unknown',
        recipientId,
        recipientName: recipient.nickname || recipient.username,
        itemId,
        itemName: item.name,
        message: message || null,
        status: 'pending',
        sentAt: new Date(),
        expiresAt
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getReceivedGifts(userId: number): Promise<Gift[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        g.id, g.sender_id as senderId, g.recipient_id as recipientId,
        g.item_id as itemId, g.message, g.status,
        g.sent_at as sentAt, g.claimed_at as claimedAt, g.expires_at as expiresAt,
        u.username as senderUsername, u.nickname as senderNickname,
        si.name as itemName, si.slug as itemSlug, si.rarity, si.preview_url as previewUrl,
        si.item_type as itemType
      FROM shop_gifts g
      JOIN users u ON g.sender_id = u.id
      JOIN shop_items si ON g.item_id = si.id
      WHERE g.recipient_id = ?
      ORDER BY g.sent_at DESC
    `, [userId]);

    return rows.map(row => ({
      id: row.id,
      senderId: row.senderId,
      senderName: row.senderNickname || row.senderUsername,
      recipientId: row.recipientId,
      itemId: row.itemId,
      itemName: row.itemName,
      itemSlug: row.itemSlug,
      itemRarity: row.rarity,
      itemPreviewUrl: row.previewUrl,
      itemType: row.itemType,
      message: row.message,
      status: row.status,
      sentAt: row.sentAt,
      claimedAt: row.claimedAt,
      expiresAt: row.expiresAt
    }));
  }

  async getSentGifts(userId: number): Promise<Gift[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        g.id, g.sender_id as senderId, g.recipient_id as recipientId,
        g.item_id as itemId, g.message, g.status,
        g.sent_at as sentAt, g.claimed_at as claimedAt, g.expires_at as expiresAt,
        u.username as recipientUsername, u.nickname as recipientNickname,
        si.name as itemName, si.slug as itemSlug, si.rarity, si.preview_url as previewUrl,
        si.item_type as itemType
      FROM shop_gifts g
      JOIN users u ON g.recipient_id = u.id
      JOIN shop_items si ON g.item_id = si.id
      WHERE g.sender_id = ?
      ORDER BY g.sent_at DESC
    `, [userId]);

    return rows.map(row => ({
      id: row.id,
      senderId: row.senderId,
      recipientId: row.recipientId,
      recipientName: row.recipientNickname || row.recipientUsername,
      itemId: row.itemId,
      itemName: row.itemName,
      itemSlug: row.itemSlug,
      itemRarity: row.rarity,
      itemPreviewUrl: row.previewUrl,
      itemType: row.itemType,
      message: row.message,
      status: row.status,
      sentAt: row.sentAt,
      claimedAt: row.claimedAt,
      expiresAt: row.expiresAt
    }));
  }

  async claimGift(userId: number, giftId: number): Promise<{ success: boolean; inventoryId: number }> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Lock and verify gift
      const [giftRows] = await connection.query<RowDataPacket[]>(`
        SELECT g.*, si.is_consumable
        FROM shop_gifts g
        JOIN shop_items si ON g.item_id = si.id
        WHERE g.id = ? AND g.recipient_id = ? AND g.status = 'pending'
        FOR UPDATE
      `, [giftId, userId]);

      if (giftRows.length === 0) {
        throw new Error('Gift not found or already claimed');
      }

      const gift = giftRows[0];

      // Check expiration
      if (new Date(gift.expires_at) < new Date()) {
        await connection.query(`
          UPDATE shop_gifts SET status = 'expired' WHERE id = ?
        `, [giftId]);
        throw new Error('Gift has expired');
      }

      // Add to inventory
      let inventoryId: number;

      if (gift.is_consumable) {
        // For consumables, increment quantity if exists
        const [existing] = await connection.query<RowDataPacket[]>(`
          SELECT id FROM user_inventory WHERE user_id = ? AND item_id = ?
        `, [userId, gift.item_id]);

        if (existing.length > 0) {
          await connection.query(`
            UPDATE user_inventory
            SET quantity = quantity + 1
            WHERE user_id = ? AND item_id = ?
          `, [userId, gift.item_id]);
          inventoryId = existing[0].id;
        } else {
          const [result] = await connection.query<ResultSetHeader>(`
            INSERT INTO user_inventory (user_id, item_id, quantity, purchase_price, gifted_by)
            VALUES (?, ?, 1, 0, ?)
          `, [userId, gift.item_id, gift.sender_id]);
          inventoryId = result.insertId;
        }
      } else {
        // Non-consumables: check if already owned
        const [existing] = await connection.query<RowDataPacket[]>(`
          SELECT id FROM user_inventory WHERE user_id = ? AND item_id = ?
        `, [userId, gift.item_id]);

        if (existing.length > 0) {
          // Already owned - return the coins to sender
          await connection.query(`
            UPDATE shop_gifts SET status = 'returned' WHERE id = ?
          `, [giftId]);
          throw new Error('You already own this item');
        }

        const [result] = await connection.query<ResultSetHeader>(`
          INSERT INTO user_inventory (user_id, item_id, quantity, purchase_price, gifted_by)
          VALUES (?, ?, 1, 0, ?)
        `, [userId, gift.item_id, gift.sender_id]);
        inventoryId = result.insertId;
      }

      // Mark gift as claimed
      await connection.query(`
        UPDATE shop_gifts
        SET status = 'claimed', claimed_at = NOW()
        WHERE id = ?
      `, [giftId]);

      await connection.commit();

      // Emit realtime event to both sender and recipient about gift status change
      const giftStatusUpdate = {
        giftId,
        status: 'claimed',
        claimedAt: new Date().toISOString()
      };
      emitToUser(userId, 'gift:status_changed', giftStatusUpdate);
      emitToUser(gift.sender_id, 'gift:status_changed', giftStatusUpdate);

      return { success: true, inventoryId };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getPendingGiftCount(userId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count
      FROM shop_gifts
      WHERE recipient_id = ? AND status = 'pending' AND expires_at > NOW()
    `, [userId]);

    return rows[0]?.count || 0;
  }

  // ==================== BUNDLES ====================

  async getBundles(userId?: number): Promise<ShopBundle[]> {
    const [bundleRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        b.id, b.name, b.slug, b.description,
        b.price_coins as priceCoins, b.price_gems as priceGems,
        b.original_price as originalPrice, b.discount_percent as discountPercent,
        b.preview_url as previewUrl, b.is_available as isAvailable,
        b.available_from as availableFrom, b.available_until as availableUntil,
        b.is_limited as isLimited, b.limited_quantity as limitedQuantity,
        b.sold_count as soldCount
      FROM shop_bundles b
      WHERE b.is_available = TRUE
      AND (b.available_from IS NULL OR b.available_from <= NOW())
      AND (b.available_until IS NULL OR b.available_until > NOW())
      ORDER BY b.discount_percent DESC, b.created_at DESC
    `);

    const bundles: ShopBundle[] = [];

    for (const bundleRow of bundleRows) {
      // Get items in this bundle
      const [itemRows] = await pool.query<RowDataPacket[]>(`
        SELECT
          si.id, si.name, si.slug, si.description,
          si.category_id as categoryId, c.name as categoryName,
          si.item_type as itemType, si.price_coins as priceCoins,
          si.price_gems as priceGems, si.rarity,
          si.asset_url as assetUrl, si.preview_url as previewUrl,
          si.asset_data as assetData,
          bi.quantity
        FROM shop_bundle_items bi
        JOIN shop_items si ON bi.item_id = si.id
        JOIN shop_categories c ON si.category_id = c.id
        WHERE bi.bundle_id = ?
      `, [bundleRow.id]);

      const items: ShopItem[] = itemRows.map(row => ({
        ...this.mapItemRow(row),
        ownedQuantity: row.quantity
      }));

      // Check if user owns all items in bundle
      let isOwned = false;
      if (userId) {
        const [ownedCount] = await pool.query<RowDataPacket[]>(`
          SELECT COUNT(*) as count
          FROM shop_bundle_items bi
          JOIN user_inventory ui ON bi.item_id = ui.item_id AND ui.user_id = ?
          WHERE bi.bundle_id = ?
        `, [userId, bundleRow.id]);

        isOwned = ownedCount[0].count >= items.length;
      }

      bundles.push({
        id: bundleRow.id,
        name: bundleRow.name,
        slug: bundleRow.slug,
        description: bundleRow.description,
        priceCoins: bundleRow.priceCoins,
        priceGems: bundleRow.priceGems,
        originalPrice: bundleRow.originalPrice,
        discountPercent: bundleRow.discountPercent,
        previewUrl: bundleRow.previewUrl,
        isAvailable: !!bundleRow.isAvailable,
        availableFrom: bundleRow.availableFrom,
        availableUntil: bundleRow.availableUntil,
        isLimited: !!bundleRow.isLimited,
        limitedQuantity: bundleRow.limitedQuantity,
        soldCount: bundleRow.soldCount || 0,
        items,
        isOwned
      });
    }

    return bundles;
  }

  async getBundleBySlug(slug: string, userId?: number): Promise<ShopBundle | null> {
    const [bundleRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        b.id, b.name, b.slug, b.description,
        b.price_coins as priceCoins, b.price_gems as priceGems,
        b.original_price as originalPrice, b.discount_percent as discountPercent,
        b.preview_url as previewUrl, b.is_available as isAvailable,
        b.available_from as availableFrom, b.available_until as availableUntil,
        b.is_limited as isLimited, b.limited_quantity as limitedQuantity,
        b.sold_count as soldCount
      FROM shop_bundles b
      WHERE b.slug = ?
    `, [slug]);

    if (bundleRows.length === 0) return null;

    const bundleRow = bundleRows[0];

    // Get items in this bundle
    const [itemRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        si.id, si.name, si.slug, si.description,
        si.category_id as categoryId, c.name as categoryName,
        si.item_type as itemType, si.price_coins as priceCoins,
        si.price_gems as priceGems, si.rarity,
        si.asset_url as assetUrl, si.preview_url as previewUrl,
        si.asset_data as assetData,
        bi.quantity
      FROM shop_bundle_items bi
      JOIN shop_items si ON bi.item_id = si.id
      JOIN shop_categories c ON si.category_id = c.id
      WHERE bi.bundle_id = ?
    `, [bundleRow.id]);

    const items: ShopItem[] = itemRows.map(row => ({
      ...this.mapItemRow(row),
      ownedQuantity: row.quantity
    }));

    // Check ownership
    let isOwned = false;
    if (userId) {
      const [ownedCount] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count
        FROM shop_bundle_items bi
        JOIN user_inventory ui ON bi.item_id = ui.item_id AND ui.user_id = ?
        WHERE bi.bundle_id = ?
      `, [userId, bundleRow.id]);

      isOwned = ownedCount[0].count >= items.length;
    }

    return {
      id: bundleRow.id,
      name: bundleRow.name,
      slug: bundleRow.slug,
      description: bundleRow.description,
      priceCoins: bundleRow.priceCoins,
      priceGems: bundleRow.priceGems,
      originalPrice: bundleRow.originalPrice,
      discountPercent: bundleRow.discountPercent,
      previewUrl: bundleRow.previewUrl,
      isAvailable: !!bundleRow.isAvailable,
      availableFrom: bundleRow.availableFrom,
      availableUntil: bundleRow.availableUntil,
      isLimited: !!bundleRow.isLimited,
      limitedQuantity: bundleRow.limitedQuantity,
      soldCount: bundleRow.soldCount || 0,
      items,
      isOwned
    };
  }

  async purchaseBundle(userId: number, bundleId: number): Promise<BundlePurchaseResult> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Lock user's currency
      const [currencyRows] = await connection.query<RowDataPacket[]>(`
        SELECT coins, gems FROM user_currency
        WHERE user_id = ? FOR UPDATE
      `, [userId]);

      if (currencyRows.length === 0) {
        throw new Error('USER_CURRENCY_NOT_FOUND');
      }

      const currency = currencyRows[0];

      // Get and lock bundle
      const [bundleRows] = await connection.query<RowDataPacket[]>(`
        SELECT * FROM shop_bundles
        WHERE id = ?
        AND is_available = TRUE
        AND (available_from IS NULL OR available_from <= NOW())
        AND (available_until IS NULL OR available_until > NOW())
        FOR UPDATE
      `, [bundleId]);

      if (bundleRows.length === 0) {
        throw new Error('BUNDLE_NOT_AVAILABLE');
      }

      const bundleRow = bundleRows[0];
      const price = bundleRow.price_coins;

      // Check balance
      if (currency.coins < price) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // Check limited quantity
      if (bundleRow.is_limited && bundleRow.limited_quantity !== null) {
        if (bundleRow.sold_count >= bundleRow.limited_quantity) {
          throw new Error('BUNDLE_SOLD_OUT');
        }
      }

      // Get bundle items
      const [itemRows] = await connection.query<RowDataPacket[]>(`
        SELECT bi.item_id, bi.quantity, si.is_consumable, si.name
        FROM shop_bundle_items bi
        JOIN shop_items si ON bi.item_id = si.id
        WHERE bi.bundle_id = ?
      `, [bundleId]);

      // Check which items user already owns
      const [ownedRows] = await connection.query<RowDataPacket[]>(`
        SELECT item_id FROM user_inventory WHERE user_id = ?
      `, [userId]);

      const ownedItemIds = new Set(ownedRows.map(r => r.item_id));

      // Add items to inventory
      let itemsAdded = 0;
      for (const item of itemRows) {
        if (item.is_consumable) {
          // Consumables: add quantity
          await connection.query(`
            INSERT INTO user_inventory (user_id, item_id, quantity, purchase_price, purchased_at)
            VALUES (?, ?, ?, 0, NOW())
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
          `, [userId, item.item_id, item.quantity, item.quantity]);
          itemsAdded += item.quantity;
        } else {
          // Non-consumables: only add if not owned
          if (!ownedItemIds.has(item.item_id)) {
            await connection.query(`
              INSERT INTO user_inventory (user_id, item_id, quantity, purchase_price, purchased_at)
              VALUES (?, ?, 1, 0, NOW())
            `, [userId, item.item_id]);
            itemsAdded++;
          }
        }
      }

      // Deduct coins
      await connection.query(`
        UPDATE user_currency
        SET coins = coins - ?,
            total_coins_spent = total_coins_spent + ?,
            updated_at = NOW()
        WHERE user_id = ?
      `, [price, price, userId]);

      // Update bundle sold count
      await connection.query(`
        UPDATE shop_bundles
        SET sold_count = sold_count + 1
        WHERE id = ?
      `, [bundleId]);

      // Record transaction
      await connection.query(`
        INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (?, 'coins', ?, ?, 'purchase', 'bundle', ?, ?)
      `, [userId, -price, currency.coins - price, bundleId, `Purchased bundle: ${bundleRow.name}`]);

      await connection.commit();

      const bundle = await this.getBundleBySlug(bundleRow.slug, userId);

      return {
        success: true,
        bundle: bundle!,
        itemsAdded,
        newBalance: currency.coins - price
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==================== EGGS (PET SYSTEM) ====================
  // DEPRECATED: All egg/pet purchases should go through pet.service.ts
  // These methods are kept for backwards compatibility but will redirect
  // to pet.service in the future.
  //
  // Use instead:
  // - petService.getAvailableEggs() - Get eggs available for purchase
  // - petService.purchaseEgg() - Purchase and create a new egg
  // - petService.purchasePet() - Purchase a pet directly
  // ============================================================

  /**
   * @deprecated Use petService.getAvailableEggs() instead
   * This method queries pet_types directly but eggs should be shown
   * as shop_items with item_type='pet_egg' from the unified shop system
   */
  async getEggTypes(): Promise<EggShopItem[]> {
    // Return eggs from shop_items instead of pet_types
    const { items } = await this.getItems({
      itemType: 'pet_egg',
      limit: 100
    });

    // Map shop items to legacy EggShopItem format
    const eggs: EggShopItem[] = items.map(item => {
      const metadata = item.assetData || {};
      return {
        id: metadata.pet_type_id || item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        rarity: item.rarity,
        priceCoins: item.priceCoins,
        priceGems: item.priceGems,
        hatchXpRequired: metadata.hatch_xp_required || 100,
        hatchHoursMin: metadata.hatch_hours_min || 1,
        imageUrl: item.previewUrl,
        possiblePets: [], // Not available from shop_items, use petService for details
        isAvailable: item.isAvailable
      };
    });

    return eggs;
  }

  /**
   * @deprecated Use petService for egg details
   */
  async getEggTypeBySlug(slug: string): Promise<EggShopItem | null> {
    const item = await this.getItemBySlug(slug);
    if (!item || item.itemType !== 'pet_egg') return null;

    const metadata = item.assetData || {};
    return {
      id: metadata.pet_type_id || item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      rarity: item.rarity,
      priceCoins: item.priceCoins,
      priceGems: item.priceGems,
      hatchXpRequired: metadata.hatch_xp_required || 100,
      hatchHoursMin: metadata.hatch_hours_min || 1,
      imageUrl: item.previewUrl,
      possiblePets: [], // Use petService for possible pets
      isAvailable: item.isAvailable
    };
  }

  /**
   * @deprecated Use petService.purchaseEgg() instead
   * This method is kept for backwards compatibility but should not be used
   * for new code. Use petService.purchaseEgg() which handles:
   * - HP initialization
   * - Care log tracking
   * - Proper transaction types
   */
  async purchaseEgg(userId: number, eggTypeId: number): Promise<EggPurchaseResult> {
    // This is deprecated - redirect to pet service for proper handling
    // For now, keep the old implementation for backwards compatibility
    console.warn('shopService.purchaseEgg() is deprecated. Use petService.purchaseEgg() instead.');

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Lock user's currency
      const [currencyRows] = await connection.query<RowDataPacket[]>(`
        SELECT coins FROM user_currency
        WHERE user_id = ? FOR UPDATE
      `, [userId]);

      if (currencyRows.length === 0) {
        // Create initial currency if doesn't exist
        await connection.query(`
          INSERT INTO user_currency (user_id, coins, gems)
          VALUES (?, 100, 0)
        `, [userId]);
        throw new Error('INSUFFICIENT_COINS');
      }

      const userCoins = currencyRows[0].coins;

      // Get egg type
      const [eggRows] = await connection.query<RowDataPacket[]>(`
        SELECT id, name, shop_price_coins as price_coins, hatch_xp_required, hatch_hours_min
        FROM pet_types
        WHERE id = ? AND is_egg = TRUE AND is_available = TRUE
      `, [eggTypeId]);

      if (eggRows.length === 0) {
        throw new Error('EGG_TYPE_NOT_FOUND');
      }

      const eggType = eggRows[0];

      if (userCoins < eggType.price_coins) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // Deduct coins
      await connection.query(`
        UPDATE user_currency
        SET coins = coins - ?,
            total_coins_spent = total_coins_spent + ?,
            updated_at = NOW()
        WHERE user_id = ?
      `, [eggType.price_coins, eggType.price_coins, userId]);

      // Create user_pet record (egg) with HP initialized
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO user_pets
        (user_id, pet_type_id, is_hatched, hatch_xp_progress, hatch_started_at, hp)
        VALUES (?, ?, FALSE, 0, NOW(), 100)
      `, [userId, eggTypeId]);

      const eggId = result.insertId;

      // Get new balance
      const [newBalanceRows] = await connection.query<RowDataPacket[]>(`
        SELECT coins FROM user_currency WHERE user_id = ?
      `, [userId]);

      const newBalance = newBalanceRows[0]?.coins || 0;

      // Record transaction with new transaction type
      await connection.query(`
        INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (?, 'coins', ?, ?, 'egg_purchase', 'pet_egg', ?, ?)
      `, [userId, -eggType.price_coins, newBalance, eggId, `Purchased egg: ${eggType.name}`]);

      await connection.commit();

      return {
        success: true,
        egg: {
          id: eggId,
          userId,
          petTypeId: eggTypeId,
          nickname: null,
          isHatched: false,
          hatchXpProgress: 0,
          hatchStartedAt: new Date().toISOString()
        },
        newBalance,
        message: `You purchased a ${eggType.name}! Start earning XP to hatch it.`
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==================== HELPERS ====================

  private mapItemRow(row: RowDataPacket): ShopItem {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      itemType: row.itemType,
      priceCoins: row.priceCoins,
      priceGems: row.priceGems || 0,
      originalPrice: row.originalPrice,
      rarity: row.rarity,
      isAvailable: !!row.isAvailable,
      isLimited: !!row.isLimited,
      limitedQuantity: row.limitedQuantity,
      soldCount: row.soldCount || 0,
      availableFrom: row.availableFrom,
      availableUntil: row.availableUntil,
      requiredLevel: row.requiredLevel || 0,
      requiredAchievement: row.requiredAchievement,
      assetUrl: row.assetUrl,
      previewUrl: row.previewUrl,
      assetData: typeof row.assetData === 'string' ? JSON.parse(row.assetData) : row.assetData,
      isConsumable: !!row.isConsumable,
      effectDurationMinutes: row.effectDurationMinutes,
      purchaseCount: row.purchaseCount || 0,
      favoriteCount: row.favoriteCount || 0
    };
  }
}

export const shopService = new ShopService();
export default shopService;
