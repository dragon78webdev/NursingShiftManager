import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-pwa-install',
  templateUrl: './pwa-install.component.html',
  styleUrls: ['./pwa-install.component.scss']
})
export class PwaInstallComponent implements OnInit, OnDestroy {
  private deferredPrompt: any;
  showInstallButton = false;
  isIos = false;
  isIosPwaInstalled = false;
  showIosInstructions = false;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.checkIosDevice();
    
    // Se l'app è già installata, non mostriamo il pulsante
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      this.showInstallButton = false;
      return;
    }
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  /**
   * Intercetta l'evento beforeinstallprompt
   * per poterlo riutilizzare quando l'utente clicca sul pulsante
   */
  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: Event): void {
    console.log('beforeinstallprompt event fired');
    // Impedisce al browser di mostrare il prompt automatico
    e.preventDefault();
    // Salva l'evento per poterlo riutilizzare in seguito
    this.deferredPrompt = e;
    // Mostra il pulsante di installazione
    this.showInstallButton = true;
  }

  /**
   * Intercetta l'evento appinstalled
   * per aggiornare l'interfaccia dopo l'installazione
   */
  @HostListener('window:appinstalled', ['$event'])
  onAppInstalled(e: Event): void {
    console.log('App installata con successo');
    this.showInstallButton = false;
    this.deferredPrompt = null;
    this.toastService.success(
      'App installata',
      'Nurse Scheduler è stata installata con successo sul tuo dispositivo.'
    );
  }

  /**
   * Mostra il prompt di installazione all'utente
   */
  installPwa(): void {
    if (!this.deferredPrompt) {
      console.log('Nessun prompt di installazione disponibile');
      return;
    }

    // Mostra il prompt di installazione
    this.deferredPrompt.prompt();

    // Aspetta che l'utente risponda al prompt
    this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Utente ha accettato il prompt di installazione');
        this.showInstallButton = false;
      } else {
        console.log('Utente ha rifiutato il prompt di installazione');
      }
      this.deferredPrompt = null;
    });
  }

  /**
   * Controlla se il dispositivo è iOS e gestisce la visualizzazione
   * delle istruzioni specifiche per iOS
   */
  private checkIosDevice(): void {
    const userAgent = window.navigator.userAgent.toLowerCase();
    this.isIos = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    
    // Controlla se l'app è già installata su iOS
    this.isIosPwaInstalled = (window.navigator as any).standalone === true;
    
    if (this.isIos && !this.isIosPwaInstalled) {
      this.showInstallButton = true;
    }
  }

  /**
   * Mostra/nasconde le istruzioni per l'installazione su iOS
   */
  toggleIosInstructions(): void {
    this.showIosInstructions = !this.showIosInstructions;
  }
}