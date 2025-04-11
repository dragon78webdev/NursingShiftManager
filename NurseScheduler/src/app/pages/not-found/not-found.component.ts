import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <h1>404</h1>
        <h2>Pagina Non Trovata</h2>
        <p>La pagina che stai cercando non esiste o è stata spostata.</p>
        <p-button label="Torna alla Dashboard" icon="pi pi-home" routerLink="/dashboard"></p-button>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 2rem;
    }

    .not-found-content {
      text-align: center;
      max-width: 600px;
    }

    h1 {
      font-size: 6rem;
      margin: 0;
      color: #1976d2;
    }

    h2 {
      font-size: 2rem;
      margin-top: 0;
      margin-bottom: 1rem;
    }

    p {
      margin-bottom: 2rem;
      font-size: 1.1rem;
      color: #666;
    }
  `]
})
export class NotFoundComponent {}