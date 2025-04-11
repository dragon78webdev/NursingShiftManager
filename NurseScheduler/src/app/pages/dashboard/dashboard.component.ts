import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// PrimeNG Components
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

// Services
import { AuthService } from '@services/auth.service';
import { ChangeRequestService } from '@services/change-request.service';
import { VacationService } from '@services/vacation.service';

// Models
import { ChangeRequestData, VacationData, Role, RequestStatus } from '@models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    ChartModule,
    TableModule,
    TagModule
  ],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      
      <div class="grid">
        <!-- Stats Cards -->
        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="pi pi-calendar"></i>
              </div>
              <div class="stat-data">
                <h3>Turni in programma</h3>
                <p class="stat-number">12</p>
              </div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="pi pi-sync"></i>
              </div>
              <div class="stat-data">
                <h3>Richieste Cambio</h3>
                <p class="stat-number">{{ pendingChangeRequests.length }}</p>
              </div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="pi pi-calendar-plus"></i>
              </div>
              <div class="stat-data">
                <h3>Richieste Ferie</h3>
                <p class="stat-number">{{ pendingVacations.length }}</p>
              </div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="pi pi-users"></i>
              </div>
              <div class="stat-data">
                <h3>Personale</h3>
                <p class="stat-number">24</p>
              </div>
            </div>
          </p-card>
        </div>
      </div>
      
      <!-- Change Requests Table -->
      <div class="dashboard-section" *ngIf="isHeadNurse">
        <h2>Richieste di Cambio Turno</h2>
        <p-table [value]="pendingChangeRequests" [paginator]="true" [rows]="5" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Richiedente</th>
              <th>Data</th>
              <th>Turno Attuale</th>
              <th>Turno Richiesto</th>
              <th>Motivo</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-request>
            <tr>
              <td>{{ request.staffName }}</td>
              <td>{{ request.shiftDate }}</td>
              <td>{{ getShiftLabel(request.shiftType) }}</td>
              <td>{{ getShiftLabel(request.requestedShiftType) }}</td>
              <td>{{ request.reason }}</td>
              <td>
                <p-tag [value]="getStatusLabel(request.status)" [severity]="getStatusSeverity(request.status)"></p-tag>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button icon="pi pi-check" styleClass="p-button-success p-button-sm" 
                            (onClick)="approveRequest(request.id)"></p-button>
                  <p-button icon="pi pi-times" styleClass="p-button-danger p-button-sm ml-2" 
                            (onClick)="rejectRequest(request.id)"></p-button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center">Nessuna richiesta di cambio turno in attesa.</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      
      <!-- Vacation Requests Table -->
      <div class="dashboard-section" *ngIf="isHeadNurse">
        <h2>Richieste di Ferie</h2>
        <p-table [value]="pendingVacations" [paginator]="true" [rows]="5" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Richiedente</th>
              <th>Data Inizio</th>
              <th>Data Fine</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-vacation>
            <tr>
              <td>{{ vacation.staffName }}</td>
              <td>{{ vacation.startDate }}</td>
              <td>{{ vacation.endDate }}</td>
              <td>
                <p-tag [value]="vacation.approved === null ? 'In attesa' : (vacation.approved ? 'Approvata' : 'Respinta')" 
                      [severity]="vacation.approved === null ? 'warning' : (vacation.approved ? 'success' : 'danger')"></p-tag>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button icon="pi pi-check" styleClass="p-button-success p-button-sm" 
                            (onClick)="approveVacation(vacation.id)"></p-button>
                  <p-button icon="pi pi-times" styleClass="p-button-danger p-button-sm ml-2" 
                            (onClick)="rejectVacation(vacation.id)"></p-button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" class="text-center">Nessuna richiesta di ferie in attesa.</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      
      <!-- Links for regular users -->
      <div class="dashboard-section" *ngIf="!isHeadNurse">
        <h2>Azioni Rapide</h2>
        <div class="grid">
          <div class="col-12 md:col-4">
            <p-card styleClass="action-card">
              <div class="action-content">
                <i class="pi pi-calendar"></i>
                <h3>Visualizza i Turni</h3>
                <p>Controlla i tuoi turni programmati</p>
                <p-button label="Vai ai Turni" routerLink="/schedule"></p-button>
              </div>
            </p-card>
          </div>
          
          <div class="col-12 md:col-4">
            <p-card styleClass="action-card">
              <div class="action-content">
                <i class="pi pi-sync"></i>
                <h3>Richiedi Cambio Turno</h3>
                <p>Invia una richiesta per modificare un turno</p>
                <p-button label="Richiedi Cambio" routerLink="/change-requests"></p-button>
              </div>
            </p-card>
          </div>
          
          <div class="col-12 md:col-4">
            <p-card styleClass="action-card">
              <div class="action-content">
                <i class="pi pi-calendar-plus"></i>
                <h3>Richiedi Ferie</h3>
                <p>Invia una richiesta per le ferie</p>
                <p-button label="Richiedi Ferie" routerLink="/vacations"></p-button>
              </div>
            </p-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 1rem;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      color: #1976d2;
    }
    
    .dashboard-section {
      margin-top: 2rem;
    }
    
    h2 {
      margin-bottom: 1rem;
      color: #333;
    }
    
    .stat-card {
      height: 100%;
    }
    
    .stat-content {
      display: flex;
      align-items: center;
    }
    
    .stat-icon {
      background-color: #1976d2;
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
    }
    
    .stat-icon i {
      font-size: 1.5rem;
    }
    
    .stat-number {
      font-size: 1.8rem;
      font-weight: bold;
      margin: 0;
      color: #1976d2;
    }
    
    .stat-data h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
      color: #666;
    }
    
    .action-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .action-content i {
      font-size: 2rem;
      color: #1976d2;
      margin-bottom: 1rem;
    }
    
    .action-content h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    
    .action-content p {
      margin-bottom: 1.5rem;
      color: #666;
    }
    
    .action-buttons {
      display: flex;
    }
  `]
})
export class DashboardComponent implements OnInit {
  pendingChangeRequests: ChangeRequestData[] = [];
  pendingVacations: VacationData[] = [];
  
  get isHeadNurse(): boolean {
    return this.authService.isHeadNurse;
  }
  
  constructor(
    private authService: AuthService,
    private changeRequestService: ChangeRequestService,
    private vacationService: VacationService
  ) {}
  
  ngOnInit(): void {
    this.loadPendingChangeRequests();
    this.loadPendingVacations();
  }
  
  loadPendingChangeRequests(): void {
    if (this.isHeadNurse) {
      this.changeRequestService.getChangeRequestsByStatus(RequestStatus.Pending)
        .subscribe({
          next: (requests) => {
            this.pendingChangeRequests = requests;
          },
          error: (error) => {
            console.error('Error loading change requests', error);
          }
        });
    }
  }
  
  loadPendingVacations(): void {
    if (this.isHeadNurse) {
      this.vacationService.getAllVacations()
        .subscribe({
          next: (vacations) => {
            this.pendingVacations = vacations.filter(v => v.approved === null);
          },
          error: (error) => {
            console.error('Error loading vacations', error);
          }
        });
    }
  }
  
  getShiftLabel(shiftType: string): string {
    const labels: { [key: string]: string } = {
      'M': 'Mattina',
      'P': 'Pomeriggio',
      'N': 'Notte',
      'R': 'Riposo',
      'F': 'Ferie'
    };
    return labels[shiftType] || shiftType;
  }
  
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'In attesa',
      'approved': 'Approvata',
      'rejected': 'Respinta'
    };
    return labels[status] || status;
  }
  
  getStatusSeverity(status: string): string {
    const severities: { [key: string]: string } = {
      'pending': 'warning',
      'approved': 'success',
      'rejected': 'danger'
    };
    return severities[status] || 'info';
  }
  
  approveRequest(requestId: number): void {
    this.changeRequestService.updateChangeRequestStatus(requestId, RequestStatus.Approved)
      .subscribe({
        next: () => {
          this.loadPendingChangeRequests();
        },
        error: (error) => {
          console.error('Error approving request', error);
        }
      });
  }
  
  rejectRequest(requestId: number): void {
    this.changeRequestService.updateChangeRequestStatus(requestId, RequestStatus.Rejected)
      .subscribe({
        next: () => {
          this.loadPendingChangeRequests();
        },
        error: (error) => {
          console.error('Error rejecting request', error);
        }
      });
  }
  
  approveVacation(vacationId: number): void {
    this.vacationService.updateVacationStatus(vacationId, true)
      .subscribe({
        next: () => {
          this.loadPendingVacations();
        },
        error: (error) => {
          console.error('Error approving vacation', error);
        }
      });
  }
  
  rejectVacation(vacationId: number): void {
    this.vacationService.updateVacationStatus(vacationId, false)
      .subscribe({
        next: () => {
          this.loadPendingVacations();
        },
        error: (error) => {
          console.error('Error rejecting vacation', error);
        }
      });
  }
}