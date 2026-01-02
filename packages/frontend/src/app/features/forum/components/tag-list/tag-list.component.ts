import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TagInfo } from '../../services/forum.service';

@Component({
  selector: 'app-tag-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss']
})
export class TagListComponent {
  @Input() tags: TagInfo[] = [];
  @Input() maxTags = 5;
  @Input() size: 'small' | 'medium' = 'small';
  @Input() clickable = true;
  @Input() showCount = false;

  @Output() tagClick = new EventEmitter<TagInfo>();

  get visibleTags(): TagInfo[] {
    return this.tags.slice(0, this.maxTags);
  }

  get remainingCount(): number {
    return Math.max(0, this.tags.length - this.maxTags);
  }

  get tagClasses(): string {
    const base = 'inline-flex items-center rounded-full transition-colors';
    const sizeClass = this.size === 'small'
      ? 'px-2 py-0.5 text-xs'
      : 'px-3 py-1 text-sm';
    const interactive = this.clickable
      ? 'hover:bg-gray-200 cursor-pointer'
      : '';
    return `${base} ${sizeClass} ${interactive}`;
  }

  onTagClick(event: Event, tag: TagInfo): void {
    if (!this.clickable) return;
    event.preventDefault();
    event.stopPropagation();
    this.tagClick.emit(tag);
  }
}
