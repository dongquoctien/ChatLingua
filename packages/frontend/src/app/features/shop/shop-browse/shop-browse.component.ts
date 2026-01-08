import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShopService, ShopItem, ShopCategory, UserCurrency, ItemType, Rarity, PetCareItem, PetItemCategory } from '../shop.service';
import { PetService } from '../../pets/services/pet.service';
import { ChatService } from '../../chat/services/chat.service';

type BrowseTab = 'items' | 'pet-care';

@Component({
  selector: 'app-shop-browse',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shop-browse.component.html',
  styleUrls: ['./shop-browse.component.scss']
})
export class ShopBrowseComponent implements OnInit {
  private shopService = inject(ShopService);
  private petService = inject(PetService);
  private chatService = inject(ChatService);
  private route = inject(ActivatedRoute);

  // Tab management
  activeTab = signal<BrowseTab>('items');

  categories = signal<ShopCategory[]>([]);
  items = signal<ShopItem[]>([]);
  currency = signal<UserCurrency | null>(null);
  total = signal(0);
  loading = signal(true);

  // Pet Care items
  petCareItems = signal<Record<PetItemCategory, PetCareItem[]>>({
    food: [],
    toy: [],
    heart: [],
    medicine: [],
    accessory: [],
    special: []
  });
  petCareLoading = signal(false);
  selectedPetCategory = signal<PetItemCategory | 'all'>('all');
  purchasingItemId = signal<number | null>(null);

  // Animation state for +1 effect
  purchaseAnimations = signal<Map<number, boolean>>(new Map());
  // Cooldown state for spam prevention (1s delay)
  purchaseCooldowns = signal<Set<number>>(new Set());

  // Item detail modal state
  selectedItem = signal<ShopItem | null>(null);
  purchasingShopItemId = signal<number | null>(null);
  itemPurchaseSuccess = signal<{ itemName: string; item: ShopItem } | null>(null);

  // Gift modal state
  showGiftModal = signal(false);
  giftItem = signal<ShopItem | null>(null);
  selectedRecipient = signal<{ id: number; username: string; displayName: string | null; avatar: string | null } | null>(null);
  userSearchQuery = signal('');
  userSearchResults = signal<{ id: number; username: string; displayName: string | null; avatar: string | null }[]>([]);
  searchingUsers = signal(false);
  giftMessage = signal('');
  sendingGift = signal(false);
  giftError = signal<string | null>(null);
  giftSuccess = signal<string | null>(null);
  private searchTimeout: any;

  // Filters
  selectedCategory = signal<string>('');
  selectedType = signal<ItemType | ''>('');
  selectedRarity = signal<Rarity | ''>('');
  searchQuery = signal('');
  sortBy = signal<'popularity' | 'price_asc' | 'price_desc' | 'newest'>('popularity');
  page = signal(1);
  pageSize = 20;

