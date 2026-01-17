import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorCakesContent } from '@chatlingua/shared';

@Component({
  selector: 'app-color-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-grid.component.html',
  styleUrls: ['./color-grid.component.scss']
})
export class ColorGridComponent {
  @Input({ required: true }) content!: ColorCakesContent;

  getColorStyle(item: ColorCakesContent['items'][0]): string {
    if (item.hexCode) {
      return item.hexCode;
    }
    // Default colors by name
    const colorMap: Record<string, string> = {
      red: '#ef4444',
      orange: '#f97316',
      yellow: '#eab308',
      green: '#22c55e',
      blue: '#3b82f6',
      purple: '#a855f7',
      pink: '#ec4899',
      brown: '#92400e',
      black: '#1f2937',
      white: '#f9fafb',
      grey: '#6b7280',
      gray: '#6b7280'
    };
    return colorMap[item.color.toLowerCase()] || '#6b7280';
  }
}
