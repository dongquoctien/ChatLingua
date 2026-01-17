import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrammarBox } from '@chatlingua/shared';

@Component({
  selector: 'app-grammar-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grammar-table.component.html',
  styleUrls: ['./grammar-table.component.scss']
})
export class GrammarTableComponent {
  @Input({ required: true }) grammarBox!: GrammarBox;
}
