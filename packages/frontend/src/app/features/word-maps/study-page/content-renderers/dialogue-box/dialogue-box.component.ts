import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogueContent } from '@chatlingua/shared';

@Component({
  selector: 'app-dialogue-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialogue-box.component.html',
  styleUrls: ['./dialogue-box.component.scss']
})
export class DialogueBoxComponent {
  @Input({ required: true }) content!: DialogueContent;

  getSpeakerColor(speaker: string, index: number): string {
    // Alternate between two colors for different speakers
    const speakers = [...new Set(this.content.lines.map(l => l.speaker))];
    const speakerIndex = speakers.indexOf(speaker);
    return speakerIndex % 2 === 0 ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300';
  }
}
