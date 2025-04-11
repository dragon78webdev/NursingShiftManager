import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';

// Services
import { ScheduleService } from '@services/schedule.service';
import { AuthService } from '@services/auth.service';
import { ChangeRequestService } from '@services/change-request.service';
import { SchedulerService } from '@services/scheduler.service';
import { VacationService } from '@services/vacation.service';

// Models
import { ScheduleData, Shift, ShiftType, Staff, Role, Vacation } from '@models/models';

// Components
import { ScheduleOptimizerComponent } from '@components/schedule-optimizer/schedule-optimizer.component';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CalendarModule,
    DropdownModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    DialogModule,
    InputTextareaModule,
    ToastModule,
    TabViewModule,
    ScheduleOptimizerComponent
  ],
  providers: [MessageService],
  template: `
    <div class="schedule-container">
      <h1>Gestione Turni</h1>
      
      <div class="schedule-filters">
        <div class="grid">
          <div class="col-12 md:col-4">
            <h3>Periodo</h3>
            <div class="p-inputgroup date-range">
              <p-calendar [(ngModel)]="startDate" [showIcon]="true" [monthNavigator]="true" 
                        dateFormat="dd/mm/yy" placeholder="Da"></p-calendar>
              <p-calendar [(ngModel)]="endDate" [showIcon]="true" [monthNavigator]="true" 
                        dateFormat="dd/mm/yy" placeholder="A"></p-calendar>
            </div>
          </div>
          
          <div class="col-12 md:col-4">
            <h3>Tipo Personale</h3>
            <p-dropdown [options]="staffTypeOptions" [(ngModel)]="selectedStaffType" 
                       optionLabel="label" optionValue="value" [style]="{'width':'100%'}"></p-dropdown>
          </div>
          
          <div class="col-12 md:col-4">
            <h3>Azioni</h3>
            <div class="action-buttons">
              <p-button label="Visualizza" icon="pi pi-search" (onClick)="loadSchedule()"></p-button>
              <p-button *ngIf="isHeadNurse" label="Genera" icon="pi pi-cog" 
                       styleClass="p-button-success ml-2" (onClick)="generateSchedule()"></p-button>
              <p-button *ngIf="isHeadNurse" label="Esporta PDF" icon="pi pi-file-pdf" 
                       styleClass="p-button-info ml-2" (onClick)="exportPdf()"></p-button>
            </div>
          </div>
        </div>
      </div>
      
      <p-tabView *ngIf="scheduleData">
        <p-tabPanel header="Visualizzazione Turni">
          <div class="schedule-table">
            <p-table [value]="tableData" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>Personale</th>
                  <th *ngFor="let day of dateRange">
                    {{ formatDate(day) }}
                  </th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-staff>
                <tr>
                  <td class="staff-info">
                    <div>{{ staff.name }}</div>
                    <div class="staff-role">{{ getRoleLabel(staff.role) }}</div>
                  </td>
                  <td *ngFor="let day of dateRange" class="shift-cell">
                    <div class="shift-tag" *ngIf="getShiftForStaffAndDay(staff.id, day) as shift"
                        [pTooltip]="getShiftTooltip(shift)" tooltipPosition="top">
                      <p-tag [value]="getShiftTypeLabel(shift.shiftType)" 
                            [severity]="getShiftTypeSeverity(shift.shiftType)"></p-tag>
                      <button pButton *ngIf="canRequestChange(staff.id, shift)" 
                             icon="pi pi-sync" class="p-button-rounded p-button-text p-button-sm" 
                             (click)="openChangeRequestDialog(shift)"></button>
                    </div>
                    <div *ngIf="!getShiftForStaffAndDay(staff.id, day)" class="empty-shift">-</div>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td [attr.colspan]="dateRange.length + 1" class="text-center">
                    Nessun dato disponibile. Seleziona un intervallo di date e clicca su "Visualizza".
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </p-tabPanel>
        
        <p-tabPanel header="Ottimizzazione Avanzata" *ngIf="isHeadNurse">
          <app-schedule-optimizer
            [shifts]="scheduleData.shifts"
            [staff]="tableData"
            [vacations]="vacations"
            [startDate]="formatDateForApi(startDate)"
            [endDate]="formatDateForApi(endDate)"
            [staffType]="selectedStaffType"
            (optimizationComplete)="handleOptimizedSchedule($event)">
          </app-schedule-optimizer>
        </p-tabPanel>
      </p-tabView>
      
      <div *ngIf="!scheduleData" class="no-data-message">
        <p>Seleziona un intervallo di date e clicca su "Visualizza" per caricare i turni.</p>
      </div>
      
      <!-- Change Request Dialog -->
      <p-dialog header="Richiedi Cambio Turno" [(visible)]="changeRequestDialogVisible" 
               [style]="{width: '450px'}" [modal]="true">
        <div class="p-field" *ngIf="selectedShift">
          <label>Turno Attuale</label>
          <div>
            <p-tag [value]="getShiftTypeLabel(selectedShift.shiftType)" 
                 [severity]="getShiftTypeSeverity(selectedShift.shiftType)"></p-tag>
            <span class="ml-2">{{ formatDate(new Date(selectedShift.date)) }}</span>
          </div>
        </div>
        
        <div class="p-field mt-3">
          <label>Nuovo Turno Richiesto</label>
          <p-dropdown [options]="shiftTypeOptions" [(ngModel)]="requestedShiftType" 
                     optionLabel="label" optionValue="value" [style]="{width: '100%'}"
                     placeholder="Seleziona un turno"></p-dropdown>
        </div>
        
        <div class="p-field mt-3">
          <label>Motivo della Richiesta</label>
          <p-inputTextarea [(ngModel)]="changeRequestReason" [rows]="5" [style]="{width: '100%'}"
                         placeholder="Inserisci il motivo della richiesta di cambio turno..."></p-inputTextarea>
        </div>
        
        <ng-template pTemplate="footer">
          <p-button icon="pi pi-times" label="Annulla" styleClass="p-button-text" 
                  (onClick)="changeRequestDialogVisible = false"></p-button>
          <p-button icon="pi pi-check" label="Invia Richiesta" 
                  (onClick)="submitChangeRequest()"></p-button>
        </ng-template>
      </p-dialog>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .schedule-container {
      padding: 1rem;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      color: #1976d2;
    }
    
    .schedule-filters {
      margin-bottom: 2rem;
      background-color: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
    }
    
    h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1rem;
      color: #495057;
    }
    
    .date-range {
      display: flex;
      gap: 8px;
    }
    
    .action-buttons {
      display: flex;
      margin-top: 1.65rem;
    }
    
    .schedule-table {
      margin-top: 1.5rem;
      overflow-x: auto;
    }
    
    .staff-info {
      min-width: 150px;
    }
    
    .staff-role {
      font-size: 0.85rem;
      color: #6c757d;
    }
    
    .shift-cell {
      text-align: center;
      min-width: 80px;
    }
    
    .shift-tag {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .empty-shift {
      color: #ccc;
      padding: 0.5rem 0;
    }
  `]
})
export class ScheduleComponent implements OnInit {
  startDate: Date = new Date();
  endDate: Date = new Date();
  selectedStaffType: Role = Role.Nurse;
  staffTypeOptions = [
    { label: 'Infermieri', value: Role.Nurse },
    { label: 'OSS', value: Role.OSS }
  ];
  
