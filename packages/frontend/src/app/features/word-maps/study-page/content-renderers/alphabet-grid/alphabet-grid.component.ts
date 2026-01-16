import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlphabetGridContent } from '@chatlingua/shared';

@Component({
  selector: 'app-alphabet-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alphabet-grid.component.html',
  styleUrls: ['./alphabet-grid.component.scss']
})
export class AlphabetGridComponent {
  @Input({ required: true }) content!: AlphabetGridContent;

  private colors = [
    'text-blue-600',
    'text-red-600',
    'text-green-600',
    'text-purple-600',
    'text-orange-600',
    'text-pink-600',
    'text-teal-600',
    'text-indigo-600'
  ];

  getLetterColor(letter: string): string {
    const index = letter.charCodeAt(0) % this.colors.length;
    return this.colors[index];
  }
}
