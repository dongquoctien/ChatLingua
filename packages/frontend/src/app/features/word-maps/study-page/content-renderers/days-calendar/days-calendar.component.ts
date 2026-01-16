import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DaysCalendarContent } from '@chatlingua/shared';

@Component({
  selector: 'app-days-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './days-calendar.component.html',
  styleUrls: ['./days-calendar.component.scss']
})
export class DaysCalendarComponent {
  @Input({ required: true }) content!: DaysCalendarContent;

  getDayColor(index: number): string {
    const colors = [
      'bg-red-500',    // Monday
      'bg-orange-500', // Tuesday
      'bg-yellow-500', // Wednesday
      'bg-green-500',  // Thursday
      'bg-blue-500',   // Friday
      'bg-purple-500', // Saturday
      'bg-pink-500'    // Sunday
    ];
    return colors[index % colors.length];
  }
}
