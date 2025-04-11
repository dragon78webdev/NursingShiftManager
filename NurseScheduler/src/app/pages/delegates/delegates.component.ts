import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';

// Services and Models
import { AuthService } from '@services/auth.service';
import { StaffService } from '@services/staff.service';
import { DelegationService } from '@services/delegation.service';
import { Delegation, StaffListItem, Role } from '@models/models';

@Component({
  selector: 'app-delegates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    CalendarModule,
    DropdownModule,
    InputSwitchModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule
  ],
  providers: [MessageService, ConfirmationService, DelegationService],
  template: `
    <div class="delegates-container">
      <h1>Gestione Deleghe</h1>
      
      <div class="access-denied" *ngIf="!isHeadNurse">
        <p>Questa pagina è accessibile solo ai Capi Sala.</p>
      </div>
      
      <ng-container *ngIf="isHeadNurse">
        <div class="delegate-actions">
          <p-button label="Nuova Delega" icon="pi pi-plus" (onClick)="openNewDelegationDialog()"></p-button>
        </div>
        
        <div class="delegates-table">
          <p-table [value]="delegations" [paginator]="true" [rows]="10" 
                  styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Delegato</th>
                <th>Email</th>
                <th>Data Inizio</th>
                <th>Data Fine</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-delegation>
              <tr>
                <td>{{ delegation.delegatedToName }}</td>
                <td>{{ delegation.delegatedToEmail }}</td>
                <td>{{ formatDate(delegation.startDate) }}</td>
                <td>{{ delegation.endDate ? formatDate(delegation.endDate) : 'Nessuna' }}</td>
                <td>
                  <p-tag [value]="delegation.active ? 'Attiva' : 'Inattiva'" 
                        [severity]="delegation.active ? 'success' : 'danger'"></p-tag>
                </td>
                <td>
                  <div class="action-buttons">
                    <p-button *ngIf="delegation.active" icon="pi pi-times" 
                             styleClass="p-button-danger p-button-sm" 
                             (onClick)="deactivateDelegation(delegation)"></p-button>
                    <p-button *ngIf="!delegation.active" icon="pi pi-check" 
                             styleClass="p-button-success p-button-sm" 
                             (onClick)="activateDelegation(delegation)"></p-button>
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="6" class="text-center">
                  Nessuna delega trovata. Clicca su "Nuova Delega" per aggiungerne una.
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
        
        <!-- New Delegation Dialog -->
        <p-dialog [(visible)]="delegationDialogVisible" [style]="{width: '500px'}" 
                 header="Nuova Delega" [modal]="true">
          <div class="p-fluid">
            <div class="p-field mt-3">
              <label for="delegate">Delegare a</label>
              <p-dropdown id="delegate" [options]="nursesOptions" [(ngModel)]="newDelegation.delegatedToId" 
                        optionLabel="name" optionValue="id" [style]="{width: '100%'}" 
                        placeholder="Seleziona un infermiere"></p-dropdown>
            </div>
            
            <div class="p-field mt-3">
              <label for="startDate">Data Inizio</label>
              <p-calendar id="startDate" [(ngModel)]="newDelegation.startDate" [showIcon]="true" 
                        [minDate]="today" dateFormat="dd/mm/yy" [showClear]="false"></p-calendar>
            </div>
            
            <div class="p-field mt-3">
              <label>Durata</label>
              <div class="delegation-duration">
                <div class="delegation-duration-toggle">
                  <p-inputSwitch [(ngModel)]="isEndDateSet" [trueValue]="true" [falseValue]="false" 
                               (onChange)="onDurationTypeChange()"></p-inputSwitch>
                  <span>{{ isEndDateSet ? 'Fino a data specifica' : 'A tempo indeterminato' }}</span>
                </div>
                <div *ngIf="isEndDateSet" class="delegation-end-date mt-2">
                  <p-calendar [(ngModel)]="newDelegation.endDate" [showIcon]="true" 
                            [minDate]="minEndDate" dateFormat="dd/mm/yy"></p-calendar>
                </div>
              </div>
            </div>
          </div>
          
          <ng-template pTemplate="footer">
            <p-button icon="pi pi-times" label="Annulla" styleClass="p-button-text" 
                    (onClick)="delegationDialogVisible = false"></p-button>
            <p-button icon="pi pi-check" label="Salva" 
                    [disabled]="!isNewDelegationValid()" (onClick)="saveNewDelegation()"></p-button>
          </ng-template>
        </p-dialog>
        
        <p-toast></p-toast>
        <p-confirmDialog header="Conferma" icon="pi pi-exclamation-triangle"></p-confirmDialog>
      </ng-container>
    </div>
  `,
  styles: [`
    .delegates-container {
      padding: 1rem;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      color: #1976d2;
    }
    
    .access-denied {
      background-color: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 4px;
      border-left: 4px solid #721c24;
      margin-top: 1rem;
    }
    
    .access-denied p {
      margin: 0;
    }
    
    .delegate-actions {
      margin-bottom: 1.5rem;
    }
    
    .delegates-table {
      margin-top: 1rem;
    }
    
    .action-buttons {
      display: flex;
    }
    
    .delegation-duration {
      display: flex;
      flex-direction: column;
    }
    
    .delegation-duration-toggle {
      display: flex;
      align-items: center;
    }
    
    .delegation-duration-toggle span {
      margin-left: 0.5rem;
    }
  `]
})
export class DelegatesComponent implements OnInit {
  delegations: Delegation[] = [];
  delegationDialogVisible = false;
  
