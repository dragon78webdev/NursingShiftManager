import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

// Services
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputSwitchModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="settings-container">
      <h1>Impostazioni</h1>
      
      <div class="settings-grid">
        <div class="col-12 md:col-6">
          <p-card header="Impostazioni Applicazione" styleClass="h-full">
            <div class="setting-item">
              <div class="setting-label">
                <h3>Notifiche Push</h3>
                <p>Ricevi notifiche per nuove richieste, approvazioni, ecc.</p>
              </div>
              <p-inputSwitch [(ngModel)]="pushNotifications" (onChange)="saveSetting('pushNotifications')"></p-inputSwitch>
            </div>
            
            <div class="setting-item">
              <div class="setting-label">
                <h3>Notifiche Email</h3>
                <p>Ricevi email per aggiornamenti importanti</p>
              </div>
              <p-inputSwitch [(ngModel)]="emailNotifications" (onChange)="saveSetting('emailNotifications')"></p-inputSwitch>
            </div>
            
            <div class="setting-item">
              <div class="setting-label">
                <h3>Tema Scuro</h3>
                <p>Usa il tema scuro nell'applicazione</p>
              </div>
              <p-inputSwitch [(ngModel)]="darkTheme" (onChange)="saveSetting('darkTheme')"></p-inputSwitch>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-6">
          <p-card header="Impostazioni Account" styleClass="h-full">
            <div class="account-info">
              <h3>Il tuo account</h3>
              <p><strong>Nome:</strong> {{ currentUser?.name }}</p>
              <p><strong>Email:</strong> {{ currentUser?.email }}</p>
              <p><strong>Ruolo:</strong> {{ getRoleLabel(currentUser?.role) }}</p>
            </div>
            
            <p-divider></p-divider>
            
            <div class="actions">
              <p-button label="Installa App" icon="pi pi-download" 
                       styleClass="p-button-outlined mb-3 w-full"
                       (onClick)="installApp()" [disabled]="!isPwaInstallable"></p-button>
              
              <p-button label="Disconnetti" icon="pi pi-sign-out" 
                       styleClass="p-button-outlined p-button-danger w-full"
                       (onClick)="confirmLogout()"></p-button>
            </div>
          </p-card>
        </div>
        
        <div class="col-12">
          <p-card header="Informazioni" styleClass="mt-3">
            <div class="app-info">
              <p><strong>Versione:</strong> 1.0.0</p>
              <p><strong>Data rilascio:</strong> 11 Aprile 2025</p>
              <p>
                <strong>Descrizione:</strong> 
                NurseScheduler è un'applicazione per la gestione dei turni di infermieri e OSS, 
                sviluppata con Angular 19 e PrimeNG.
              </p>
            </div>
          </p-card>
        </div>
      </div>
      
      <p-toast></p-toast>
      <p-confirmDialog header="Conferma Logout" icon="pi pi-exclamation-triangle"></p-confirmDialog>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 1rem;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      color: #1976d2;
    }
    
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    @media (min-width: 768px) {
      .settings-grid {
        grid-template-columns: 1fr 1fr;
      }
      
      .col-12 {
        grid-column: span 2;
      }
      
      .md\\:col-6 {
        grid-column: span 1;
      }
    }
    
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    .setting-item:last-child {
      margin-bottom: 0;
    }
    
    .setting-label h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }
    
    .setting-label p {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }
    
    .account-info {
      margin-bottom: 1.5rem;
    }
    
    .account-info h3 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
    }
    
    .account-info p {
      margin: 0.5rem 0;
    }
    
    .actions {
      display: flex;
      flex-direction: column;
      margin-top: 1rem;
    }
    
    .app-info p {
      margin: 0.5rem 0;
    }
    
    .w-full {
      width: 100%;
    }
    
    .mb-3 {
      margin-bottom: 1rem;
    }
    
    .h-full {
      height: 100%;
    }
    
    .mt-3 {
      margin-top: 1rem;
    }
  `]
})
export class SettingsComponent {
  pushNotifications = true;
  emailNotifications = true;
  darkTheme = false;
  isPwaInstallable = false;
  deferredPrompt: any = null;
  
  get currentUser() {
    return this.authService.currentUserValue;
  }
  
  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Check if PWA is installable
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Update UI to notify the user they can install the PWA
      this.isPwaInstallable = true;
    });
    
    // Load settings from localStorage
    this.loadSettings();
  }
  
  loadSettings(): void {
    const settings = localStorage.getItem('nurseSchedulerSettings');
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      this.pushNotifications = parsedSettings.pushNotifications ?? true;
      this.emailNotifications = parsedSettings.emailNotifications ?? true;
      this.darkTheme = parsedSettings.darkTheme ?? false;
      
      // Apply dark theme if selected
      if (this.darkTheme) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }
  
  saveSetting(setting: string): void {
    const settings = localStorage.getItem('nurseSchedulerSettings') || '{}';
    const parsedSettings = JSON.parse(settings);
    
    switch (setting) {
      case 'pushNotifications':
        parsedSettings.pushNotifications = this.pushNotifications;
        break;
      case 'emailNotifications':
        parsedSettings.emailNotifications = this.emailNotifications;
        break;
      case 'darkTheme':
        parsedSettings.darkTheme = this.darkTheme;
        // Apply dark theme if selected
        if (this.darkTheme) {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
        break;
    }
    
    localStorage.setItem('nurseSchedulerSettings', JSON.stringify(parsedSettings));
    
    this.messageService.add({
      severity: 'success',
      summary: 'Impostazioni Salvate',
      detail: 'Le tue preferenze sono state aggiornate.'
    });
  }
  
  installApp(): void {
    if (!this.deferredPrompt) {
      this.messageService.add({
        severity: 'info',
        summary: 'Installazione non disponibile',
        detail: 'Questa funzionalità è disponibile solo su dispositivi mobili o browser compatibili.'
      });
      return;
    }
    
    // Show the install prompt
    this.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        this.messageService.add({
          severity: 'success',
          summary: 'Installazione Avviata',
          detail: 'L\'app verrà installata sul tuo dispositivo.'
        });
      }
      // Reset the deferredPrompt variable
      this.deferredPrompt = null;
      this.isPwaInstallable = false;
    });
  }
  
  confirmLogout(): void {
    this.confirmationService.confirm({
      message: 'Sei sicuro di voler uscire dall\'applicazione?',
      accept: () => {
        this.logout();
      }
    });
  }
  
  logout(): void {
    this.authService.logout()
      .subscribe({
        next: () => {
          // Redirect to login page or homepage handled by auth service
        },
        error: (error) => {
          console.error('Error during logout', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Si è verificato un errore durante il logout. Riprova.'
          });
        }
      });
  }
  
  getRoleLabel(role?: string): string {
    if (!role) return '';
    
    const labels: { [key: string]: string } = {
      'nurse': 'Infermiere',
      'oss': 'OSS',
      'head_nurse': 'Capo Sala'
    };
    
    return labels[role] || role;
  }
}