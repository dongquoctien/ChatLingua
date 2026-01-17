import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyPageExercise, StudyPageAudioConfig, ExerciseContent } from '@chatlingua/shared';

// Content Renderers
import { AlphabetGridComponent } from '../../content-renderers/alphabet-grid/alphabet-grid.component';
import { NumberGridComponent } from '../../content-renderers/number-grid/number-grid.component';
import { VocabularyGridComponent } from '../../content-renderers/vocabulary-grid/vocabulary-grid.component';
import { ColorGridComponent } from '../../content-renderers/color-grid/color-grid.component';
import { DaysCalendarComponent } from '../../content-renderers/days-calendar/days-calendar.component';
import { DialogueBoxComponent } from '../../content-renderers/dialogue-box/dialogue-box.component';
import { ImageContentComponent } from '../../content-renderers/image-content/image-content.component';
import { TextContentRendererComponent } from '../../content-renderers/text-content/text-content.component';

@Component({
  selector: 'app-exercise-block',
  standalone: true,
  imports: [
    CommonModule,
    AlphabetGridComponent,
    NumberGridComponent,
    VocabularyGridComponent,
    ColorGridComponent,
    DaysCalendarComponent,
    DialogueBoxComponent,
    ImageContentComponent,
    TextContentRendererComponent
  ],
  templateUrl: './exercise-block.component.html',
  styleUrls: ['./exercise-block.component.scss']
})
export class ExerciseBlockComponent {
  @Input({ required: true }) exercise!: StudyPageExercise;

  @Output() audioClick = new EventEmitter<StudyPageAudioConfig>();
  @Output() exerciseClick = new EventEmitter<StudyPageExercise>();

  onAudioClick(): void {
    if (this.exercise.audio) {
      this.audioClick.emit(this.exercise.audio);
    }
  }

  onExerciseClick(): void {
    if (this.exercise.interactive) {
      this.exerciseClick.emit(this.exercise);
    }
  }

  get hasAudio(): boolean {
    return !!this.exercise.audio;
  }

  get hasInteractive(): boolean {
    return !!this.exercise.interactive;
  }

  get contentType(): string {
    return this.exercise.content?.type || 'text';
  }

  getContent<T extends ExerciseContent>(): T {
    return this.exercise.content as T;
  }
}
