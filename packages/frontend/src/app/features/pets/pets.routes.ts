import { Routes } from '@angular/router';

export const petsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/pets-list/pets-list.component').then((m) => m.PetsListComponent),
    title: 'My Pets - ChatLingua',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/pet-detail/pet-detail.component').then((m) => m.PetDetailComponent),
    title: 'Pet Details - ChatLingua',
  },
];
