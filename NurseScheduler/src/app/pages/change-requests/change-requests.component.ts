import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

// Services
import { ChangeRequestService } from '@services/change-request.service';
import { AuthService } from '@services/auth.service';
import { ScheduleService } from '@services/schedule.service';

// Models
import { ChangeRequestData, ShiftType, RequestStatus, Role } from '@models/models';

@Component({
  selector: 'app-change-requests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextareaModule,
    DropdownModule,
    TagModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="change-requests-container">
      <h1>Richieste Cambio Turno</h1>
      
      <div class="request-actions" *ngIf="!isHeadNurse">
        <p-button label="Nuova Richiesta" icon="pi pi-plus" (onClick)="openNewRequestDialog()"></p-button>
      </div>
      
      <div class="filter-section">
        <div class="grid">
          <div class="col-12 md:col-4">
            <p-dropdown [options]="statusFilterOptions" [(ngModel)]="selectedStatusFilter" 
                       (onChange)="applyFilters()" placeholder="Filtra per stato" 
                       [showClear]="true"></p-dropdown>
          </div>
          <div class="col-12 md:col-4" *ngIf="isHeadNurse">
            <p-dropdown [options]="roleFilterOptions" [(ngModel)]="selectedRoleFilter" 
                       (onChange)="applyFilters()" placeholder="Filtra per ruolo" 
                       [showClear]="true"></p-dropdown>
          </div>
        </div>
      </div>
      
      <div class="requests-table">
        <p-table [value]="filteredRequests" [paginator]="true" [rows]="10" 
                [rowsPerPageOptions]="[10, 25, 50]" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th *ngIf="isHeadNurse">Richiedente</th>
              <th>Data Turno</th>
              <th>Turno Attuale</th>
              <th>Turno Richiesto</th>
              <th>Motivo</th>
              <th>Stato</th>
              <th>Data Richiesta</th>
              <th>Azioni</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-request>
            <tr>
              <td *ngIf="isHeadNurse">{{ request.staffName }}</td>
              <td>{{ formatDate(request.shiftDate) }}</td>
              <td>{{ getShiftTypeLabel(request.shiftType) }}</td>
              <td>{{ getShiftTypeLabel(request.requestedShiftType) }}</td>
              <td>{{ request.reason }}</td>
              <td>
                <p-tag [value]="getStatusLabel(request.status)" 
                      [severity]="getStatusSeverity(request.status)"></p-tag>
              </td>
              <td>{{ formatDate(request.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <p-button *ngIf="isHeadNurse && request.status === 'pending'" 
                           icon="pi pi-check" styleClass="p-button-success p-button-sm" 
                           (onClick)="approveRequest(request)"></p-button>
                  <p-button *ngIf="isHeadNurse && request.status === 'pending'" 
                           icon="pi pi-times" styleClass="p-button-danger p-button-sm ml-2" 
                           (onClick)="rejectRequest(request)"></p-button>
                  <p-button *ngIf="!isHeadNurse && request.status === 'pending'" 
                           icon="pi pi-times" styleClass="p-button-danger p-button-sm" 
                           (onClick)="cancelRequest(request)"></p-button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isHeadNurse ? 8 : 7" class="text-center">
                Nessuna richiesta di cambio turno trovata.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      
      <!-- New Request Dialog -->
      <p-dialog [(visible)]="newRequestDialogVisible" [style]="{width: '500px'}" 
               header="Nuova Richiesta di Cambio Turno" [modal]="true">
        <div class="p-fluid">
          <div class="p-field mt-3">
            <label for="shiftDate">Data del Turno</label>
            <p-calendar id="shiftDate" [(ngModel)]="newRequest.shiftDate" [showIcon]="true" 
                      dateFormat="dd/mm/yy" [readonlyInput]="true"></p-calendar>
          </div>
          
          <div class="p-field mt-3">
            <label for="currentShift">Turno Attuale</label>
            <p-dropdown id="currentShift" [options]="shiftTypeOptions" [(ngModel)]="newRequest.currentShiftType" 
                      optionLabel="label" optionValue="value" placeholder="Seleziona il turno attuale"></p-dropdown>
          </div>
          
          <div class="p-field mt-3">
            <label for="requestedShift">Turno Richiesto</label>
            <p-dropdown id="requestedShift" [options]="shiftTypeOptions" [(ngModel)]="newRequest.requestedShiftType" 
                      optionLabel="label" optionValue="value" placeholder="Seleziona il turno richiesto"></p-dropdown>
          </div>
          
          <div class="p-field mt-3">
            <label for="reason">Motivo della Richiesta</label>
            <p-inputTextarea id="reason" [(ngModel)]="newRequest.reason" rows="5" 
                          placeholder="Inserisci il motivo della richiesta di cambio turno..."></p-inputTextarea>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <p-button icon="pi pi-times" label="Annulla" styleClass="p-button-text" 
                  (onClick)="newRequestDialogVisible = false"></p-button>
          <p-button icon="pi pi-check" label="Invia Richiesta" 
                  [disabled]="!isNewRequestValid()" (onClick)="submitNewRequest()"></p-button>
        </ng-template>
      </p-dialog>
      
      <p-toast></p-toast>
      <p-confirmDialog header="Conferma" icon="pi pi-exclamation-triangle"></p-confirmDialog>
    </div>
  `,
  styles: [`
    .change-requests-container {
      padding: 1rem;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      color: #1976d2;
    }
    
    .request-actions {
      margin-bottom: 1.5rem;
    }
    
    .filter-section {
      margin-bottom: 1.5rem;
      background-color: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
    }
    
    .requests-table {
      margin-top: 1rem;
    }
    
    .action-buttons {
      display: flex;
    }
  `]
})
export class ChangeRequestsComponent implements OnInit {
  changeRequests: ChangeRequestData[] = [];
  filteredRequests: ChangeRequestData[] = [];
  
  // Filters
  selectedStatusFilter: string | null = null;
  selectedRoleFilter: string | null = null;
  
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
  
  // New request dialog
  newRequestDialogVisible = false;
  newRequest = {
    shiftDate: null as Date | null,
    currentShiftType: null as ShiftType | null,
    requestedShiftType: null as ShiftType | null,
    reason: ''
  };
  
  shiftTypeOptions = [
    { label: 'Mattina', value: ShiftType.Morning },
    { label: 'Pomeriggio', value: ShiftType.Afternoon },
    { label: 'Notte', value: ShiftType.Night },
    { label: 'Riposo', value: ShiftType.Rest }
  ];
  
  get isHeadNurse(): boolean {
    return this.authService.isHeadNurse;
  }
  
  get currentUserId(): number | null {
    return this.authService.currentUserValue?.id || null;
  }
  
  constructor(
    private changeRequestService: ChangeRequestService,
    private authService: AuthService,
    private scheduleService: ScheduleService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}
  
  ngOnInit(): void {
    this.loadChangeRequests();
  }
  
  loadChangeRequests(): void {
    if (this.isHeadNurse) {
      this.changeRequestService.getAllChangeRequests()
        .subscribe({
          next: (requests) => {
            this.changeRequests = requests;
            this.applyFilters();
          },
          error: (error) => {
            console.error('Error loading change requests', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Errore',
              detail: 'Impossibile caricare le richieste di cambio turno'
            });
          }
        });
    } else if (this.currentUserId) {
      this.changeRequestService.getChangeRequestsByStaffId(this.currentUserId)
        .subscribe({
          next: (requests) => {
            this.changeRequests = requests;
            this.applyFilters();
          },
          error: (error) => {
            console.error('Error loading change requests', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Errore',
              detail: 'Impossibile caricare le tue richieste di cambio turno'
            });
          }
        });
    }
  }
  
  applyFilters(): void {
    this.filteredRequests = [...this.changeRequests];
    
    if (this.selectedStatusFilter) {
      this.filteredRequests = this.filteredRequests.filter(
        request => request.status === this.selectedStatusFilter
      );
    }
    
    if (this.isHeadNurse && this.selectedRoleFilter) {
      this.filteredRequests = this.filteredRequests.filter(
        request => request.role === this.selectedRoleFilter
      );
    }
  }
  
  formatDate(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('it-IT');
  }
  
  getShiftTypeLabel(shiftType: ShiftType): string {
    const labels: { [key: string]: string } = {
      [ShiftType.Morning]: 'Mattina',
      [ShiftType.Afternoon]: 'Pomeriggio',
      [ShiftType.Night]: 'Notte',
      [ShiftType.Rest]: 'Riposo',
      [ShiftType.Vacation]: 'Ferie'
    };
    return labels[shiftType] || shiftType;
  }
  
  getStatusLabel(status: RequestStatus): string {
    const labels: { [key: string]: string } = {
      [RequestStatus.Pending]: 'In attesa',
      [RequestStatus.Approved]: 'Approvata',
      [RequestStatus.Rejected]: 'Respinta'
    };
    return labels[status] || status;
  }
  
  getStatusSeverity(status: RequestStatus): string {
    const severities: { [key: string]: string } = {
      [RequestStatus.Pending]: 'warning',
      [RequestStatus.Approved]: 'success',
      [RequestStatus.Rejected]: 'danger'
    };
    return severities[status] || 'info';
  }
  
  approveRequest(request: ChangeRequestData): void {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler approvare questa richiesta di cambio turno?`,
      accept: () => {
        this.changeRequestService.updateChangeRequestStatus(request.id, RequestStatus.Approved)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Richiesta approvata con successo'
              });
              this.loadChangeRequests();
            },
            error: (error) => {
              console.error('Error approving request', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile approvare la richiesta'
              });
            }
          });
      }
    });
  }
  
  rejectRequest(request: ChangeRequestData): void {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler respingere questa richiesta di cambio turno?`,
      accept: () => {
        this.changeRequestService.updateChangeRequestStatus(request.id, RequestStatus.Rejected)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Richiesta respinta con successo'
              });
              this.loadChangeRequests();
            },
            error: (error) => {
              console.error('Error rejecting request', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile respingere la richiesta'
              });
            }
          });
      }
    });
  }
  
  cancelRequest(request: ChangeRequestData): void {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler annullare questa richiesta di cambio turno?`,
      accept: () => {
        this.changeRequestService.updateChangeRequestStatus(request.id, RequestStatus.Rejected)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Richiesta annullata con successo'
              });
              this.loadChangeRequests();
            },
            error: (error) => {
              console.error('Error canceling request', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile annullare la richiesta'
              });
            }
          });
      }
    });
  }
  
  openNewRequestDialog(): void {
    this.newRequest = {
      shiftDate: new Date(),
      currentShiftType: null,
      requestedShiftType: null,
      reason: ''
    };
    this.newRequestDialogVisible = true;
  }
  
  isNewRequestValid(): boolean {
    return !!(
      this.newRequest.shiftDate &&
      this.newRequest.currentShiftType &&
      this.newRequest.requestedShiftType &&
      this.newRequest.reason &&
      this.newRequest.currentShiftType !== this.newRequest.requestedShiftType
    );
  }
  
  submitNewRequest(): void {
    if (!this.isNewRequestValid() || !this.currentUserId) {
      return;
    }
    
    // Here we would normally find the actual shift ID based on date and current shift type
    // For now, we'll use a placeholder and the backend can handle the lookup
    const shiftId = -1; // Placeholder value
    
    const request = {
      staffId: this.currentUserId,
      shiftId: shiftId,
      requestedShiftType: this.newRequest.requestedShiftType as ShiftType,
      reason: this.newRequest.reason
    };
    
    this.changeRequestService.createChangeRequest(request)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successo',
            detail: 'Richiesta di cambio turno inviata con successo'
          });
          this.newRequestDialogVisible = false;
          this.loadChangeRequests();
        },
        error: (error) => {
          console.error('Error submitting change request', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile inviare la richiesta di cambio turno'
          });
        }
      });
  }
}