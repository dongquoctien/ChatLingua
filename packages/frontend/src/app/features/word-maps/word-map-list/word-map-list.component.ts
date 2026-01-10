import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WordMapService, WordMapWithProgress, CEFRLevel } from '../word-map.service';

@Component({
  selector: 'app-word-map-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './word-map-list.component.html',
  styleUrls: ['./word-map-list.component.scss']
})
export class WordMapListComponent implements OnInit {
  private wordMapService = inject(WordMapService);

  // State
  maps = signal<WordMapWithProgress[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedCefrLevel = signal<CEFRLevel | 'all'>('all');

  // CEFR levels for filter
  cefrLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Filtered maps
  filteredMaps = computed(() => {
    const level = this.selectedCefrLevel();
    if (level === 'all') {
      return this.maps();
    }
    return this.maps().filter(map => map.cefrLevel === level);
  });

  // Stats
  activatedMapsCount = computed(() =>
    this.maps().filter(m => m.userProgress?.isActivated).length
  );

  completedMapsCount = computed(() =>
    this.maps().filter(m => m.userProgress?.completionPercentage === 100).length
  );

  ngOnInit(): void {
    this.loadMaps();
  }

  loadMaps(): void {
    this.loading.set(true);
    this.error.set(null);

    this.wordMapService.getWordMaps().subscribe({
      next: (response) => {
        this.maps.set(response.maps);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load Word Maps. Please try again.');
        this.loading.set(false);
        console.error('Error loading word maps:', err);
      }
    });
  }

  filterByLevel(level: CEFRLevel | 'all'): void {
    this.selectedCefrLevel.set(level);
  }

  getCefrColor(level: CEFRLevel): string {
    const colors: Record<CEFRLevel, string> = {
      'A1': 'bg-green-100 text-green-800',
      'A2': 'bg-green-200 text-green-900',
      'B1': 'bg-blue-100 text-blue-800',
      'B2': 'bg-blue-200 text-blue-900',
      'C1': 'bg-purple-100 text-purple-800',
      'C2': 'bg-purple-200 text-purple-900'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  }

  getProgressBarColor(percentage: number): string {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  }

  formatEstimatedTime(hours?: number): string {
    if (!hours) return '';
    if (hours < 1) return `${Math.round(hours * 60)} mins`;
    return `${hours}h`;
  }
}
