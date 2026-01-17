import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TextConfig {
  title?: string;
  content: string;
  contentVi?: string;
  type?: 'paragraph' | 'dialogue' | 'instructions' | 'note' | 'tip';
  highlight?: boolean;
}

@Component({
  selector: 'app-text-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-content.component.html',
  styleUrls: ['./text-content.component.scss']
})
export class TextContentComponent {
  @Input() config!: TextConfig;

  get typeIcon(): string {
    switch (this.config.type) {
      case 'dialogue':
        return 'fa-comments';
      case 'instructions':
        return 'fa-list-check';
      case 'note':
        return 'fa-sticky-note';
      case 'tip':
        return 'fa-lightbulb';
      default:
        return 'fa-align-left';
    }
  }

  get typeClass(): string {
    switch (this.config.type) {
      case 'dialogue':
        return 'border-l-blue-500 bg-blue-50';
      case 'instructions':
        return 'border-l-purple-500 bg-purple-50';
      case 'note':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'tip':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  }

  get iconClass(): string {
    switch (this.config.type) {
      case 'dialogue':
        return 'text-blue-500';
      case 'instructions':
        return 'text-purple-500';
      case 'note':
        return 'text-yellow-600';
      case 'tip':
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  }
}
