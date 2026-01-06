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
        path: 'games',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/games/games-hub/games-hub.component').then(m => m.GamesHubComponent),
          },
          {
            path: 'word_rush',
            loadComponent: () => import('./features/games/word-rush/word-rush.component').then(m => m.WordRushComponent),
          },
          {
            path: 'memory_match',
            loadComponent: () => import('./features/games/memory-match/memory-match.component').then(m => m.MemoryMatchComponent),
          },
          {
            path: 'hangman',
            loadComponent: () => import('./features/games/hangman/hangman.component').then(m => m.HangmanComponent),
          },
          {
            path: 'spelling_bee',
            loadComponent: () => import('./features/games/spelling-bee/spelling-bee.component').then(m => m.SpellingBeeComponent),
          },
          {
            path: 'falling_words',
            loadComponent: () => import('./features/games/falling-words/falling-words.component').then(m => m.FallingWordsComponent),
          },
          {
            path: 'crossword',
            loadComponent: () => import('./features/games/crossword/crossword.component').then(m => m.CrosswordComponent),
          },
          {
            path: 'word_search',
            loadComponent: () => import('./features/games/word-search/word-search.component').then(m => m.WordSearchComponent),
          },
          {
            path: 'anagram',
            loadComponent: () => import('./features/games/anagram/anagram.component').then(m => m.AnagramComponent),
          },
          {
            path: 'word_duel',
            loadComponent: () => import('./features/games/word-duel/word-duel.component').then(m => m.WordDuelComponent),
          },
          {
            path: 'pop_quiz_blitz',
            loadComponent: () => import('./features/games/pop-quiz-blitz/pop-quiz-blitz.component').then(m => m.PopQuizBlitzComponent),
          },
          {
            path: 'translation_race',
            loadComponent: () => import('./features/games/translation-race/translation-race.component').then(m => m.TranslationRaceComponent),
          },
          // Phase 4: Adventure & Collection
          {
            path: 'vocabulary_quest',
            loadComponent: () => import('./features/games/vocabulary-quest/vocabulary-quest.component').then(m => m.VocabularyQuestComponent),
          },
          {
            path: 'word_cards',
            loadComponent: () => import('./features/games/word-cards/word-cards.component').then(m => m.WordCardsComponent),
          },
          {
            path: 'language_island',
            loadComponent: () => import('./features/games/language-island/language-island.component').then(m => m.LanguageIslandComponent),
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
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notification-list.component').then(m => m.NotificationListComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'sync-requests',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/sync-requests/sync-request-list/sync-request-list.component').then(m => m.SyncRequestListComponent),
          },
          {
            path: 'my',
            loadComponent: () => import('./features/sync-requests/my-requests/my-requests.component').then(m => m.MyRequestsComponent),
          },
          {
            path: 'create',
            loadComponent: () => import('./features/sync-requests/create-request/create-request.component').then(m => m.CreateRequestComponent),
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/sync-requests/create-request/create-request.component').then(m => m.CreateRequestComponent),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/sync-requests/request-detail/request-detail.component').then(m => m.RequestDetailComponent),
          },
        ],
      },
      {
        path: 'chat',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
          },
          {
            path: ':conversationId',
            loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
          },
        ],
      },
      {
        path: 'shop',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/shop/shop-home/shop-home.component').then(m => m.ShopHomeComponent),
          },
          {
            path: 'browse',
            loadComponent: () => import('./features/shop/shop-browse/shop-browse.component').then(m => m.ShopBrowseComponent),
          },
          {
            path: 'inventory',
            loadComponent: () => import('./features/shop/shop-inventory/shop-inventory.component').then(m => m.ShopInventoryComponent),
          },
          {
            path: 'gifts',
            loadComponent: () => import('./features/shop/shop-gifts/shop-gifts.component').then(m => m.ShopGiftsComponent),
          },
          {
            path: 'wishlist',
            loadComponent: () => import('./features/shop/shop-wishlist/shop-wishlist.component').then(m => m.ShopWishlistComponent),
          },
          {
            path: 'items/:slug',
            loadComponent: () => import('./features/shop/shop-item-detail/shop-item-detail.component').then(m => m.ShopItemDetailComponent),
          },
        ],
      },
      {
        path: 'pets',
        loadChildren: () => import('./features/pets/pets.routes').then(m => m.petsRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
