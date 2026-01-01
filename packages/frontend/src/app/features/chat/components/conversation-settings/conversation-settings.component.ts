import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Conversation, UpdateConversationSettingsDTO } from '../../chat.types';

@Component({
  selector: 'app-conversation-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-settings.component.html',
  styleUrls: ['./conversation-settings.component.scss'],
})
export class ConversationSettingsComponent implements OnInit {
  readonly conversation = input.required<Conversation>();
  readonly settingsChange = output<UpdateConversationSettingsDTO>();
  readonly blockUser = output<void>();
  readonly close = output<void>();

  // Form state
  readonly nickname = signal('');
  readonly isPinned = signal(false);
  readonly isMuted = signal(false);
  readonly isArchived = signal(false);
  readonly showConfirmBlock = signal(false);

  ngOnInit(): void {
    const conv = this.conversation();
    this.nickname.set(conv.settings.nickname || '');
    this.isPinned.set(conv.settings.isPinned);
    this.isMuted.set(conv.settings.isMuted);
    this.isArchived.set(conv.settings.isArchived);
  }

  saveNickname(): void {
    const nicknameValue = this.nickname().trim() || null;
    this.settingsChange.emit({ nickname: nicknameValue });
  }

  togglePin(): void {
    const newValue = !this.isPinned();
    this.isPinned.set(newValue);
    this.settingsChange.emit({ isPinned: newValue });
  }

  toggleMute(): void {
    const newValue = !this.isMuted();
    this.isMuted.set(newValue);
    this.settingsChange.emit({ isMuted: newValue });
  }

  toggleArchive(): void {
    const newValue = !this.isArchived();
    this.isArchived.set(newValue);
    this.settingsChange.emit({ isArchived: newValue });
  }

  confirmBlock(): void {
    this.showConfirmBlock.set(true);
  }

  cancelBlock(): void {
    this.showConfirmBlock.set(false);
  }

  doBlock(): void {
    this.blockUser.emit();
    this.close.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
