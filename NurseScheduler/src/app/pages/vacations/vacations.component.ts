import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

// Services
import { VacationService } from '@services/vacation.service';
import { AuthService } from '@services/auth.service';
import { StaffService } from '@services/staff.service';

// Models
import { VacationData, Role } from '@models/models';

@Component({
  selector: 'app-vacations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    CalendarModule,
    InputTextareaModule,
    DropdownModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="vacations-container">
      <h1>Gestione Ferie e Permessi</h1>
      
      <div class="vacation-actions" *ngIf="!isHeadNurse">
        <p-button label="Richiedi Ferie" icon="pi pi-plus" (onClick)="openNewVacationDialog()"></p-button>
      </div>
      
      <div class="filter-section" *ngIf="isHeadNurse">
        <div class="grid">
          <div class="col-12 md:col-4">
            <p-dropdown [options]="statusFilterOptions" [(ngModel)]="selectedStatusFilter" 
                       (onChange)="applyFilters()" placeholder="Filtra per stato" 
                       [showClear]="true"></p-dropdown>
          </div>
          <div class="col-12 md:col-4">
            <p-dropdown [options]="roleFilterOptions" [(ngModel)]="selectedRoleFilter" 
                       (onChange)="applyFilters()" placeholder="Filtra per ruolo" 
                       [showClear]="true"></p-dropdown>
          </div>
          <div class="col-12 md:col-4">
            <div class="p-inputgroup">
              <p-calendar [(ngModel)]="dateFilter" [showIcon]="true" dateFormat="dd/mm/yy" 
                        placeholder="Filtra per data" [showClear]="true" 
                        (onSelect)="applyFilters()" (onClear)="applyFilters()"></p-calendar>
            </div>
          </div>
        </div>
      </div>
      
      <div class="vacations-table">
        <p-table [value]="filteredVacations" [paginator]="true" [rows]="10" 
                [rowsPerPageOptions]="[10, 25, 50]" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th *ngIf="isHeadNurse">Richiedente</th>
              <th>Data Inizio</th>
              <th>Data Fine</th>
              <th>Durata (giorni)</th>
              <th>Stato</th>
              <th>Data Richiesta</th>
              <th>Azioni</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-vacation>
            <tr>
              <td *ngIf="isHeadNurse">{{ vacation.staffName }}</td>
              <td>{{ formatDate(vacation.startDate) }}</td>
              <td>{{ formatDate(vacation.endDate) }}</td>
              <td>{{ calculateDuration(vacation.startDate, vacation.endDate) }}</td>
              <td>
                <p-tag [value]="getStatusLabel(vacation.approved)" 
                      [severity]="getStatusSeverity(vacation.approved)"></p-tag>
              </td>
              <td>{{ formatDate(vacation.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <p-button *ngIf="isHeadNurse && vacation.approved === null" 
                           icon="pi pi-check" styleClass="p-button-success p-button-sm" 
                           (onClick)="approveVacation(vacation)"></p-button>
                  <p-button *ngIf="isHeadNurse && vacation.approved === null" 
                           icon="pi pi-times" styleClass="p-button-danger p-button-sm ml-2" 
                           (onClick)="rejectVacation(vacation)"></p-button>
                  <p-button *ngIf="!isHeadNurse && vacation.approved === null" 
                           icon="pi pi-times" styleClass="p-button-danger p-button-sm" 
                           (onClick)="cancelVacation(vacation)"></p-button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isHeadNurse ? 7 : 6" class="text-center">
                Nessuna richiesta di ferie trovata.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      
      <!-- New Vacation Dialog -->
      <p-dialog [(visible)]="newVacationDialogVisible" [style]="{width: '500px'}" 
               header="Nuova Richiesta di Ferie" [modal]="true">
        <div class="p-fluid">
          <div class="p-field mt-3">
            <label for="dateRange">Periodo di Ferie</label>
            <p-calendar [(ngModel)]="vacationDateRange" selectionMode="range" 
                      [readonlyInput]="true" dateFormat="dd/mm/yy" [showIcon]="true" 
                      placeholder="Seleziona il periodo di ferie"></p-calendar>
          </div>
          
          <div class="vacation-summary mt-3" *ngIf="isDateRangeValid()">
            <p>Hai selezionato un periodo di <strong>{{ calculateSelectedDuration() }}</strong> giorni di ferie.</p>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <p-button icon="pi pi-times" label="Annulla" styleClass="p-button-text" 
                  (onClick)="newVacationDialogVisible = false"></p-button>
          <p-button icon="pi pi-check" label="Invia Richiesta" 
                  [disabled]="!isDateRangeValid()" (onClick)="submitNewVacation()"></p-button>
        </ng-template>
      </p-dialog>
      
      <p-toast></p-toast>
      <p-confirmDialog header="Conferma" icon="pi pi-exclamation-triangle"></p-confirmDialog>
    </div>
  `,
  styles: [`
    .vacations-container {
      padding: 1rem;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      color: #1976d2;
    }
    
    .vacation-actions {
      margin-bottom: 1.5rem;
    }
    
    .filter-section {
      margin-bottom: 1.5rem;
      background-color: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
    }
    
    .vacations-table {
      margin-top: 1rem;
    }
    
    .action-buttons {
      display: flex;
    }
    
    .vacation-summary {
      background-color: #e3f2fd;
      padding: 0.75rem;
      border-radius: 4px;
      border-left: 4px solid #1976d2;
    }
    
    .vacation-summary p {
      margin: 0;
      color: #333;
    }
  `]
})
export class VacationsComponent implements OnInit {
  vacations: VacationData[] = [];
  filteredVacations: VacationData[] = [];
  
  // Filters
  selectedStatusFilter: string | null = null;
  selectedRoleFilter: string | null = null;
  dateFilter: Date | null = null;
  
  // Filter options
  statusFilterOptions = [
    { label: 'In attesa', value: 'pending' },
    { label: 'Approvate', value: 'approved' },
    { label: 'Respinte', value: 'rejected' }
  ];
  
  roleFilterOptions = [
    { label: 'Infermieri', value: Role.Nurse },
    { label: 'OSS', value: Role.OSS }
  ];
  
  // New vacation dialog
  newVacationDialogVisible = false;
  vacationDateRange: Date[] = [];
  
  get isHeadNurse(): boolean {
    return this.authService.isHeadNurse;
  }
  
  get currentUserId(): number | null {
    return this.authService.currentUserValue?.id || null;
  }
  
  constructor(
    private vacationService: VacationService,
    private authService: AuthService,
    private staffService: StaffService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}
  
  ngOnInit(): void {
    this.loadVacations();
  }
  
  loadVacations(): void {
    if (this.isHeadNurse) {
      this.vacationService.getAllVacations()
        .subscribe({
          next: (vacations) => {
            this.vacations = vacations;
            this.applyFilters();
          },
          error: (error) => {
            console.error('Error loading vacations', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Errore',
              detail: 'Impossibile caricare le richieste di ferie'
            });
          }
        });
    } else if (this.currentUserId) {
      this.vacationService.getVacationsByStaffId(this.currentUserId)
        .subscribe({
          next: (vacations) => {
            this.vacations = vacations;
            this.applyFilters();
          },
          error: (error) => {
            console.error('Error loading vacations', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Errore',
              detail: 'Impossibile caricare le tue richieste di ferie'
            });
          }
        });
    }
  }
  
  applyFilters(): void {
    this.filteredVacations = [...this.vacations];
    
    if (this.selectedStatusFilter) {
      if (this.selectedStatusFilter === 'pending') {
        this.filteredVacations = this.filteredVacations.filter(v => v.approved === null);
      } else if (this.selectedStatusFilter === 'approved') {
        this.filteredVacations = this.filteredVacations.filter(v => v.approved === true);
      } else if (this.selectedStatusFilter === 'rejected') {
        this.filteredVacations = this.filteredVacations.filter(v => v.approved === false);
      }
    }
    
    if (this.isHeadNurse && this.selectedRoleFilter) {
      this.filteredVacations = this.filteredVacations.filter(v => v.role === this.selectedRoleFilter);
    }
    
    if (this.dateFilter) {
      const filterDate = this.formatDateForApi(this.dateFilter);
      this.filteredVacations = this.filteredVacations.filter(v => {
        const startDate = new Date(v.startDate);
        const endDate = new Date(v.endDate);
        const checkDate = new Date(filterDate);
        return checkDate >= startDate && checkDate <= endDate;
      });
    }
  }
  
  formatDate(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('it-IT');
  }
  
  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  calculateDuration(startDateStr: string, endDateStr: string): number {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const differenceInTime = endDate.getTime() - startDate.getTime();
    return Math.round(differenceInTime / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
  }
  
  getStatusLabel(approved: boolean | null): string {
    if (approved === null) return 'In attesa';
    return approved ? 'Approvata' : 'Respinta';
  }
  
  getStatusSeverity(approved: boolean | null): string {
    if (approved === null) return 'warning';
    return approved ? 'success' : 'danger';
  }
  
  approveVacation(vacation: VacationData): void {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler approvare questa richiesta di ferie per ${vacation.staffName}?`,
      accept: () => {
        this.vacationService.updateVacationStatus(vacation.id, true)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Richiesta di ferie approvata con successo'
              });
              this.loadVacations();
            },
            error: (error) => {
              console.error('Error approving vacation', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile approvare la richiesta di ferie'
              });
            }
          });
      }
    });
  }
  
  rejectVacation(vacation: VacationData): void {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler respingere questa richiesta di ferie per ${vacation.staffName}?`,
      accept: () => {
        this.vacationService.updateVacationStatus(vacation.id, false)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Richiesta di ferie respinta con successo'
              });
              this.loadVacations();
            },
            error: (error) => {
              console.error('Error rejecting vacation', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile respingere la richiesta di ferie'
              });
            }
          });
      }
    });
  }
  
  cancelVacation(vacation: VacationData): void {
    // For user-initiated cancellation, we will mark as rejected
    this.confirmationService.confirm({
      message: 'Sei sicuro di voler annullare questa richiesta di ferie?',
      accept: () => {
        this.vacationService.updateVacationStatus(vacation.id, false)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Richiesta di ferie annullata con successo'
              });
              this.loadVacations();
            },
            error: (error) => {
              console.error('Error canceling vacation', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile annullare la richiesta di ferie'
              });
            }
          });
      }
    });
  }
  
  openNewVacationDialog(): void {
    this.vacationDateRange = [];
    this.newVacationDialogVisible = true;
  }
  
  isDateRangeValid(): boolean {
    return this.vacationDateRange && this.vacationDateRange.length === 2;
  }
  
  calculateSelectedDuration(): number {
    if (!this.isDateRangeValid()) {
      return 0;
    }
    
    const startDate = this.vacationDateRange[0];
    const endDate = this.vacationDateRange[1];
    const differenceInTime = endDate.getTime() - startDate.getTime();
    return Math.round(differenceInTime / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
  }
  
  submitNewVacation(): void {
    if (!this.isDateRangeValid() || !this.currentUserId) {
      return;
    }
    
    const startDate = this.formatDateForApi(this.vacationDateRange[0]);
    const endDate = this.formatDateForApi(this.vacationDateRange[1]);
    
    const newVacation = {
      staffId: this.currentUserId,
      startDate,
      endDate
    };
    
    this.vacationService.createVacation(newVacation)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successo',
            detail: 'Richiesta di ferie inviata con successo'
          });
          this.newVacationDialogVisible = false;
          this.loadVacations();
        },
        error: (error) => {
          console.error('Error submitting vacation request', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile inviare la richiesta di ferie'
          });
        }
      });
  }
}