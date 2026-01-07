import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ShopService, ShopItem, ShopItemDeal, UserCurrency } from '../shop.service';
import { ApiService } from '../../../core/services/api.service';
import { ChatService } from '../../chat/services/chat.service';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, map } from 'rxjs';

interface UserSearchResult {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

@Component({
  selector: 'app-shop-item-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shop-item-detail.component.html',
  styleUrls: ['./shop-item-detail.component.scss']
})
export class ShopItemDetailComponent implements OnInit, OnDestroy {
  private shopService = inject(ShopService);
  private apiService = inject(ApiService);
  private chatService = inject(ChatService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  item = signal<ShopItem | null>(null);
  currency = signal<UserCurrency | null>(null);
  loading = signal(true);
  purchasing = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  inWishlist = signal(false);
  userLevel = signal(1);
  userAchievements = signal<string[]>([]);

  // Gift modal state
  showGiftModal = signal(false);
  giftMessage = signal('');
  selectedRecipient = signal<UserSearchResult | null>(null);
  userSearchQuery = signal('');
  userSearchResults = signal<UserSearchResult[]>([]);
  searchingUsers = signal(false);
  sendingGift = signal(false);
  giftError = signal<string | null>(null);

  // User search subject for debounce
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadItem(slug);
    }

    this.shopService.getCurrency().subscribe({
      next: (curr) => this.currency.set(curr),
      error: (err) => console.error('Failed to load currency', err)
    });

    // Load user level
    this.apiService.getXPStatus().subscribe({
      next: (status) => this.userLevel.set(status.currentLevel),
      error: (err: unknown) => console.error('Failed to load user level', err)
    });

    // Load user achievements
    this.apiService.getAchievements().subscribe({
      next: (achievements) => {
        const codes = achievements.map((a) => a.achievementCode);
        this.userAchievements.set(codes);
      },
      error: (err: unknown) => console.error('Failed to load achievements', err)
    });

