import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly VAPID_PUBLIC_KEY = 'BNy1KF6EBqjFpv0KnP_f6OScTiZZ8_5_jwYhCH0PU-erqbpF6R7sA1OLuAcFcPE9lEg21OktHu1nvZfEhCT2zRU';
  
  constructor(
    private http: HttpClient,
    private swPush: SwPush
  ) {}

  /**
   * Richiede l'autorizzazione e sottoscrive alle notifiche push
   */
  requestSubscription(): Observable<any> {
    return from(this.swPush.requestSubscription({
      serverPublicKey: this.VAPID_PUBLIC_KEY
    })).pipe(
      switchMap(subscription => this.registerSubscription(subscription)),
      catchError(error => {
        console.error('Could not subscribe to notifications', error);
        return throwError(() => new Error('Errore nella sottoscrizione alle notifiche push'));
      })
    );
  }

  /**
   * Registra la sottoscrizione push sul server
   */
  private registerSubscription(subscription: PushSubscription): Observable<any> {
    const subscriptionObject = subscription.toJSON();
    
    // Aggiungi informazioni sul dispositivo
    const deviceInfo = {
      deviceName: this.getDeviceName(),
      deviceType: this.getDeviceType()
    };
    
    return this.http.post('/api/notification/subscriptions', {
      endpoint: subscriptionObject.endpoint,
      keys: subscriptionObject.keys,
      ...deviceInfo
    }).pipe(
      catchError(error => {
        console.error('Error registering push subscription', error);
        return throwError(() => new Error('Errore nella registrazione della sottoscrizione push'));
      })
    );
  }

  /**
   * Verifica se il browser supporta le notifiche push
   */
  isPushNotificationSupported(): boolean {
    return this.swPush.isEnabled;
  }

  /**
   * Verifica se le notifiche sono già autorizzate
   */
  isPushNotificationEnabled(): Observable<boolean> {
    if (!this.isPushNotificationSupported()) {
      return of(false);
    }
    
    if ('Notification' in window) {
      return of(Notification.permission === 'granted');
    }
    
    return of(false);
  }

  /**
   * Cancella una sottoscrizione esistente
   */
  unsubscribeFromPush(): Observable<any> {
    return from(this.swPush.unsubscribe()).pipe(
      switchMap(() => {
        return this.swPush.subscription.pipe(
          switchMap(subscription => {
            if (subscription) {
              return this.http.delete('/api/notification/subscriptions/endpoint', {
                body: { endpoint: subscription.endpoint }
              });
            }
            return of(null);
          })
        );
      }),
      catchError(error => {
        console.error('Error unsubscribing from push notifications', error);
        return throwError(() => new Error('Errore nella cancellazione della sottoscrizione push'));
      })
    );
  }

  /**
   * Ottiene le notifiche dell'utente
   */
  getNotifications(unreadOnly: boolean = false): Observable<any[]> {
    const url = `/api/notification?unreadOnly=${unreadOnly}`;
    return this.http.get<any[]>(url).pipe(
      catchError(error => {
        console.error('Error getting notifications', error);
        return throwError(() => new Error('Errore nel recupero delle notifiche'));
      })
    );
  }

  /**
   * Segna una notifica come letta
   */
  markAsRead(id: number): Observable<any> {
    return this.http.put(`/api/notification/${id}/read`, {}).pipe(
      catchError(error => {
        console.error('Error marking notification as read', error);
        return throwError(() => new Error('Errore nel segnare la notifica come letta'));
      })
    );
  }

  /**
   * Segna tutte le notifiche come lette
   */
  markAllAsRead(): Observable<any> {
    return this.http.put('/api/notification/read-all', {}).pipe(
      catchError(error => {
        console.error('Error marking all notifications as read', error);
        return throwError(() => new Error('Errore nel segnare tutte le notifiche come lette'));
      })
    );
  }

  /**
   * Elimina una notifica
   */
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`/api/notification/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting notification', error);
        return throwError(() => new Error('Errore nell\'eliminazione della notifica'));
      })
    );
  }

  /**
   * Invia una notifica di test
   */
  sendTestNotification(): Observable<any> {
    return this.http.post('/api/notification/test', {}).pipe(
      catchError(error => {
        console.error('Error sending test notification', error);
        return throwError(() => new Error('Errore nell\'invio della notifica di test'));
      })
    );
  }

  /**
   * Ascolta gli eventi delle notifiche push
   */
  listenForPushNotifications(): Observable<any> {
    return this.swPush.messages.pipe(
      tap(message => {
        console.log('Received push notification', message);
      }),
      catchError(error => {
        console.error('Error in push notification listener', error);
        return throwError(() => new Error('Errore nell\'ascolto delle notifiche push'));
      })
    );
  }

  /**
   * Ascolta i click sulle notifiche push
   */
  listenForNotificationClicks(): Observable<any> {
    return this.swPush.notificationClicks.pipe(
      tap(event => {
        console.log('Notification click', event);
        
        // Naviga all'URL specificato nella notifica, se presente
        if (event.notification.data && event.notification.data.link) {
          window.open(event.notification.data.link, '_blank');
        }
      }),
      catchError(error => {
        console.error('Error in notification click listener', error);
        return throwError(() => new Error('Errore nell\'ascolto dei click sulle notifiche'));
      })
    );
  }

  /**
   * Ottiene il nome del dispositivo
   */
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    let deviceName = 'Unknown Device';
    
    if (userAgent.includes('iPhone')) {
      deviceName = 'iPhone';
    } else if (userAgent.includes('iPad')) {
      deviceName = 'iPad';
    } else if (userAgent.includes('Android')) {
      deviceName = 'Android Device';
    } else if (userAgent.includes('Windows')) {
      deviceName = 'Windows Device';
    } else if (userAgent.includes('Macintosh')) {
      deviceName = 'Macintosh';
    } else if (userAgent.includes('Linux')) {
      deviceName = 'Linux Device';
    }
    
    return deviceName;
  }

  /**
   * Ottiene il tipo di dispositivo
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    
    if (/Mobi|Android/i.test(userAgent)) {
      return 'Mobile';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }
}