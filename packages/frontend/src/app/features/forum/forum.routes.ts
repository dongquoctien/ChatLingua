import { Routes } from '@angular/router';

export const FORUM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/forum-home/forum-home.component')
      .then(m => m.ForumHomeComponent),
    title: 'Community Forum'
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/create-post/create-post.component')
      .then(m => m.CreatePostComponent),
    title: 'Share Conversation'
  },
  {
    path: 'my-posts',
    loadComponent: () => import('./pages/my-posts/my-posts.component')
      .then(m => m.MyPostsComponent),
    title: 'My Posts'
  },
  {
    path: 'bookmarks',
    loadComponent: () => import('./pages/bookmarks/bookmarks.component')
      .then(m => m.BookmarksComponent),
    title: 'Bookmarks'
  },
  {
    path: 'imports',
    loadComponent: () => import('./pages/imports/imports.component')
      .then(m => m.ImportsComponent),
    title: 'My Imports'
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard/leaderboard.component')
      .then(m => m.LeaderboardComponent),
    title: 'Forum Leaderboard'
  },
  {
    path: 'collections',
    loadComponent: () => import('./pages/collections/collections.component')
      .then(m => m.CollectionsComponent),
    title: 'My Collections'
  },
  {
    path: 'collections/:id',
    loadComponent: () => import('./pages/collection-detail/collection-detail.component')
      .then(m => m.CollectionDetailComponent),
    title: 'Collection'
  },
  {
    path: 'authors/:username',
    loadComponent: () => import('./pages/author-profile/author-profile.component')
      .then(m => m.AuthorProfileComponent),
    title: 'Author Profile'
  },
  {
    path: ':slug',
    loadComponent: () => import('./pages/post-detail/post-detail.component')
      .then(m => m.PostDetailComponent),
    title: 'Post'
  }
];
