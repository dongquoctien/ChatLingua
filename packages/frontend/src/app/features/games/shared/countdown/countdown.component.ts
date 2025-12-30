import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './countdown.component.html',
  styleUrls: ['./countdown.component.scss']
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input() startFrom: number = 3;
  @Input() autoStart: boolean = true;

  @Output() countdownComplete = new EventEmitter<void>();

  currentCount: number = 0;
  isActive: boolean = false;
  private intervalId: any = null;

  ngOnInit(): void {
    if (this.autoStart) {
      this.start();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  start(): void {
    this.currentCount = this.startFrom;
    this.isActive = true;

    this.intervalId = setInterval(() => {
      this.currentCount--;
      if (this.currentCount <= 0) {
        this.stop();
        this.countdownComplete.emit();
      }
    }, 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
  }

  get displayText(): string {
    if (this.currentCount <= 0) return 'GO!';
    return this.currentCount.toString();
  }
}
