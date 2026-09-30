import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [                                  // <- cada pestaña es una ruta hija de tabs
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'informes',
        loadComponent: () => import('./pages/informes/informes.page').then((m) => m.InformesPage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
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
