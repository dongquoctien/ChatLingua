import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WordMapService } from '../word-map.service';
import {
  StudyUnit,
  StudyPage,
  StudySection,
  StudyPageExercise,
  StudyPageAudioConfig
} from '@chatlingua/shared';

// Components
import { SectionHeaderComponent } from './components/section-header/section-header.component';
import { ExerciseBlockComponent } from './components/exercise-block/exercise-block.component';
import { AudioPopupComponent } from './components/audio-popup/audio-popup.component';
import { ExercisePopupComponent } from './components/exercise-popup/exercise-popup.component';

// Content Renderers
import { AlphabetGridComponent } from './content-renderers/alphabet-grid/alphabet-grid.component';
import { NumberGridComponent } from './content-renderers/number-grid/number-grid.component';
import { VocabularyGridComponent } from './content-renderers/vocabulary-grid/vocabulary-grid.component';
import { ColorGridComponent } from './content-renderers/color-grid/color-grid.component';
import { DaysCalendarComponent } from './content-renderers/days-calendar/days-calendar.component';
import { DialogueBoxComponent } from './content-renderers/dialogue-box/dialogue-box.component';
import { GrammarTableComponent } from './content-renderers/grammar-table/grammar-table.component';
import { ImageContentComponent } from './content-renderers/image-content/image-content.component';
import { TextContentRendererComponent } from './content-renderers/text-content/text-content.component';

// Sample data for demo
import { SAMPLE_UNIT0_DATA } from './sample-data/unit0.data';

@Component({
  selector: 'app-study-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SectionHeaderComponent,
    ExerciseBlockComponent,
    AudioPopupComponent,
    ExercisePopupComponent,
    AlphabetGridComponent,
    NumberGridComponent,
    VocabularyGridComponent,
    ColorGridComponent,
    DaysCalendarComponent,
    DialogueBoxComponent,
    GrammarTableComponent,
    ImageContentComponent,
    TextContentRendererComponent
  ],
  templateUrl: './study-page.component.html',
  styleUrls: ['./study-page.component.scss']
})
export class StudyPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wordMapService = inject(WordMapService);

  // Route params
  mapId = signal<number>(0);
  unitId = signal<number>(0);

  // Data
  studyUnit = signal<StudyUnit | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Current page
  currentPageIndex = signal(0);

  // Popup states
  showAudioPopup = signal(false);
  showExercisePopup = signal(false);
  currentAudio = signal<StudyPageAudioConfig | null>(null);
  currentExercise = signal<StudyPageExercise | null>(null);

  // Computed
  currentPage = computed(() => {
    const unit = this.studyUnit();
    const index = this.currentPageIndex();
    return unit?.pages[index] || null;
  });

  totalPages = computed(() => this.studyUnit()?.pages.length || 0);

  leftColumnSections = computed(() => {
    const page = this.currentPage();
    if (!page || page.layout === 'single') return page?.sections || [];
    // For two-column layout, split sections
    const sections = page.sections || [];
    return sections.filter((_, i) => i % 2 === 0);
  });

  rightColumnSections = computed(() => {
    const page = this.currentPage();
    if (!page || page.layout === 'single') return [];
    const sections = page.sections || [];
    return sections.filter((_, i) => i % 2 === 1);
  });

  ngOnInit(): void {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    const unitId = this.route.snapshot.paramMap.get('unitId');

    if (mapId && unitId) {
      this.mapId.set(+mapId);
      this.unitId.set(+unitId);
      this.loadStudyPage(+unitId);
    }
  }

  loadStudyPage(unitId: number): void {
    this.loading.set(true);
    this.error.set(null);

    // For demo, use sample data for unit 0
    // In production, this will load from API
    setTimeout(() => {
      if (unitId === 0 || unitId === 1) {
        // Use sample data
        this.studyUnit.set(SAMPLE_UNIT0_DATA);
        this.loading.set(false);
      } else {
        // Try to load from API
        this.loadFromApi(unitId);
      }
    }, 500);
  }

  private loadFromApi(unitId: number): void {
    // TODO: Implement API call to load study page JSON
    // For now, show error for non-demo units
    this.error.set('Study page not available for this unit');
    this.loading.set(false);
  }

  // Navigation
  prevPage(): void {
    const index = this.currentPageIndex();
    if (index > 0) {
      this.currentPageIndex.set(index - 1);
    }
  }

  nextPage(): void {
    const index = this.currentPageIndex();
    const total = this.totalPages();
    if (index < total - 1) {
      this.currentPageIndex.set(index + 1);
    }
  }

  // Audio popup
  openAudioPopup(audio: StudyPageAudioConfig): void {
    this.currentAudio.set(audio);
    this.showAudioPopup.set(true);
  }

  closeAudioPopup(): void {
    this.showAudioPopup.set(false);
    this.currentAudio.set(null);
  }

  // Exercise popup
  openExercisePopup(exercise: StudyPageExercise): void {
    this.currentExercise.set(exercise);
    this.showExercisePopup.set(true);
  }

  closeExercisePopup(): void {
    this.showExercisePopup.set(false);
    this.currentExercise.set(null);
  }

  // Go to exam for a specific lesson in this unit
  goToExam(): void {
    // Navigate to unit detail page where user can choose a lesson exam
    this.router.navigate(['/word-maps', this.mapId(), 'unit', this.unitId()]);
  }

  // Go back
  goBack(): void {
    this.router.navigate(['/word-maps', this.mapId(), 'unit', this.unitId()]);
  }
}
