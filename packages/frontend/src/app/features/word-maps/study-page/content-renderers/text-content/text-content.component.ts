import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextContent } from '@chatlingua/shared';

@Component({
  selector: 'app-text-content-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-content.component.html',
  styleUrls: ['./text-content.component.scss']
})
export class TextContentRendererComponent {
  @Input({ required: true }) content!: TextContent;

  get textClasses(): string {
    const classes = ['text-gray-700'];

    switch (this.content.formatting) {
      case 'bold':
        classes.push('font-bold');
        break;
      case 'italic':
        classes.push('italic');
        break;
      case 'highlight':
        classes.push('bg-yellow-100 px-1');
        break;
    }

    return classes.join(' ');
  }
}
