import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  WordMapService,
  UnitWithProgress,
  LessonWithProgress,
  CEFRLevel
} from '../word-map.service';

@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './unit-detail.component.html',
  styleUrls: ['./unit-detail.component.scss']
})
export class UnitDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wordMapService = inject(WordMapService);

  // State
  mapId = signal<number>(0);
  unit = signal<UnitWithProgress | null>(null);
  lessons = signal<LessonWithProgress[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Computed
  completedLessons = computed(() =>
    this.lessons().filter(l => l.userProgress?.status === 'completed').length
  );
  progressPercentage = computed(() => {
    const total = this.lessons().length;
    if (total === 0) return 0;
    return Math.round((this.completedLessons() / total) * 100);
  });
  isLocked = computed(() => this.unit()?.userProgress?.status === 'locked');

  ngOnInit(): void {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    const unitId = this.route.snapshot.paramMap.get('unitId');

    if (mapId) {
      this.mapId.set(+mapId);
    }

    if (unitId) {
      this.loadUnitDetail(+unitId);
    }
  }

  loadUnitDetail(unitId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.wordMapService.getUnitDetail(unitId).subscribe({
      next: (response) => {
        this.unit.set(response.unit);
        this.lessons.set(response.lessons);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load unit details.');
        this.loading.set(false);
        console.error('Error loading unit detail:', err);
      }
    });
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
    this.router.navigate(['/word-maps', this.mapId(), 'lesson', lesson.id]);
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

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completed';
      case 'exam_ready': return 'Ready for Exam';
      case 'studying': return 'Studying';
      case 'in_progress': return 'In Progress';
      case 'unlocked': return 'Available';
      default: return 'Locked';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'exam_ready': return 'bg-blue-100 text-blue-700';
      case 'studying': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'unlocked': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-400';
    }
  }
}