  itemTypes: { value: ItemType | ''; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'avatar_frame', label: 'Avatar Frame' },
    { value: 'avatar_effect', label: 'Avatar Effect' },
    { value: 'avatar_badge', label: 'Avatar Badge' },
    { value: 'profile_theme', label: 'Profile Theme' },
    { value: 'profile_banner', label: 'Profile Banner' },
    { value: 'name_effect', label: 'Name Effect' },
    { value: 'chat_bubble', label: 'Chat Bubble' },
    { value: 'emoji_pack', label: 'Emoji Pack' },
    { value: 'sticker_pack', label: 'Sticker Pack' },
    { value: 'game_theme', label: 'Game Theme' },
    { value: 'card_back', label: 'Card Back' },
    { value: 'sound_pack', label: 'Sound Pack' },
    { value: 'booster', label: 'Booster' },
    { value: 'title', label: 'Title' },
    { value: 'egg', label: 'Egg' }
  ];

  rarities: { value: Rarity | ''; label: string }[] = [
    { value: '', label: 'All Rarities' },
    { value: 'common', label: 'Common' },
    { value: 'uncommon', label: 'Uncommon' },
    { value: 'rare', label: 'Rare' },
    { value: 'heroic', label: 'Heroic' },
    { value: 'mythic', label: 'Mythic' },
    { value: 'epic', label: 'Epic' },
    { value: 'legendary', label: 'Legendary' }
  ];

  sortOptions = [
    { value: 'popularity', label: 'Most Popular' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' }
  ];

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize) || 1);

  ngOnInit(): void {
    // Load categories
    this.shopService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err) => console.error('Failed to load categories', err)
    });

    // Load currency
    this.shopService.getCurrency().subscribe({
      next: (curr) => this.currency.set(curr),
      error: (err) => console.error('Failed to load currency', err)
    });

    // Get initial category from query params
    this.route.queryParams.subscribe(params => {
      // Handle pet-care tab
      if (params['category'] === 'pet-care') {
        this.activeTab.set('pet-care');
        this.loadPetCareItems();
        return;
      }

      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
      if (params['type']) {
        this.selectedType.set(params['type'] as ItemType);
      }
      if (params['rarity']) {
        this.selectedRarity.set(params['rarity'] as Rarity);
      }
      this.loadItems();
    });
  }

  setActiveTab(tab: BrowseTab): void {
    this.activeTab.set(tab);
    if (tab === 'pet-care' && this.petCareItems().food.length === 0) {
      this.loadPetCareItems();
    }
  }

  loadPetCareItems(): void {
    this.petCareLoading.set(true);
    this.shopService.getPetCareItems().subscribe({
      next: (response) => {
        // Ensure all categories exist (backend might not return all)
        const items: Record<PetItemCategory, PetCareItem[]> = {
          food: response.items.food || [],
          toy: response.items.toy || [],
          heart: response.items.heart || [],
          medicine: response.items.medicine || [],
          accessory: response.items.accessory || [],
          special: response.items.special || []
        };
        this.petCareItems.set(items);
        this.petCareLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load pet care items', err);
        this.petCareLoading.set(false);
      }
    });
  }

  purchasePetCareItem(itemId: number): void {
    // Check cooldown (1s delay to prevent spam)
    if (this.purchaseCooldowns().has(itemId)) {
      return;
    }

    // Check stock
    const item = this.filteredPetCareItems().find(i => i.id === itemId);
    if (item && item.weeklyStock !== null && item.weeklyStock !== undefined) {
      if (!item.currentStock || item.currentStock <= 0) {
        return; // Out of stock
      }
    }

    this.purchasingItemId.set(itemId);

    // Add to cooldown set
    const newCooldowns = new Set(this.purchaseCooldowns());
    newCooldowns.add(itemId);
    this.purchaseCooldowns.set(newCooldowns);

    this.shopService.purchasePetCareItem(itemId, 1).subscribe({
      next: () => {
        this.purchasingItemId.set(null);

        // Trigger +1 animation
        const newAnimations = new Map(this.purchaseAnimations());
        newAnimations.set(itemId, true);
        this.purchaseAnimations.set(newAnimations);

        // Remove animation after 600ms
        setTimeout(() => {
          const animations = new Map(this.purchaseAnimations());
          animations.delete(itemId);
          this.purchaseAnimations.set(animations);
        }, 600);

        // Remove from cooldown after 1s
        setTimeout(() => {
          const cooldowns = new Set(this.purchaseCooldowns());
          cooldowns.delete(itemId);
          this.purchaseCooldowns.set(cooldowns);
        }, 1000);

        // Reload to update owned quantities and stock
        this.loadPetCareItems();
        // Reload currency
        this.shopService.getCurrency().subscribe({
          next: (curr) => this.currency.set(curr)
        });
        // Refresh pet service inventory (for widget real-time update)
        this.petService.refreshInventory();
      },
      error: (err) => {
        console.error('Failed to purchase item', err);
        this.purchasingItemId.set(null);

        // Remove from cooldown on error
        const cooldowns = new Set(this.purchaseCooldowns());
        cooldowns.delete(itemId);
        this.purchaseCooldowns.set(cooldowns);
      }
    });
  }

  // Helper to check if item is in animation state
  isAnimating(itemId: number): boolean {
    return this.purchaseAnimations().get(itemId) ?? false;
  }

  // Helper to check if item is in cooldown
  isInCooldown(itemId: number): boolean {
    return this.purchaseCooldowns().has(itemId);
  }

  // Check if item is out of stock
  isOutOfStock(item: PetCareItem): boolean {
    if (item.weeklyStock === null || item.weeklyStock === undefined) {
      return false; // Unlimited stock
    }
    return !item.currentStock || item.currentStock <= 0;
  }

  filteredPetCareItems = computed(() => {
    const items = this.petCareItems();
    const category = this.selectedPetCategory();

    if (category === 'all') {
      // Return all items flattened
      return [
        ...items.food,
        ...items.toy,
        ...items.heart,
        ...items.medicine,
        ...items.special
      ];
    }

    return items[category] || [];
  });

  getPetCategoryIcon(category: PetItemCategory | 'all'): string {
    const icons: Record<PetItemCategory | 'all', string> = {
      all: '📦',
      food: '🍖',
      toy: '🎾',
      heart: '❤️',
      medicine: '💊',
      accessory: '🎀',
      special: '✨'
    };
    return icons[category] || '📦';
  }

  getPetCategoryName(category: PetItemCategory | 'all'): string {
    const names: Record<PetItemCategory | 'all', string> = {
      all: 'All Items',
      food: 'Food',
      toy: 'Toys',
      heart: 'Gifts',
      medicine: 'Medicine',
      accessory: 'Accessories',
      special: 'Special'
    };
    return names[category] || category;
  }

  petCategories: (PetItemCategory | 'all')[] = ['all', 'food', 'toy', 'heart', 'medicine', 'special'];

  loadItems(): void {
    this.loading.set(true);

    this.shopService.getItems({
      category: this.selectedCategory() || undefined,
      type: this.selectedType() || undefined,
      rarity: this.selectedRarity() || undefined,
      search: this.searchQuery() || undefined,
      sort: this.sortBy(),
      limit: this.pageSize,
      offset: (this.page() - 1) * this.pageSize
    }).subscribe({
      next: (response) => {
        this.items.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load items', err);
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadItems();
  }

  onSearch(): void {
    this.page.set(1);
    this.loadItems();
  }

  clearFilters(): void {
    this.selectedCategory.set('');
    this.selectedType.set('');
    this.selectedRarity.set('');
    this.searchQuery.set('');
    this.sortBy.set('popularity');
    this.page.set(1);
    this.loadItems();
  }

  goToPage(pageNum: number): void {
    if (pageNum >= 1 && pageNum <= this.totalPages()) {
      this.page.set(pageNum);
      this.loadItems();
    }
  }

  getRarityColor(rarity: string): string {
    return this.shopService.getRarityColor(rarity as any);
  }

  getRarityBgColor(rarity: string): string {
    return this.shopService.getRarityBgColor(rarity as any);
  }

  getItemTypeIcon(type: string): string {
    return this.shopService.getItemTypeIcon(type as any);
  }

  formatPrice(coins: number): string {
    return this.shopService.formatPrice(coins);
  }

  getItemTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      'avatar_frame': '🖼️',
      'avatar_effect': '✨',
      'avatar_badge': '🏅',
      'profile_theme': '🎨',
      'profile_banner': '🏞️',
      'name_effect': '💫',
      'chat_bubble': '💬',
      'emoji_pack': '😎',
      'sticker_pack': '🎭',
      'game_theme': '🎮',
      'card_back': '🃏',
      'sound_pack': '🔊',
      'booster': '⚡',
      'title': '👑',
      'egg': '🥚'
    };
    return emojis[type] || '📦';
  }

  getRarityGradient(rarity: string): string {
    const gradients: Record<string, string> = {
      'common': 'from-gray-100 to-gray-200',
      'uncommon': 'from-green-100 to-emerald-200',
      'rare': 'from-blue-100 to-cyan-200',
      'heroic': 'from-red-100 to-rose-200',
      'mythic': 'from-orange-100 to-amber-200',
      'epic': 'from-purple-100 to-fuchsia-200',
      'legendary': 'from-amber-100 via-yellow-200 to-orange-200'
    };
    return gradients[rarity] || 'from-gray-100 to-gray-200';
  }

  getRarityGlow(rarity: string): string {
    const glows: Record<string, string> = {
      'common': '',
      'uncommon': 'shadow-green-200',
      'rare': 'shadow-blue-300',
      'heroic': 'shadow-red-300',
      'mythic': 'shadow-orange-300',
      'epic': 'shadow-purple-300',
      'legendary': 'shadow-yellow-400 shadow-lg'
    };
    return glows[rarity] || '';
  }

  // === Item Detail Modal Methods ===

  openItemDetail(item: ShopItem): void {
    this.selectedItem.set(item);
  }

  closeItemDetail(): void {
    this.selectedItem.set(null);
  }

  purchaseItemFromModal(): void {
    const item = this.selectedItem();
    if (!item) return;

    const currency = this.currency();
    if (!currency || currency.coins < item.priceCoins) {
      return;
    }

    this.purchasingShopItemId.set(item.id);
    this.shopService.purchaseItem(item.id).subscribe({
      next: (result) => {
        this.purchasingShopItemId.set(null);
        this.closeItemDetail();
        if (result.success) {
          // Refresh currency after purchase
          this.shopService.getCurrency().subscribe({
            next: (curr) => this.currency.set(curr),
            error: () => {}
          });
          // Update items list to mark as owned
          this.items.update((items) =>
            items.map((i) => (i.id === item.id ? { ...i, isOwned: true } : i))
          );
          // Show success modal
          this.itemPurchaseSuccess.set({ itemName: item.name, item: result.item });
        }
      },
      error: () => {
        this.purchasingShopItemId.set(null);
      }
    });
  }

  closeItemPurchaseSuccess(): void {
    this.itemPurchaseSuccess.set(null);
  }

  getItemTypeName(type: string): string {
    const names: Record<string, string> = {
      'avatar_frame': 'Avatar Frame',
      'avatar_effect': 'Avatar Effect',
      'avatar_badge': 'Badge',
      'profile_theme': 'Profile Theme',
      'profile_banner': 'Profile Banner',
      'name_effect': 'Name Effect',
      'chat_bubble': 'Chat Bubble',
      'emoji_pack': 'Emoji Pack',
      'sticker_pack': 'Sticker Pack',
      'game_theme': 'Game Theme',
      'card_back': 'Card Back',
      'sound_pack': 'Sound Pack',
      'booster': 'Booster',
      'title': 'Title'
    };
    return names[type] || type;
  }

  getRarityEmoji(rarity: string): string {
    const emojis: Record<string, string> = {
      'common': '⚪',
      'uncommon': '🌿',
      'rare': '💠',
      'heroic': '🔴',
      'mythic': '🟠',
      'epic': '💎',
      'legendary': '👑'
    };
    return emojis[rarity] || '⚪';
  }

  // === Gift Modal Methods ===

  openGiftModal(item: ShopItem): void {
    this.giftItem.set(item);
    this.showGiftModal.set(true);
    this.giftError.set(null);
    this.giftSuccess.set(null);
    this.selectedRecipient.set(null);
    this.userSearchQuery.set('');
    this.userSearchResults.set([]);
    this.giftMessage.set('');
  }

  closeGiftModal(): void {
    this.showGiftModal.set(false);
    this.giftItem.set(null);
    this.selectedRecipient.set(null);
    this.userSearchQuery.set('');
    this.userSearchResults.set([]);
    this.giftMessage.set('');
    this.giftError.set(null);
  }

  onUserSearch(query: string): void {
    this.userSearchQuery.set(query);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query || query.length < 2) {
      this.userSearchResults.set([]);
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.searchingUsers.set(true);
      this.chatService.searchUsers(query).subscribe({
        next: (response) => {
          this.userSearchResults.set(response.items.map((u: any) => ({
            id: u.id || u.userId,
            username: u.username,
            displayName: u.displayName,
            avatar: u.avatar
          })));
          this.searchingUsers.set(false);
        },
        error: () => {
          this.userSearchResults.set([]);
          this.searchingUsers.set(false);
        }
      });
    }, 300);
  }

  selectRecipient(user: { id: number; username: string; displayName: string | null; avatar: string | null }): void {
    this.selectedRecipient.set(user);
    this.userSearchResults.set([]);
    this.userSearchQuery.set('');
  }

  clearRecipient(): void {
    this.selectedRecipient.set(null);
  }

  canGift(): boolean {
    const item = this.giftItem();
    const recipient = this.selectedRecipient();
    const currency = this.currency();

    if (!item || !recipient || !currency) return false;
    return currency.coins >= item.priceCoins;
  }

  sendGift(): void {
    const item = this.giftItem();
    const recipient = this.selectedRecipient();

    if (!item || !recipient || !this.canGift()) return;

    this.sendingGift.set(true);
    this.giftError.set(null);

    this.shopService.sendGift(recipient.id, item.id, this.giftMessage() || undefined).subscribe({
      next: () => {
        this.sendingGift.set(false);
        this.giftSuccess.set(`Gift sent to ${recipient.displayName || recipient.username}!`);
        this.closeGiftModal();
        this.closeItemDetail();
        // Refresh currency
        this.shopService.getCurrency().subscribe({
          next: (curr) => this.currency.set(curr)
        });
      },
      error: (err) => {
        this.sendingGift.set(false);
        this.giftError.set(err.error?.error || 'Failed to send gift');
      }
    });
  }
}
