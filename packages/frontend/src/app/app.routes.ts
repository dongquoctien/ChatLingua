import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  // MCP OAuth2 Device Flow - no auth guard (handles its own login)
  {
    path: 'mcp-auth',
    loadComponent: () => import('./features/mcp-auth/mcp-auth.component').then(m => m.McpAuthComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'conversations',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/conversations/conversation-list/conversation-list.component').then(m => m.ConversationListComponent),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/conversations/conversation-detail/conversation-detail.component').then(m => m.ConversationDetailComponent),
          },
        ],
      },
      {
        path: 'vocabulary',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/vocabulary/vocabulary-list/vocabulary-list.component').then(m => m.VocabularyListComponent),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/vocabulary/vocabulary-detail/vocabulary-detail.component').then(m => m.VocabularyDetailComponent),
          },
        ],
      },
      {
        path: 'exercises',
        children: [
          {
            path: '',
            redirectTo: 'practice',
            pathMatch: 'full',
          },
          {
            path: 'practice',
            loadComponent: () => import('./features/exercises/exercise-practice/exercise-practice.component').then(m => m.ExercisePracticeComponent),
          },
          {
            path: 'history',
            loadComponent: () => import('./features/exercises/exercise-history/exercise-history.component').then(m => m.ExerciseHistoryComponent),
          },
        ],
      },
      {
        path: 'quizzes',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/quizzes/quiz-list/quiz-list.component').then(m => m.QuizListComponent),
          },
          {
            path: 'history',
            loadComponent: () => import('./features/quizzes/quiz-history/quiz-history.component').then(m => m.QuizHistoryComponent),
          },
          {
            path: ':id/play',
            loadComponent: () => import('./features/quizzes/quiz-player/quiz-player.component').then(m => m.QuizPlayerComponent),
          },
          {
            path: ':id/history',
            loadComponent: () => import('./features/quizzes/quiz-history/quiz-history.component').then(m => m.QuizHistoryComponent),
          },
        ],
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'review',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/review/daily-review/daily-review.component').then(m => m.DailyReviewComponent),
          },
          {
            path: 'flashcard',
            loadComponent: () => import('./features/review/flashcard/flashcard.component').then(m => m.FlashcardComponent),
          },
          {
            path: 'stats',
            loadComponent: () => import('./features/review/review-stats/review-stats.component').then(m => m.ReviewStatsComponent),
          },
        ],
      },
      {
        path: 'grammar',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/grammar/grammar-list/grammar-list.component').then(m => m.GrammarListComponent),
          },
          {
            path: 'review',
            loadComponent: () => import('./features/grammar/grammar-flashcard/grammar-flashcard.component').then(m => m.GrammarFlashcardComponent),
          },
          {
            path: 'exercises',
            loadComponent: () => import('./features/grammar/grammar-exercise-practice/grammar-exercise-practice.component').then(m => m.GrammarExercisePracticeComponent),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/grammar/grammar-detail/grammar-detail.component').then(m => m.GrammarDetailComponent),
          },
        ],
      },
      {
        path: 'achievements',
        loadComponent: () => import('./features/gamification/achievements-page/achievements-page.component').then(m => m.AchievementsPageComponent),
      },
      {
        path: 'leaderboard',
        loadComponent: () => import('./features/gamification/leaderboard-page/leaderboard-page.component').then(m => m.LeaderboardPageComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
