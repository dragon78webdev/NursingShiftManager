import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

export interface ToastOptions {
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail?: string;
  life?: number;
  sticky?: boolean;
  closable?: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private messageService: MessageService) {}

  /**
   * Mostra un messaggio toast
   */
  show(options: ToastOptions): void {
    // Valore di default per life e closable
    const life = options.sticky ? undefined : (options.life || 5000);
    const closable = options.closable !== false;
    
    // Se c'è un'azione, aggiungi un pulsante al messaggio
    if (options.action) {
      this.messageService.add({
        severity: options.severity,
        summary: options.summary,
        detail: options.detail,
        life,
        sticky: options.sticky,
        closable,
        styleClass: 'toast-with-action',
        // In PrimeNG è possibile aggiungere azioni personalizzate attraverso un template
        // ma qui utilizziamo il campo detail per aggiungere il markup del pulsante
        // Questa è una soluzione temporanea, in produzione si userebbe un componente personalizzato
        data: {
          action: options.action
        }
      });
    } else {
      this.messageService.add({
        severity: options.severity,
        summary: options.summary,
        detail: options.detail,
        life,
        sticky: options.sticky,
        closable
      });
    }
  }

  /**
   * Chiude tutti i messaggi toast
   */
  clear(): void {
    this.messageService.clear();
  }

  /**
   * Mostra un messaggio di successo
   */
  success(summary: string, detail?: string): void {
    this.show({
      severity: 'success',
      summary,
      detail
    });
  }

  /**
   * Mostra un messaggio informativo
   */
  info(summary: string, detail?: string): void {
    this.show({
      severity: 'info',
      summary,
      detail
    });
  }

  /**
   * Mostra un messaggio di avviso
   */
  warn(summary: string, detail?: string): void {
    this.show({
      severity: 'warn',
      summary,
      detail
    });
  }

  /**
   * Mostra un messaggio di errore
   */
  error(summary: string, detail?: string): void {
    this.show({
      severity: 'error',
      summary,
      detail
    });
  }
}