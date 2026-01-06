import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ShopService, ShopItem, UserCurrency } from '../shop.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-shop-item-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-item-detail.component.html',
  styleUrls: ['./shop-item-detail.component.scss']
})
export class ShopItemDetailComponent implements OnInit {
  private shopService = inject(ShopService);
  private apiService = inject(ApiService);
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

    if (curr.coins < item.priceCoins) {
      this.error.set('Insufficient coins');
      return;
    }

    this.purchasing.set(true);
    this.error.set(null);

    this.shopService.purchaseItem(item.id).subscribe({
      next: (result) => {
        this.success.set(`Successfully purchased ${item.name}!`);
        this.currency.set({ ...curr, coins: result.newBalance });
        this.item.set({ ...item, isOwned: true, ownedQuantity: (item.ownedQuantity || 0) + 1 });
        this.purchasing.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to purchase item');
        this.purchasing.set(false);
      }
    });
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
    return !!item && !!curr && curr.coins >= item.priceCoins;
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
      'pet': '🐾'
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
}
