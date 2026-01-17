import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeader } from '@chatlingua/shared';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-header.component.html',
  styleUrls: ['./section-header.component.scss']
})
export class SectionHeaderComponent {
  @Input({ required: true }) header!: SectionHeader;

  get colorClasses(): string {
    const colorMap: Record<string, string> = {
      teal: 'bg-teal-500 text-white',
      blue: 'bg-blue-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white'
    };
    return colorMap[this.header.color] || 'bg-gray-500 text-white';
  }
}
