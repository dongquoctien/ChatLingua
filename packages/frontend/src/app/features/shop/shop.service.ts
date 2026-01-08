import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  | 'pet_equipment'
  | 'egg'; // Legacy alias for pet_egg

export type Rarity = 'common' | 'uncommon' | 'rare' | 'heroic' | 'mythic' | 'epic' | 'legendary';
export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'weapon' | 'back' | 'feet';
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
  | 'admin_grant';

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

export interface ShopItemDeal {
  dealId: number;
  discountPercent: number;
  dealPrice: number;
  originalPrice: number;
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
  availableFrom: string | null;
  availableUntil: string | null;
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
  deal?: ShopItemDeal;
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
  activatedAt: string | null;
  expiresAt: string | null;
  purchasedAt: string;
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
  pet: ShopItem | null;
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
  createdAt: string;
}

export interface PurchaseResult {
  success: boolean;
  item: ShopItem;
  newBalance: number;
  message?: string;
}

export interface ActiveBooster {
  itemId: number;
  name: string;
  effectType: string;
  multiplier: number;
  activatedAt: string;
  expiresAt: string;
  remainingMinutes: number;
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
  itemType?: ItemType;
  item?: ShopItem;
  message: string | null;
  status: 'pending' | 'claimed' | 'expired' | 'returned';
  sentAt: string;
  claimedAt?: string | null;
  expiresAt: string;
}

export interface GetItemsParams {
  category?: string;
  type?: ItemType;
  rarity?: Rarity;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'popularity' | 'newest';
  limit?: number;
  offset?: number;
}

export interface GetItemsResponse {
  items: ShopItem[];
  total: number;
}

// Pet Care Item types
export type PetItemCategory = 'food' | 'toy' | 'heart' | 'medicine' | 'accessory' | 'special';

export interface PetCareItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  itemCategory: PetItemCategory;
  happinessBonus: number;
  energyBonus: number;
  hungerReduction: number;
  hpBonus: number | null;
  priceCoins: number;
  rarity: Rarity;
  iconUrl: string | null;
  ownedQuantity?: number;
  // Stock management fields
  weeklyStock: number | null;
  currentStock: number | null;
  stockResetAt?: string | null;
}

export interface PetCareInventoryItem {
  itemId: number;
  name: string;
  category: PetItemCategory;
  quantity: number;
  iconUrl: string | null;
}

export interface PetCareResponse {
  items: {
    food: PetCareItem[];
    toy: PetCareItem[];
    heart: PetCareItem[];
    medicine: PetCareItem[];
    accessory: PetCareItem[];
    special: PetCareItem[];
  };
  inventory: PetCareInventoryItem[];
}

// Pet Equipment types
export interface PetEquipmentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  equipmentSlot: EquipmentSlot;
  rarity: Rarity;
  happinessBonus: number;
  energyBonus: number;
  xpBonusPercent: number;
  coinBonusPercent: number;
  spriteData: Record<string, any> | null;
  previewUrl: string | null;
  priceCoins: number;
  priceGems: number;
  requiredPetLevel: number;
  requiredEvolutionStage: number;
  isAvailable: boolean;
  owned?: number;
  equipped?: boolean;
}

export interface UserPetEquipment {
  id: number;
  equipmentTypeId: number;
  name?: string;
  slot?: EquipmentSlot;
  equippedPetId: number | null;
  previewUrl?: string | null;
}

export interface PetEquipmentResponse {
  equipment: {
    head: PetEquipmentType[];
    body: PetEquipmentType[];
    accessory: PetEquipmentType[];
    weapon: PetEquipmentType[];
    back: PetEquipmentType[];
    feet: PetEquipmentType[];
  };
  userEquipment: UserPetEquipment[];
}

