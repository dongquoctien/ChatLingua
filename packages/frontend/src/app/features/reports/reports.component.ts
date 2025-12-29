import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faFire,
  faTrophy,
  faCheckCircle,
  faLanguage,
  faComments,
  faDumbbell,
  faQuestionCircle,
  faSpinner,
} from '../../shared/icons';
import { ApiService, PeriodReport, UserStats } from '../../core/services/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faFire = faFire;
  faTrophy = faTrophy;
  faCheckCircle = faCheckCircle;
  faLanguage = faLanguage;
  faComments = faComments;
  faDumbbell = faDumbbell;
  faQuestionCircle = faQuestionCircle;
  faSpinner = faSpinner;

  stats = signal<UserStats | null>(null);
  weeklyReport = signal<PeriodReport | null>(null);
  monthlyReport = signal<PeriodReport | null>(null);
  loading = signal(true);
  activeTab = signal<'weekly' | 'monthly'>('weekly');

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiService.getStatsOverview().subscribe({
      next: (stats) => this.stats.set(stats)
    });

    this.apiService.getWeeklyReport().subscribe({
      next: (report) => this.weeklyReport.set(report)
    });

    this.apiService.getMonthlyReport().subscribe({
      next: (report) => {
        this.monthlyReport.set(report);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setTab(tab: 'weekly' | 'monthly') {
    this.activeTab.set(tab);
  }
}
