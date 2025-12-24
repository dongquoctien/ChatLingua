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
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
