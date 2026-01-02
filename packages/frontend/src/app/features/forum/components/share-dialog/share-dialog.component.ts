import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faShare,
  faCopy,
  faCheck,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import {
  faFacebook,
  faTwitter,
  faLinkedin,
  faTelegram,
  faWhatsapp
} from '@fortawesome/free-brands-svg-icons';

export type SharePlatform = 'facebook' | 'twitter' | 'linkedin' | 'telegram' | 'whatsapp' | 'email';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss']
})
export class ShareDialogComponent {
  @Input() isOpen = false;
  @Input() url = '';
  @Input() title = '';
  @Input() description = '';

  @Output() close = new EventEmitter<void>();
  @Output() share = new EventEmitter<SharePlatform>();

  faTimes = faTimes;
  faShare = faShare;
  faCopy = faCopy;
  faCheck = faCheck;
  faEnvelope = faEnvelope;
  faFacebook = faFacebook;
  faTwitter = faTwitter;
  faLinkedin = faLinkedin;
  faTelegram = faTelegram;
  faWhatsapp = faWhatsapp;

  copied = signal(false);

  get shareUrl(): string {
    return this.url || window.location.href;
  }

  get encodedUrl(): string {
    return encodeURIComponent(this.shareUrl);
  }

  get encodedTitle(): string {
    return encodeURIComponent(this.title);
  }

  get encodedDescription(): string {
    return encodeURIComponent(this.description || this.title);
  }

  get facebookUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${this.encodedUrl}`;
  }

  get twitterUrl(): string {
    return `https://twitter.com/intent/tweet?url=${this.encodedUrl}&text=${this.encodedTitle}`;
  }

  get linkedinUrl(): string {
    return `https://www.linkedin.com/shareArticle?mini=true&url=${this.encodedUrl}&title=${this.encodedTitle}`;
  }

  get telegramUrl(): string {
    return `https://t.me/share/url?url=${this.encodedUrl}&text=${this.encodedTitle}`;
  }

  get whatsappUrl(): string {
    return `https://wa.me/?text=${this.encodedTitle}%20${this.encodedUrl}`;
  }

  get emailUrl(): string {
    return `mailto:?subject=${this.encodedTitle}&body=${this.encodedDescription}%0A%0A${this.encodedUrl}`;
  }

  onClose(): void {
    this.close.emit();
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  onShare(platform: SharePlatform): void {
    this.share.emit(platform);

    let url: string;
    switch (platform) {
      case 'facebook':
        url = this.facebookUrl;
        break;
      case 'twitter':
        url = this.twitterUrl;
        break;
      case 'linkedin':
        url = this.linkedinUrl;
        break;
      case 'telegram':
        url = this.telegramUrl;
        break;
      case 'whatsapp':
        url = this.whatsappUrl;
        break;
      case 'email':
        window.location.href = this.emailUrl;
        return;
      default:
        return;
    }

    window.open(url, '_blank', 'width=600,height=400');
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onClose();
    }
  }
}
