import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ShopService, ShopItem, ShopCategory, DailyDeal, UserCurrency } from '../shop.service';
import { PetService, EggType, UserPet } from '../../pets/services/pet.service';

@Component({
  selector: 'app-shop-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-home.component.html',
  styleUrls: ['./shop-home.component.scss']
})
export class ShopHomeComponent implements OnInit {
  private shopService = inject(ShopService);
  private petService = inject(PetService);
  private router = inject(Router);

  categories = signal<ShopCategory[]>([]);
  featuredItems = signal<ShopItem[]>([]);
  dailyDeals = signal<DailyDeal[]>([]);
  eggTypes = signal<EggType[]>([]);
  currency = signal<UserCurrency | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  dealCountdown = signal<string>('');

  // Pending gifts count for badge
  pendingGiftCount = signal(0);

  // Egg purchase state
  purchasingEggId = signal<number | null>(null);
  purchaseSuccess = signal<{ eggName: string; egg: UserPet } | null>(null);

  // Daily deal purchase state
  purchasingDealId = signal<number | null>(null);
  dealPurchaseSuccess = signal<{ itemName: string; item: ShopItem } | null>(null);

  private countdownInterval: any;

  ngOnInit(): void {
    this.loadData();
    this.startDealCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private loadData(): void {
    this.loading.set(true);

    // Load all data in parallel
    this.shopService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err) => console.error('Failed to load categories', err)
    });

    this.shopService.getFeaturedItems(8).subscribe({
      next: (items) => this.featuredItems.set(items),
      error: (err) => console.error('Failed to load featured items', err)
    });

    this.shopService.getDailyDeals().subscribe({
      next: (deals) => this.dailyDeals.set(deals),
      error: (err) => console.error('Failed to load daily deals', err)
    });

    this.shopService.getCurrency().subscribe({
      next: (curr) => {
        this.currency.set(curr);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load currency', err);
        this.loading.set(false);
      }
    });

    // Load egg types from pet service
    this.petService.getEggTypes().subscribe({
      next: (eggs) => this.eggTypes.set(eggs),
      error: (err) => console.error('Failed to load egg types', err)
    });

    // Load pending gift count for badge
    this.shopService.getPendingGiftCount().subscribe({
      next: (result) => this.pendingGiftCount.set(result.count),
      error: (err) => console.error('Failed to load pending gift count', err)
    });
  }

  private startDealCountdown(): void {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      this.dealCountdown.set(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
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

  getCategoryIcon(slug: string): string {
    const icons: Record<string, string> = {
      'avatar': 'fa-user-circle',
      'profile': 'fa-id-card',
      'chat': 'fa-comments',
      'games': 'fa-gamepad',
      'boosters': 'fa-bolt',
      'special': 'fa-star'
    };
    return icons[slug] || 'fa-box';
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

  getCategoryEmoji(slug: string): string {
    const emojis: Record<string, string> = {
      'avatar': '👤',
      'profile': '🪪',
      'chat': '💬',
      'games': '🎮',
      'boosters': '⚡',
      'special': '⭐',
      'eggs': '🥚'
    };
    return emojis[slug] || '📦';
  }

  // === Daily Deal Methods ===

  purchaseDeal(dealId: number): void {
    const currency = this.currency();
    const deal = this.dailyDeals().find((d) => d.id === dealId);
    if (!currency || !deal) return;

    if (currency.coins < deal.dealPrice) {
      this.error.set('Not enough coins!');
      return;
    }

    if (deal.purchased) {
      this.error.set('You have already purchased this deal today');
      return;
    }

    this.purchasingDealId.set(dealId);
    this.shopService.purchaseDailyDeal(dealId).subscribe({
      next: (result) => {
        this.purchasingDealId.set(null);
        if (result.success) {
          // Refresh currency after purchase
          this.shopService.getCurrency().subscribe({
            next: (curr) => this.currency.set(curr),
            error: () => {} // Ignore refresh errors
          });
          // Update the deal as purchased locally
          this.dailyDeals.update((deals) =>
            deals.map((d) => (d.id === dealId ? { ...d, purchased: true } : d))
          );
          // Show success modal
          this.dealPurchaseSuccess.set({ itemName: deal.item.name, item: result.item });
        }
      },
      error: (err) => {
        this.purchasingDealId.set(null);
        this.error.set(err.error?.error ?? 'Failed to purchase deal');
      }
    });
  }

  closeDealPurchaseSuccess(): void {
    this.dealPurchaseSuccess.set(null);
  }

  // === Egg Methods ===

  purchaseEgg(eggTypeId: number): void {
    const currency = this.currency();
    const egg = this.eggTypes().find((e) => e.id === eggTypeId);
    if (!currency || !egg) return;

    // EggType uses priceCoins (not shopPriceCoins)
    const eggPrice = (egg as any).shopPriceCoins ?? (egg as any).priceCoins ?? 0;
    if (currency.coins < eggPrice) {
      this.error.set('Not enough coins!');
      return;
    }

    this.purchasingEggId.set(eggTypeId);
    this.petService.purchaseEgg(eggTypeId).subscribe({
      next: (result) => {
        this.purchasingEggId.set(null);
        if (result.success) {
          // Refresh currency after purchase
          this.shopService.getCurrency().subscribe({
            next: (curr) => this.currency.set(curr),
            error: () => {} // Ignore refresh errors
          });
          // Show success modal
          this.purchaseSuccess.set({ eggName: egg.name, egg: result.egg });
        }
      },
      error: (err) => {
        this.purchasingEggId.set(null);
        this.error.set(err.error?.message ?? 'Failed to purchase egg');
      }
    });
  }

  closePurchaseSuccess(): void {
    this.purchaseSuccess.set(null);
  }

  goToMyEggs(): void {
    this.purchaseSuccess.set(null);
    this.router.navigate(['/pets']);
  }

  getEggImageUrl(rarity: string): string {
    return this.petService.getEggImageUrl(rarity);
  }

  getEggRarityEmoji(rarity: string): string {
    const emojis: Record<string, string> = {
      common: '⚪',
      uncommon: '🌿',
      rare: '💠',
      epic: '💎',
      legendary: '👑'
    };
    return emojis[rarity] || '⚪';
  }

  // Get total item count including children
  getTotalItemCount(category: ShopCategory): number {
    let total = category.itemCount || 0;
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        total += this.getTotalItemCount(child);
      }
    }
    return total;
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
      'uncommon': 'shadow-green-200',
      'rare': 'shadow-blue-300',
      'epic': 'shadow-purple-300',
      'legendary': 'shadow-yellow-400 shadow-lg'
    };
    return glows[rarity] || '';
  }
}
