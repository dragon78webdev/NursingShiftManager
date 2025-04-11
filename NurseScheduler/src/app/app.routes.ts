import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(c => c.DashboardComponent)
  },
  {
    path: 'schedule',
    loadComponent: () => import('./pages/schedule/schedule.component').then(c => c.ScheduleComponent)
  },
  {
    path: 'staff',
    loadComponent: () => import('./pages/staff/staff.component').then(c => c.StaffComponent)
  },
  {
    path: 'change-requests',
    loadComponent: () => import('./pages/change-requests/change-requests.component').then(c => c.ChangeRequestsComponent)
  },
  {
    path: 'vacations',
    loadComponent: () => import('./pages/vacations/vacations.component').then(c => c.VacationsComponent)
  },
  {
    path: 'delegates',
    loadComponent: () => import('./pages/delegates/delegates.component').then(c => c.DelegatesComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(c => c.SettingsComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(c => c.NotFoundComponent)
  }
];