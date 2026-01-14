import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  WordMapService,
  WordMapWithProgress,
  UnitWithProgress,
  LessonWithProgress,
  CEFRLevel,
  ContinuableLesson
} from '../word-map.service';

@Component({
  selector: 'app-word-map-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './word-map-detail.component.html',
  styleUrls: ['./word-map-detail.component.scss']
})
export class WordMapDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wordMapService = inject(WordMapService);

  // State
  map = signal<WordMapWithProgress | null>(null);
  units = signal<UnitWithProgress[]>([]);
  loading = signal(true);
  activating = signal(false);
  error = signal<string | null>(null);
  expandedUnitId = signal<number | null>(null);

  // Continue Learning state
  continuableLesson = signal<ContinuableLesson | null>(null);
  loadingContinuable = signal(false);

  // Computed
  isActivated = computed(() => this.map()?.userProgress?.isActivated ?? false);
  currentUnitId = computed(() => this.map()?.userProgress?.currentUnitId);
  totalLessons = computed(() => this.units().reduce((sum, u) => sum + u.totalLessons, 0));
  completedLessons = computed(() =>
    this.units().reduce((sum, u) => sum + (u.userProgress?.lessonsCompleted ?? 0), 0)
  );

  ngOnInit(): void {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    if (mapId) {
      this.loadMapDetail(+mapId);
      this.loadContinuableLesson(+mapId);
    }
  }

  loadMapDetail(mapId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.wordMapService.getWordMapDetail(mapId).subscribe({
      next: (response) => {
        this.map.set(response.map);
        this.units.set(response.units);
        this.loading.set(false);

        // Auto-expand current unit
        if (response.map.userProgress?.currentUnitId) {
          this.expandedUnitId.set(response.map.userProgress.currentUnitId);
        } else if (response.units.length > 0) {
          this.expandedUnitId.set(response.units[0].id);
        }
      },
      error: (err) => {
        this.error.set('Failed to load Word Map details.');
        this.loading.set(false);
        console.error('Error loading map detail:', err);
      }
    });
  }

  activateMap(): void {
    const mapData = this.map();
    if (!mapData || this.activating()) return;

    this.activating.set(true);

    this.wordMapService.activateWordMap(mapData.id).subscribe({
      next: (response) => {
        if (response.success) {
          // Update map with progress
          this.map.set({
            ...mapData,
            userProgress: {
              isActivated: true,
              completionPercentage: 0,
              unitsCompleted: 0,
              lessonsCompleted: 0,
              totalXpEarned: 0,
              ...response.progress
            }
          });

          // Reload to get updated unit progress
          this.loadMapDetail(mapData.id);
        }
        this.activating.set(false);
      },
      error: (err) => {
        console.error('Error activating map:', err);
        this.activating.set(false);
      }
    });
  }

  toggleUnit(unitId: number): void {
    if (this.expandedUnitId() === unitId) {
      this.expandedUnitId.set(null);
    } else {
      this.expandedUnitId.set(unitId);
    }
  }

  getUnitStatus(unit: UnitWithProgress): string {
    if (!unit.userProgress) return 'locked';
    return unit.userProgress.status;
  }

  getLessonStatus(lesson: LessonWithProgress): string {
    if (!lesson.userProgress) return 'locked';
    return lesson.userProgress.status;
  }

  canAccessLesson(lesson: LessonWithProgress): boolean {
    const status = this.getLessonStatus(lesson);
    return status !== 'locked';
  }

  navigateToLesson(lesson: LessonWithProgress): void {
    if (!this.canAccessLesson(lesson)) return;

    const mapData = this.map();
    if (!mapData) return;

    this.router.navigate(['/word-maps', mapData.id, 'lesson', lesson.id]);
  }

  navigateToLessonForReplay(lesson: LessonWithProgress, event: Event): void {
    event.stopPropagation();
    const mapData = this.map();
    if (!mapData) return;

    this.router.navigate(['/word-maps', mapData.id, 'lesson', lesson.id], {
      queryParams: { replay: 'true' }
    });
  }

  loadContinuableLesson(mapId: number): void {
    this.loadingContinuable.set(true);
    this.wordMapService.getContinuableLesson(mapId).subscribe({
      next: (response) => {
        this.continuableLesson.set(response.lesson);
        this.loadingContinuable.set(false);
      },
      error: (err) => {
        console.error('Error loading continuable lesson:', err);
        this.loadingContinuable.set(false);
      }
    });
  }

  continueLearning(): void {
    const lesson = this.continuableLesson();
    const mapData = this.map();
    if (!lesson || !mapData) return;

    this.router.navigate(['/word-maps', mapData.id, 'lesson', lesson.lessonId]);
  }

  isLessonCompleted(lesson: LessonWithProgress): boolean {
    return lesson.userProgress?.status === 'completed';
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

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'fa-solid fa-check-circle text-green-500';
      case 'exam_ready': return 'fa-solid fa-clipboard-check text-blue-500';
      case 'studying': return 'fa-solid fa-book-open text-blue-500';
      case 'in_progress': return 'fa-solid fa-play-circle text-blue-500';
      case 'unlocked': return 'fa-solid fa-lock-open text-gray-400';
      default: return 'fa-solid fa-lock text-gray-300';
    }
  }

  getLessonTypeIcon(type: string): string {
    switch (type) {
      case 'vocabulary': return 'fa-solid fa-spell-check';
      case 'grammar': return 'fa-solid fa-language';
      case 'listening': return 'fa-solid fa-headphones';
      case 'speaking': return 'fa-solid fa-microphone';
      case 'reading': return 'fa-solid fa-book';
      case 'writing': return 'fa-solid fa-pen';
      case 'mixed': return 'fa-solid fa-layer-group';
      case 'review': return 'fa-solid fa-rotate';
      case 'project': return 'fa-solid fa-project-diagram';
      default: return 'fa-solid fa-book-open';
    }
  }
}
