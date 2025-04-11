import { Component, OnInit } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { PushNotificationService } from './services/push-notification.service';
import { ToastService } from './services/toast.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Nurse Scheduler';
  
  constructor(
    private swUpdate: SwUpdate,
    private pushNotificationService: PushNotificationService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    // Verifica se c'è un aggiornamento dell'app
    if (this.swUpdate.isEnabled) {
      this.swUpdate.available.subscribe(event => {
        console.log('Disponibile nuovo aggiornamento: ', event);
        
        this.toastService.show({
          severity: 'info',
          summary: 'Aggiornamento disponibile',
          detail: 'Cliccando su "Aggiorna" l\'applicazione verrà ricaricata con la nuova versione.',
          sticky: true,
          action: {
            label: 'Aggiorna',
            callback: () => this.updateApp()
          }
        });
      });
    }

    // Ascolta le notifiche push
    if (this.pushNotificationService.isPushNotificationSupported()) {
      this.setupPushNotifications();
    }

    // Traccia le navigazioni per analytics
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      console.log('Navigazione a:', event.urlAfterRedirects);
      // Qui potremmo aggiungere il tracciamento con un servizio di analytics
    });
  }

  /**
   * Aggiorna l'applicazione quando è disponibile una nuova versione
   */
  private updateApp() {
    this.swUpdate.activateUpdate().then(() => {
      window.location.reload();
    });
  }

  /**
   * Configura le notifiche push
   */
  private setupPushNotifications() {
    // Ascolta le notifiche push in arrivo
    this.pushNotificationService.listenForPushNotifications().subscribe(message => {
      console.log('Notifica ricevuta:', message);
      
      // Mostra un toast per la notifica
      this.toastService.show({
        severity: 'info',
        summary: message.notification?.title || 'Notifica',
        detail: message.notification?.body || '',
        action: message.notification?.data?.link ? {
          label: 'Visualizza',
          callback: () => this.router.navigateByUrl(message.notification.data.link)
        } : undefined
      });
    });

    // Ascolta i click sulle notifiche push
    this.pushNotificationService.listenForNotificationClicks().subscribe(event => {
      console.log('Click su notifica:', event);
      
      // Naviga alla pagina specificata nella notifica
      if (event.notification.data && event.notification.data.link) {
        this.router.navigateByUrl(event.notification.data.link);
      }
    });

    // Verifica se le notifiche sono già autorizzate
    this.pushNotificationService.isPushNotificationEnabled().subscribe(enabled => {
      if (!enabled) {
        // Chiedi l'autorizzazione solo dopo l'interazione dell'utente,
        // ad esempio dopo un click su un pulsante specifico
        console.log('Notifiche push non abilitate, verrà mostrato un pulsante per abilitarle');
      }
    });
  }
}