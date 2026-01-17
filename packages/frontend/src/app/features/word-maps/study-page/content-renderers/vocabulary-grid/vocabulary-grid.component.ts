import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VocabularyGridContent } from '@chatlingua/shared';

@Component({
  selector: 'app-vocabulary-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vocabulary-grid.component.html',
  styleUrls: ['./vocabulary-grid.component.scss']
})
export class VocabularyGridComponent {
  @Input({ required: true }) content!: VocabularyGridContent;
}
