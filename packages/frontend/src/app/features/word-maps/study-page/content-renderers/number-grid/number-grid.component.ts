import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumberGridContent } from '@chatlingua/shared';

@Component({
  selector: 'app-number-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './number-grid.component.html',
  styleUrls: ['./number-grid.component.scss']
})
export class NumberGridComponent {
  @Input({ required: true }) content!: NumberGridContent;
}