    // Setup user search with debounce
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) {
          return of([]);
        }
        this.searchingUsers.set(true);
        return this.chatService.searchUsers(query).pipe(
          map(response => response.items.map((user: any) => ({
            id: user.id || user.userId,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar
          })))
        );
      })
    ).subscribe({
      next: (users) => {
        this.userSearchResults.set(users as UserSearchResult[]);
        this.searchingUsers.set(false);
      },
      error: () => {
        this.userSearchResults.set([]);
        this.searchingUsers.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  private loadItem(slug: string): void {
    this.loading.set(true);
    this.shopService.getItemBySlug(slug).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
        this.checkWishlist(item.id);
      },
      error: (err) => {
        console.error('Failed to load item', err);
        this.error.set('Item not found');
        this.loading.set(false);
      }
    });
  }

  private checkWishlist(itemId: number): void {
    this.shopService.getWishlist().subscribe({
      next: (wishlist) => {
        this.inWishlist.set(wishlist.some(i => i.id === itemId));
      }
    });
  }

  purchase(): void {
    const item = this.item();
    const curr = this.currency();

    if (!item || !curr) return;

    const effectivePrice = this.getEffectivePrice();
    if (curr.coins < effectivePrice) {
      this.error.set('Insufficient coins');
      return;
    }

    this.purchasing.set(true);
    this.error.set(null);

    // Use daily deal purchase if item has an active deal
    const purchase$ = item.deal
      ? this.shopService.purchaseDailyDeal(item.deal.dealId)
      : this.shopService.purchaseItem(item.id);

    purchase$.subscribe({
      next: (result) => {
        this.success.set(`Successfully purchased ${item.name}!`);
        this.currency.set({ ...curr, coins: result.newBalance });
        this.item.set({ ...item, isOwned: true, ownedQuantity: (item.ownedQuantity || 0) + 1, deal: undefined });
        this.purchasing.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to purchase item');
        this.purchasing.set(false);
      }
    });
  }

  // Get the effective price considering active deals
  getEffectivePrice(): number {
    const item = this.item();
    if (!item) return 0;
    return item.deal ? item.deal.dealPrice : item.priceCoins;
  }

  // Check if item has an active deal
  hasDeal(): boolean {
    const item = this.item();
    return !!item && !!item.deal;
  }

  // Get deal info
  getDeal(): ShopItemDeal | null {
    const item = this.item();
    return item?.deal ?? null;
  }

  equip(): void {
    const item = this.item();
    if (!item) return;

    this.shopService.equipItem(item.id).subscribe({
      next: () => {
        this.item.set({ ...item, isEquipped: true });
        this.success.set(`${item.name} equipped!`);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to equip item');
      }
    });
  }

  unequip(): void {
    const item = this.item();
    if (!item) return;

    this.shopService.unequipItem(item.id).subscribe({
      next: () => {
        this.item.set({ ...item, isEquipped: false });
        this.success.set(`${item.name} unequipped!`);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to unequip item');
      }
    });
  }

  toggleWishlist(): void {
    const item = this.item();
    if (!item) return;

    if (this.inWishlist()) {
      this.shopService.removeFromWishlist(item.id).subscribe({
        next: () => this.inWishlist.set(false),
        error: (err) => console.error('Failed to update wishlist', err)
      });
    } else {
      this.shopService.addToWishlist(item.id).subscribe({
        next: () => this.inWishlist.set(true),
        error: (err) => console.error('Failed to update wishlist', err)
      });
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

  getItemTypeName(type: string): string {
    return this.shopService.getItemTypeName(type as any);
  }

  formatPrice(coins: number): string {
    return this.shopService.formatPrice(coins);
  }

  canAfford(): boolean {
    const item = this.item();
    const curr = this.currency();
    return !!item && !!curr && curr.coins >= this.getEffectivePrice();
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
      'title': '👑'
    };
    return emojis[type] || '📦';
  }

  getRarityGradient(rarity: string): string {
    const gradients: Record<string, string> = {
      'common': 'from-gray-100 to-gray-200',
      'uncommon': 'from-green-100 to-emerald-200',
      'rare': 'from-blue-100 to-cyan-200',
      'epic': 'from-purple-100 to-fuchsia-200',
      'legendary': 'from-amber-100 via-yellow-200 to-orange-200'
    };
    return gradients[rarity] || 'from-gray-100 to-gray-200';
  }

  getRarityGlow(rarity: string): string {
    const glows: Record<string, string> = {
      'common': '',
      'uncommon': 'shadow-green-300 shadow-lg',
      'rare': 'shadow-blue-400 shadow-xl',
      'epic': 'shadow-purple-400 shadow-xl',
      'legendary': 'shadow-yellow-500 shadow-2xl'
    };
    return glows[rarity] || '';
  }

  getRarityEmoji(rarity: string): string {
    const emojis: Record<string, string> = {
      'common': '⚪',
      'uncommon': '🌿',
      'rare': '💠',
      'epic': '💎',
      'legendary': '👑'
    };
    return emojis[rarity] || '⚪';
  }

  meetsLevelRequirement(): boolean {
    const item = this.item();
    if (!item || item.requiredLevel <= 0) return true;
    return this.userLevel() >= item.requiredLevel;
  }

  meetsAchievementRequirement(): boolean {
    const item = this.item();
    if (!item || !item.requiredAchievement) return true;
    return this.userAchievements().includes(item.requiredAchievement);
  }

  canPurchase(): boolean {
    const item = this.item();
    if (!item) return false;
    if (item.isOwned && !item.isConsumable) return false;
    if (!this.canAfford()) return false;
    if (!this.meetsLevelRequirement()) return false;
    if (!this.meetsAchievementRequirement()) return false;
    return true;
  }

  getAchievementName(code: string): string {
    const names: Record<string, string> = {
      'FIRST_STEPS': 'First Steps',
      'VOCAB_10': 'Word Collector',
      'VOCAB_50': 'Vocabulary Builder',
      'VOCAB_100': 'Word Master',
      'VOCAB_500': 'Lexicon Legend',
      'EXERCISE_10': 'Getting Started',
      'EXERCISE_50': 'Practice Makes Perfect',
      'EXERCISE_100': 'Exercise Expert',
      'STREAK_3': 'Consistent',
      'STREAK_7': 'Week Warrior',
      'STREAK_14': 'Fortnight Fighter',
      'STREAK_30': 'Monthly Master',
      'STREAK_100': 'Century Streak',
      'LEVEL_5': 'Rising Star',
      'LEVEL_10': 'Master Learner',
      'GAME_FIRST': 'Game On!',
      'GAME_100': 'Game Master'
    };
    return names[code] || code;
  }

  // Gift methods
  openGiftModal(): void {
    this.showGiftModal.set(true);
    this.giftMessage.set('');
    this.selectedRecipient.set(null);
    this.userSearchQuery.set('');
    this.userSearchResults.set([]);
    this.giftError.set(null);
  }

  closeGiftModal(): void {
    this.showGiftModal.set(false);
  }

  onUserSearch(query: string): void {
    this.userSearchQuery.set(query);
    this.searchSubject.next(query);
  }

  selectRecipient(user: UserSearchResult): void {
    this.selectedRecipient.set(user);
    this.userSearchResults.set([]);
    this.userSearchQuery.set('');
  }

  clearRecipient(): void {
    this.selectedRecipient.set(null);
  }

  sendGift(): void {
    const item = this.item();
    const recipient = this.selectedRecipient();
    const curr = this.currency();

    if (!item || !recipient || !curr) return;

    const effectivePrice = this.getEffectivePrice();
    if (curr.coins < effectivePrice) {
      this.giftError.set('Insufficient coins to send this gift');
      return;
    }

    this.sendingGift.set(true);
    this.giftError.set(null);

    const message = this.giftMessage().trim() || undefined;

    this.shopService.sendGift(recipient.id, item.id, message).subscribe({
      next: () => {
        this.sendingGift.set(false);
        this.showGiftModal.set(false);
        this.success.set(`Gift sent to ${recipient.displayName || recipient.username}!`);
        // Reload currency to get updated balance
        this.shopService.getCurrency().subscribe({
          next: (newCurr) => this.currency.set(newCurr)
        });
      },
      error: (err) => {
        this.sendingGift.set(false);
        this.giftError.set(err.error?.error || 'Failed to send gift');
      }
    });
  }

  canGift(): boolean {
    const item = this.item();
    const recipient = this.selectedRecipient();
    return !!item && !!recipient && this.canAfford();
  }
}
