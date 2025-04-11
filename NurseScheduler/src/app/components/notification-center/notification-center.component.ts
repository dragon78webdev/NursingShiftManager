import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PushNotificationService } from '../../services/push-notification.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  unreadCount = 0;
  loading = false;
  showNotificationPanel = false;
  notificationSubscriptions: Subscription[] = [];
  pushSupported = false;
  pushEnabled = false;

  constructor(
    private pushNotificationService: PushNotificationService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.pushSupported = this.pushNotificationService.isPushNotificationSupported();
    
    if (this.pushSupported) {
      this.pushNotificationService.isPushNotificationEnabled().subscribe(enabled => {
        this.pushEnabled = enabled;
      });
    }

    this.loadNotifications();
    this.setupNotificationListeners();
  }

  ngOnDestroy(): void {
    // Cancella tutte le sottoscrizioni
    this.notificationSubscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Carica le notifiche dell'utente
   */
  loadNotifications(unreadOnly = false): void {
    this.loading = true;
    
    const sub = this.pushNotificationService.getNotifications(unreadOnly)
      .subscribe({
        next: (data) => {
          this.notifications = data;
          this.unreadCount = data.filter(n => !n.read).length;
          this.loading = false;
        },
        error: (error) => {
          console.error('Errore nel caricamento delle notifiche', error);
          this.toastService.show({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile caricare le notifiche'
          });
          this.loading = false;
        }
      });
    
    this.notificationSubscriptions.push(sub);
  }

  /**
   * Configura i listener per le notifiche push
   */
  setupNotificationListeners(): void {
    if (this.pushSupported) {
      // Listener per le notifiche push in arrivo
      const pushSub = this.pushNotificationService.listenForPushNotifications()
        .subscribe(() => {
          // Ricarica le notifiche quando ne arriva una nuova
          this.loadNotifications();
        });
      
      // Listener per i click sulle notifiche push
      const clickSub = this.pushNotificationService.listenForNotificationClicks()
        .subscribe(() => {
          // Ricarica le notifiche quando l'utente clicca su una notifica
          this.loadNotifications();
        });
      
      this.notificationSubscriptions.push(pushSub, clickSub);
    }
  }

  /**
   * Apre/chiude il pannello delle notifiche
   */
  toggleNotificationPanel(): void {
    this.showNotificationPanel = !this.showNotificationPanel;
    
    if (this.showNotificationPanel) {
      // Ricarica le notifiche quando il pannello viene aperto
      this.loadNotifications();
    }
  }

  /**
   * Marca una notifica come letta
   */
  markAsRead(notification: any): void {
    if (notification.read) return;
    
    const sub = this.pushNotificationService.markAsRead(notification.id)
      .subscribe({
        next: () => {
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        },
        error: (error) => {
          console.error('Errore nel segnare la notifica come letta', error);
          this.toastService.show({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile segnare la notifica come letta'
          });
        }
      });
    
    this.notificationSubscriptions.push(sub);
  }

  /**
   * Marca tutte le notifiche come lette
   */
  markAllAsRead(): void {
    if (this.unreadCount === 0) return;
    
    const sub = this.pushNotificationService.markAllAsRead()
      .subscribe({
        next: () => {
          this.notifications.forEach(n => n.read = true);
          this.unreadCount = 0;
          
          this.toastService.show({
            severity: 'success',
            summary: 'Operazione completata',
            detail: 'Tutte le notifiche sono state segnate come lette'
          });
        },
        error: (error) => {
          console.error('Errore nel segnare tutte le notifiche come lette', error);
          this.toastService.show({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile segnare tutte le notifiche come lette'
          });
        }
      });
    
    this.notificationSubscriptions.push(sub);
  }

  /**
   * Elimina una notifica
   */
  deleteNotification(notification: any, event: Event): void {
    event.stopPropagation();
    
    const sub = this.pushNotificationService.deleteNotification(notification.id)
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          if (!notification.read) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
          
          this.toastService.show({
            severity: 'success',
            summary: 'Operazione completata',
            detail: 'Notifica eliminata con successo'
          });
        },
        error: (error) => {
          console.error('Errore nell\'eliminazione della notifica', error);
          this.toastService.show({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile eliminare la notifica'
          });
        }
      });
    
    this.notificationSubscriptions.push(sub);
  }

  /**
   * Apre la notifica e naviga al link specificato
   */
  openNotification(notification: any): void {
    // Segna come letta
    this.markAsRead(notification);
    
    // Naviga al link della notifica, se presente
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
      this.showNotificationPanel = false;
    }
  }

  /**
   * Richiede l'autorizzazione per le notifiche push
   */
  requestPushPermission(): void {
    if (!this.pushSupported) return;
    
    const sub = this.pushNotificationService.requestSubscription()
      .subscribe({
        next: () => {
          this.pushEnabled = true;
          this.toastService.show({
            severity: 'success',
            summary: 'Operazione completata',
            detail: 'Notifiche push attivate con successo'
          });
        },
        error: (error) => {
          console.error('Errore nell\'attivazione delle notifiche push', error);
          this.toastService.show({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile attivare le notifiche push. ' + error.message
          });
        }
      });
    
    this.notificationSubscriptions.push(sub);
  }

  /**
   * Disattiva le notifiche push
   */
  disablePushNotifications(): void {
    if (!this.pushSupported || !this.pushEnabled) return;
    
    const sub = this.pushNotificationService.unsubscribeFromPush()
      .subscribe({
        next: () => {
          this.pushEnabled = false;
          this.toastService.show({
            severity: 'success',
            summary: 'Operazione completata',
            detail: 'Notifiche push disattivate con successo'
          });
        },
        error: (error) => {
          console.error('Errore nella disattivazione delle notifiche push', error);
          this.toastService.show({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile disattivare le notifiche push'
          });
        }
      });
    
    this.notificationSubscriptions.push(sub);
  }

  /**
   * Invia una notifica di test
   */
  sendTestNotification(): void {
    const sub = this.pushNotificationService.sendTestNotification()
      .subscribe({
        next: () => {
          this.toastService.show({
            severity: 'info',
            summary: 'Notifica di test',
            detail: 'Una notifica di test è stata inviata'
          });
        },
        error: (error) => {
          console.error('Errore nell\'invio della notifica di test', error);
          this.toastService.show({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile inviare la notifica di test'
          });
        }
      });
    
    this.notificationSubscriptions.push(sub);
  }
}