import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    FormsModule,
    MenubarModule,
    ButtonModule,
    AvatarModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'NurseScheduler';
  items: MenuItem[] = [];

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.items = [
      {
        label: 'Dashboard',
        icon: 'pi pi-fw pi-home',
        routerLink: ['/dashboard']
      },
      {
        label: 'Turni',
        icon: 'pi pi-fw pi-calendar',
        routerLink: ['/schedule']
      },
      {
        label: 'Personale',
        icon: 'pi pi-fw pi-users',
        routerLink: ['/staff']
      },
      {
        label: 'Richieste Cambio',
        icon: 'pi pi-fw pi-sync',
        routerLink: ['/change-requests']
      },
      {
        label: 'Ferie & Permessi',
        icon: 'pi pi-fw pi-calendar-plus',
        routerLink: ['/vacations']
      },
      {
        label: 'Deleghe',
        icon: 'pi pi-fw pi-user-plus',
        routerLink: ['/delegates']
      },
      {
        label: 'Impostazioni',
        icon: 'pi pi-fw pi-cog',
        routerLink: ['/settings']
      }
    ];
  }

  showInfo(message: string) {
    this.messageService.add({ severity: 'info', summary: 'Info', detail: message });
  }

  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Successo', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Errore', detail: message });
  }
}