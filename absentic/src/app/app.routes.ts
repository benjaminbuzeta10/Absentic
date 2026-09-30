import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'agregar',
    loadComponent: () => import('./home/agregar/agregar.page').then( m => m.AgregarPage)
  },
  {
    path: 'editar',
    loadComponent: () => import('./home/ramos/editar/editar.page').then( m => m.EditarPage)
  },
];
