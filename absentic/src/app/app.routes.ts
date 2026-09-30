import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
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
    path: 'ramos',
    loadComponent: () => import('./home/ramos/ramos.page').then( m => m.RamosPage)
  },
  {
    path: 'editar',
    loadComponent: () => import('./home/ramos/editar/editar.page').then( m => m.EditarPage)
  },
  {
    path: 'informes',
    loadComponent: () => import('./pages/informes/informes.page').then( m => m.InformesPage)
  },

  
];
