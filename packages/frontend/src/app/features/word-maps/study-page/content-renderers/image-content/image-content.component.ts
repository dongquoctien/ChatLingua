import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageContent } from '@chatlingua/shared';

@Component({
  selector: 'app-image-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-content.component.html',
  styleUrls: ['./image-content.component.scss']
})
export class ImageContentComponent {
  @Input({ required: true }) content!: ImageContent;
}