  scheduleData: ScheduleData | null = null;
  dateRange: Date[] = [];
  tableData: Staff[] = [];
  vacations: Vacation[] = [];
  
  // Change request dialog
  changeRequestDialogVisible = false;
  selectedShift: Shift | null = null;
  requestedShiftType: ShiftType | null = null;
  changeRequestReason = '';
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
    private scheduleService: ScheduleService,
    private authService: AuthService,
    private changeRequestService: ChangeRequestService,
    private schedulerService: SchedulerService,
    private vacationService: VacationService,
    private messageService: MessageService
  ) {
    // Set default date range to current month
    this.startDate = new Date();
    this.startDate.setDate(1);
    this.endDate = new Date(this.startDate);
    this.endDate.setMonth(this.endDate.getMonth() + 1);
    this.endDate.setDate(0); // Last day of current month
  }
  
  ngOnInit(): void {
    this.loadSchedule();
  }
  
  loadSchedule(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }
    
    const startDateStr = this.formatDateForApi(this.startDate);
    const endDateStr = this.formatDateForApi(this.endDate);
    
    // Carica i turni
    this.scheduleService.getSchedule(startDateStr, endDateStr, this.selectedStaffType)
      .subscribe({
        next: (data) => {
          this.scheduleData = data;
          this.generateDateRange();
          this.prepareTableData();
          this.loadVacations(); // Carica le ferie per questo periodo
        },
        error: (error) => {
          console.error('Error loading schedule', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile caricare i turni programmati'
          });
        }
      });
  }
  
  loadVacations(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }
    
    const startDateStr = this.formatDateForApi(this.startDate);
    const endDateStr = this.formatDateForApi(this.endDate);
    
    this.vacationService.getVacationsByDateRange(startDateStr, endDateStr)
      .subscribe({
        next: (data) => {
          this.vacations = data;
        },
        error: (error) => {
          console.error('Error loading vacations', error);
        }
      });
  }

  handleOptimizedSchedule(optimizedShifts: Shift[]): void {
    if (!this.scheduleData) {
      return;
    }
    
    // Aggiorna i turni con quelli ottimizzati
    this.scheduleData.shifts = optimizedShifts;
    
    this.messageService.add({
      severity: 'success',
      summary: 'Turni Ottimizzati',
      detail: 'I turni sono stati ottimizzati con successo e visualizzati nella tabella.'
    });
  }
  
  generateSchedule(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }
    
    const startDateStr = this.formatDateForApi(this.startDate);
    const endDateStr = this.formatDateForApi(this.endDate);
    
    this.scheduleService.generateSchedule(startDateStr, endDateStr, this.selectedStaffType)
      .subscribe({
        next: (data) => {
          this.scheduleData = data;
          this.generateDateRange();
          this.prepareTableData();
          this.loadVacations();
          
          this.messageService.add({
            severity: 'success',
            summary: 'Turni Generati',
            detail: 'I turni sono stati generati con successo. Puoi ottimizzarli ulteriormente nella scheda "Ottimizzazione Avanzata".'
          });
        },
        error: (error) => {
          console.error('Error generating schedule', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Si è verificato un errore durante la generazione dei turni.'
          });
        }
      });
  }
  
  exportPdf(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }
    
    const startDateStr = this.formatDateForApi(this.startDate);
    const endDateStr = this.formatDateForApi(this.endDate);
    
    this.scheduleService.generatePdf(startDateStr, endDateStr, this.selectedStaffType)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `schedule_${this.selectedStaffType}_${startDateStr}_${endDateStr}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error exporting PDF', error);
        }
      });
  }
  
  generateDateRange(): void {
    if (!this.scheduleData) {
      return;
    }
    
    const start = new Date(this.scheduleData.startDate);
    const end = new Date(this.scheduleData.endDate);
    this.dateRange = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      this.dateRange.push(new Date(d));
    }
  }
  
  prepareTableData(): void {
    if (!this.scheduleData) {
      return;
    }
    
    this.tableData = Object.values(this.scheduleData.staffDetails);
  }
  
  getShiftForStaffAndDay(staffId: number, day: Date): Shift | null {
    if (!this.scheduleData) {
      return null;
    }
    
    const dayStr = this.formatDateForApi(day);
    return this.scheduleData.shifts.find(
      shift => shift.staffId === staffId && shift.date === dayStr
    ) || null;
  }
  
  formatDate(date: Date): string {
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: '2-digit'
    });
  }
  
  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  getRoleLabel(role: Role): string {
    const labels: { [key: string]: string } = {
      [Role.Nurse]: 'Infermiere',
      [Role.OSS]: 'OSS',
      [Role.HeadNurse]: 'Capo Sala'
    };
    return labels[role] || role;
  }
  
  getShiftTypeLabel(shiftType: ShiftType): string {
    const labels: { [key: string]: string } = {
      [ShiftType.Morning]: 'M',
      [ShiftType.Afternoon]: 'P',
      [ShiftType.Night]: 'N',
      [ShiftType.Rest]: 'R',
      [ShiftType.Vacation]: 'F'
    };
    return labels[shiftType] || shiftType;
  }
  
  getShiftTypeSeverity(shiftType: ShiftType): string {
    const severities: { [key: string]: string } = {
      [ShiftType.Morning]: 'success',
      [ShiftType.Afternoon]: 'info',
      [ShiftType.Night]: 'warning',
      [ShiftType.Rest]: 'secondary',
      [ShiftType.Vacation]: 'help'
    };
    return severities[shiftType] || 'info';
  }
  
  getShiftTooltip(shift: Shift): string {
    const labels: { [key: string]: string } = {
      [ShiftType.Morning]: 'Mattina (6:00 - 14:00)',
      [ShiftType.Afternoon]: 'Pomeriggio (14:00 - 22:00)',
      [ShiftType.Night]: 'Notte (22:00 - 6:00)',
      [ShiftType.Rest]: 'Riposo',
      [ShiftType.Vacation]: 'Ferie'
    };
    return labels[shift.shiftType] || shift.shiftType;
  }
  
  canRequestChange(staffId: number, shift: Shift): boolean {
    // Only allow change requests for own shifts and not for rest or vacation
    return !this.isHeadNurse && 
           this.currentUserId !== null && 
           staffId === this.currentUserId &&
           shift.shiftType !== ShiftType.Rest && 
           shift.shiftType !== ShiftType.Vacation;
  }
  
  openChangeRequestDialog(shift: Shift): void {
    this.selectedShift = shift;
    this.requestedShiftType = null;
    this.changeRequestReason = '';
    this.changeRequestDialogVisible = true;
  }
  
  submitChangeRequest(): void {
    if (!this.selectedShift || !this.requestedShiftType || !this.changeRequestReason) {
      return;
    }
    
    const request = {
      staffId: this.selectedShift.staffId,
      shiftId: this.selectedShift.id,
      requestedShiftType: this.requestedShiftType,
      reason: this.changeRequestReason
    };
    
    this.changeRequestService.createChangeRequest(request)
      .subscribe({
        next: () => {
          this.changeRequestDialogVisible = false;
          // Optionally show success message
        },
        error: (error) => {
          console.error('Error submitting change request', error);
          // Optionally show error message
        }
      });
  }
}