  // New delegation
  newDelegation: Partial<Delegation> = {};
  isEndDateSet = false;
  today = new Date();
  
  // Staff options
  nursesOptions: StaffListItem[] = [];
  
  get isHeadNurse(): boolean {
    return this.authService.isHeadNurse;
  }
  
  get currentUserId(): number | null {
    return this.authService.currentUserValue?.id || null;
  }
  
  get minEndDate(): Date {
    if (!this.newDelegation.startDate) {
      return this.today;
    }
    
    const date = new Date(this.newDelegation.startDate);
    date.setDate(date.getDate() + 1);
    return date;
  }
  
  constructor(
    private authService: AuthService,
    private staffService: StaffService,
    private delegationService: DelegationService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}
  
  ngOnInit(): void {
    if (this.isHeadNurse && this.currentUserId) {
      this.loadDelegations();
      this.loadNurses();
    }
  }
  
  loadDelegations(): void {
    if (!this.currentUserId) return;
    
    this.delegationService.getDelegationsByHeadNurse(this.currentUserId)
      .subscribe({
        next: (delegations) => {
          this.delegations = delegations;
        },
        error: (error) => {
          console.error('Error loading delegations', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile caricare le deleghe'
          });
        }
      });
  }
  
  loadNurses(): void {
    this.staffService.getStaffByRole(Role.Nurse)
      .subscribe({
        next: (nurses) => {
          this.nursesOptions = nurses;
        },
        error: (error) => {
          console.error('Error loading nurses', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile caricare l\'elenco degli infermieri'
          });
        }
      });
  }
  
  formatDate(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('it-IT');
  }
  
  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  openNewDelegationDialog(): void {
    this.newDelegation = {
      headNurseId: this.currentUserId || undefined,
      startDate: this.today,
      active: true
    };
    this.isEndDateSet = false;
    this.delegationDialogVisible = true;
  }
  
  onDurationTypeChange(): void {
    if (!this.isEndDateSet) {
      this.newDelegation.endDate = undefined;
    } else if (this.newDelegation.startDate) {
      // Set default end date to 7 days after start date
      const endDate = new Date(this.newDelegation.startDate);
      endDate.setDate(endDate.getDate() + 7);
      this.newDelegation.endDate = endDate;
    }
  }
  
  isNewDelegationValid(): boolean {
    return !!(
      this.newDelegation.delegatedToId &&
      this.newDelegation.startDate &&
      (!this.isEndDateSet || this.newDelegation.endDate)
    );
  }
  
  saveNewDelegation(): void {
    if (!this.isNewDelegationValid() || !this.currentUserId) {
      return;
    }
    
    const delegation = {
      headNurseId: this.currentUserId,
      delegatedToId: this.newDelegation.delegatedToId as number,
      startDate: this.formatDateForApi(this.newDelegation.startDate as Date),
      endDate: this.isEndDateSet && this.newDelegation.endDate ? 
              this.formatDateForApi(this.newDelegation.endDate as Date) : null,
      active: true
    };
    
    this.delegationService.createDelegation(delegation)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successo',
            detail: 'Delega creata con successo'
          });
          this.delegationDialogVisible = false;
          this.loadDelegations();
        },
        error: (error) => {
          console.error('Error creating delegation', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile creare la delega'
          });
        }
      });
  }
  
  deactivateDelegation(delegation: Delegation): void {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler disattivare la delega a ${delegation.delegatedToName}?`,
      accept: () => {
        const today = new Date();
        
        this.delegationService.updateDelegation(delegation.id, false, today)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Delega disattivata con successo'
              });
              this.loadDelegations();
            },
            error: (error) => {
              console.error('Error deactivating delegation', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile disattivare la delega'
              });
            }
          });
      }
    });
  }
  
  activateDelegation(delegation: Delegation): void {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler riattivare la delega a ${delegation.delegatedToName}?`,
      accept: () => {
        this.delegationService.updateDelegation(delegation.id, true)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Successo',
                detail: 'Delega riattivata con successo'
              });
              this.loadDelegations();
            },
            error: (error) => {
              console.error('Error activating delegation', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Errore',
                detail: 'Impossibile riattivare la delega'
              });
            }
          });
      }
    });
  }
}