export interface PetEquipmentPurchaseResult {
  success: boolean;
  equipment: UserPetEquipment;
  message: string;
  currency: {
    coins: number;
    gems: number;
  };
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
  availableFrom: string | null;
  availableUntil: string | null;
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

// Egg-related types for shop (matches ExtendedPetType from backend)
export interface EggShopItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  rarity: Rarity;
  isEgg: boolean;
  hatchXpRequired: number;
  hatchHoursMin: number;
  imageUrl: string | null;
  acquisitionType: string;
  shopPriceCoins: number;
  shopPriceGems: number;
}

export interface EggPossiblePet {
  petTypeId: number;
  name: string;
  slug: string;
  rarity: Rarity;
  weight: number;
  probability: number;
  imageUrl: string | null;
}

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

// ============================================================
// Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ==================== Categories ====================

  getCategories(): Observable<ShopCategory[]> {
    return this.http.get<ShopCategory[]>(`${this.apiUrl}/shop/categories`);
  }

  getCategoryBySlug(slug: string): Observable<ShopCategory> {
    return this.http.get<ShopCategory>(`${this.apiUrl}/shop/categories/${slug}`);
  }

  // ==================== Items ====================

  getItems(params: GetItemsParams = {}): Observable<GetItemsResponse> {
    let httpParams = new HttpParams();

    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.rarity) httpParams = httpParams.set('rarity', params.rarity);
    if (params.minPrice !== undefined) httpParams = httpParams.set('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());

    return this.http.get<GetItemsResponse>(`${this.apiUrl}/shop/items`, { params: httpParams });
  }

  getFeaturedItems(limit: number = 8): Observable<ShopItem[]> {
    return this.http.get<ShopItem[]>(`${this.apiUrl}/shop/items/featured`, {
      params: new HttpParams().set('limit', limit.toString())
    });
  }

  getItemBySlug(slug: string): Observable<ShopItem> {
    return this.http.get<ShopItem>(`${this.apiUrl}/shop/items/${slug}`);
  }

  // ==================== Purchase ====================

  purchaseItem(itemId: number, quantity: number = 1): Observable<PurchaseResult> {
    return this.http.post<PurchaseResult>(`${this.apiUrl}/shop/purchase`, { itemId, quantity });
  }

  // ==================== Inventory ====================

  getInventory(type?: ItemType): Observable<InventoryItem[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/shop/inventory`, { params });
  }

  equipItem(itemId: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/shop/inventory/${itemId}/equip`, {});
  }

  unequipItem(itemId: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/shop/inventory/${itemId}/unequip`, {});
  }

  getEquippedItems(): Observable<EquippedItems> {
    return this.http.get<EquippedItems>(`${this.apiUrl}/shop/equipped`);
  }

  // ==================== Currency ====================

  getCurrency(): Observable<UserCurrency> {
    return this.http.get<UserCurrency>(`${this.apiUrl}/shop/currency`);
  }

  getCurrencyHistory(limit: number = 20, offset: number = 0): Observable<CurrencyTransaction[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<CurrencyTransaction[]>(`${this.apiUrl}/shop/currency/history`, { params });
  }

  // ==================== Daily Deals ====================

  getDailyDeals(): Observable<DailyDeal[]> {
    return this.http.get<DailyDeal[]>(`${this.apiUrl}/shop/daily-deals`);
  }

  purchaseDailyDeal(dealId: number): Observable<PurchaseResult> {
    return this.http.post<PurchaseResult>(`${this.apiUrl}/shop/daily-deals/${dealId}/purchase`, {});
  }

  // ==================== Bundles ====================

  getBundles(): Observable<ShopBundle[]> {
    return this.http.get<ShopBundle[]>(`${this.apiUrl}/shop/bundles`);
  }

  getBundleBySlug(slug: string): Observable<ShopBundle> {
    return this.http.get<ShopBundle>(`${this.apiUrl}/shop/bundles/${slug}`);
  }

  purchaseBundle(bundleId: number): Observable<BundlePurchaseResult> {
    return this.http.post<BundlePurchaseResult>(`${this.apiUrl}/shop/bundles/${bundleId}/purchase`, {});
  }

  // ==================== Boosters ====================

  activateBooster(itemId: number): Observable<ActiveBooster> {
    return this.http.post<ActiveBooster>(`${this.apiUrl}/shop/boosters/${itemId}/activate`, {});
  }

  getActiveBoosters(): Observable<ActiveBooster[]> {
    return this.http.get<ActiveBooster[]>(`${this.apiUrl}/shop/boosters/active`);
  }

  // ==================== Wishlist ====================

  getWishlist(): Observable<ShopItem[]> {
    return this.http.get<ShopItem[]>(`${this.apiUrl}/shop/wishlist`);
  }

  addToWishlist(itemId: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/shop/wishlist/${itemId}`, {});
  }

  removeFromWishlist(itemId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/shop/wishlist/${itemId}`);
  }

  // ==================== Gifts ====================

  sendGift(recipientId: number, itemId: number, message?: string): Observable<Gift> {
    return this.http.post<Gift>(`${this.apiUrl}/shop/gift`, { recipientId, itemId, message });
  }

  getReceivedGifts(): Observable<Gift[]> {
    return this.http.get<Gift[]>(`${this.apiUrl}/shop/gifts/received`);
  }

  getSentGifts(): Observable<Gift[]> {
    return this.http.get<Gift[]>(`${this.apiUrl}/shop/gifts/sent`);
  }

  claimGift(giftId: number): Observable<{ success: boolean; inventoryId: number }> {
    return this.http.post<{ success: boolean; inventoryId: number }>(`${this.apiUrl}/shop/gifts/${giftId}/claim`, {});
  }

  getPendingGiftCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/shop/gifts/pending-count`);
  }

  // ==================== Pet Care Items ====================

  getPetCareItems(category?: PetItemCategory): Observable<PetCareResponse> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<PetCareResponse>(`${this.apiUrl}/shop/pet-care`, { params });
  }

  purchasePetCareItem(itemId: number, quantity: number = 1): Observable<{ success: boolean; newBalance: number; remainingStock?: number | null }> {
    return this.http.post<{ success: boolean; newBalance: number; remainingStock?: number | null }>(`${this.apiUrl}/pets/items/buy`, { itemId, quantity });
  }

  // ==================== Pet Equipment ====================

  getPetEquipment(slot?: EquipmentSlot): Observable<PetEquipmentResponse> {
    let params = new HttpParams();
    if (slot) params = params.set('slot', slot);
    return this.http.get<PetEquipmentResponse>(`${this.apiUrl}/shop/pet-equipment`, { params });
  }

  purchasePetEquipment(equipmentTypeId: number): Observable<PetEquipmentPurchaseResult> {
    return this.http.post<PetEquipmentPurchaseResult>(`${this.apiUrl}/shop/pet-equipment/${equipmentTypeId}/purchase`, {});
  }

  // ==================== Eggs ====================
  // DEPRECATED: Use PetService for egg operations instead
  // These methods are kept for backward compatibility but will be removed in a future version

  /**
   * @deprecated Use PetService.getEggTypes() instead
   */
  getEggTypes(): Observable<EggShopItem[]> {
    console.warn('ShopService.getEggTypes() is deprecated. Use PetService.getEggTypes() instead.');
    return this.http.get<EggShopItem[]>(`${this.apiUrl}/shop/eggs`);
  }

  /**
   * @deprecated Use PetService.getEggTypeBySlug() instead
   */
  getEggTypeBySlug(slug: string): Observable<EggShopItem> {
    console.warn('ShopService.getEggTypeBySlug() is deprecated. Use PetService methods instead.');
    return this.http.get<EggShopItem>(`${this.apiUrl}/shop/eggs/${slug}`);
  }

  /**
   * @deprecated Use PetService.purchaseEgg() instead
   */
  purchaseEgg(eggTypeId: number): Observable<EggPurchaseResult> {
    console.warn('ShopService.purchaseEgg() is deprecated. Use PetService.purchaseEgg() instead.');
    return this.http.post<EggPurchaseResult>(`${this.apiUrl}/shop/eggs/${eggTypeId}/purchase`, {});
  }

  /**
   * @deprecated Use PetService.getEggImageUrl() instead
   */
  getEggImageUrl(rarity: string): string {
    return `/assets/eggs/egg-${rarity}.svg`;
  }

  // ==================== Helpers ====================

  getRarityColor(rarity: Rarity): string {
    const colors: Record<Rarity, string> = {
      common: 'text-gray-500',
      uncommon: 'text-green-500',
      rare: 'text-blue-500',
      heroic: 'text-red-500',
      mythic: 'text-orange-500',
      epic: 'text-purple-500',
      legendary: 'text-yellow-500'
    };
    return colors[rarity] || 'text-gray-500';
  }

  getRarityBgColor(rarity: Rarity): string {
    const colors: Record<Rarity, string> = {
      common: 'bg-gray-100',
      uncommon: 'bg-green-50',
      rare: 'bg-blue-50',
      heroic: 'bg-red-50',
      mythic: 'bg-orange-50',
      epic: 'bg-purple-50',
      legendary: 'bg-yellow-50'
    };
    return colors[rarity] || 'bg-gray-100';
  }

  getItemTypeIcon(type: ItemType): string {
    const icons: Record<ItemType, string> = {
      avatar_frame: 'fa-circle-user',
      avatar_effect: 'fa-sparkles',
      avatar_badge: 'fa-medal',
      profile_theme: 'fa-palette',
      profile_banner: 'fa-image',
      name_effect: 'fa-font',
      chat_bubble: 'fa-comment',
      emoji_pack: 'fa-face-smile',
      sticker_pack: 'fa-note-sticky',
      game_theme: 'fa-gamepad',
      card_back: 'fa-clone',
      sound_pack: 'fa-volume-high',
      booster: 'fa-bolt',
      title: 'fa-crown',
      pet_egg: 'fa-egg',
      pet_item: 'fa-bone',
      pet_equipment: 'fa-shield',
      egg: 'fa-egg'
    };
    return icons[type] || 'fa-box';
  }

  getItemTypeName(type: ItemType): string {
    const names: Record<ItemType, string> = {
      avatar_frame: 'Avatar Frame',
      avatar_effect: 'Avatar Effect',
      avatar_badge: 'Avatar Badge',
      profile_theme: 'Profile Theme',
      profile_banner: 'Profile Banner',
      name_effect: 'Name Effect',
      chat_bubble: 'Chat Bubble',
      emoji_pack: 'Emoji Pack',
      sticker_pack: 'Sticker Pack',
      game_theme: 'Game Theme',
      card_back: 'Card Back',
      sound_pack: 'Sound Pack',
      booster: 'Booster',
      title: 'Title',
      pet_egg: 'Pet Egg',
      pet_item: 'Pet Item',
      pet_equipment: 'Pet Equipment',
      egg: 'Egg'
    };
    return names[type] || 'Item';
  }

  getEquipmentSlotName(slot: EquipmentSlot): string {
    const names: Record<EquipmentSlot, string> = {
      head: 'Head',
      body: 'Body',
      accessory: 'Accessory',
      weapon: 'Weapon',
      back: 'Back',
      feet: 'Feet'
    };
    return names[slot] || slot;
  }

  getEquipmentSlotIcon(slot: EquipmentSlot): string {
    const icons: Record<EquipmentSlot, string> = {
      head: 'fa-hat-wizard',
      body: 'fa-shirt',
      accessory: 'fa-gem',
      weapon: 'fa-wand-sparkles',
      back: 'fa-wind',
      feet: 'fa-shoe-prints'
    };
    return icons[slot] || 'fa-box';
  }

  formatPrice(coins: number | undefined | null): string {
    if (coins == null) {
      return '0';
    }
    if (coins >= 1000000) {
      return (coins / 1000000).toFixed(1) + 'M';
    }
    if (coins >= 1000) {
      return (coins / 1000).toFixed(1) + 'K';
    }
    return coins.toString();
  }
}
