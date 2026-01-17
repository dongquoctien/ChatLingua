import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ImageConfig {
  title?: string;
  url: string;
  alt: string;
  caption?: string;
  sourceRef?: string;
  zoomable?: boolean;
}

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss']
})
export class ImageViewerComponent {
  @Input() config!: ImageConfig;

  isLoading = signal(true);
  error = signal<string | null>(null);
  isZoomed = signal(false);

  onLoad(): void {
    this.isLoading.set(false);
  }

  onError(): void {
    this.isLoading.set(false);
    this.error.set('Failed to load image');
  }

  toggleZoom(): void {
    if (this.config.zoomable !== false) {
      this.isZoomed.update(v => !v);
    }
  }

  closeZoom(): void {
    this.isZoomed.set(false);
  }
}
