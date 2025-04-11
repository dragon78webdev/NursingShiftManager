import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';

// Services
import { StaffService } from '@services/staff.service';
import { AuthService } from '@services/auth.service';

// Models
import { StaffListItem, Role, Staff } from '@models/models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    CheckboxModule,
    InputNumberModule,
    FileUploadModule,
    ToastModule,
    TagModule
  ],
  providers: [MessageService],
  template: `
    <div class="staff-container">
      <h1>Gestione Personale</h1>
      
      <div class="staff-actions" *ngIf="isHeadNurse">
        <p-button label="Aggiungi Personale" icon="pi pi-plus" (onClick)="openNewStaffDialog()"></p-button>
        <p-button label="Importa da Excel" icon="pi pi-file-excel" styleClass="p-button-success ml-2" 
                 (onClick)="showImportDialog()"></p-button>
      </div>
      
      <div class="staff-table">
        <p-table [value]="staffList" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,25,50]"
                styleClass="p-datatable-sm" [globalFilterFields]="['name', 'email', 'role', 'department', 'facility']">
          <ng-template pTemplate="caption">
            <div class="table-header">
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input pInputText type="text" (input)="applyFilterGlobal($event, 'contains')" 
                       placeholder="Cerca personale..." />
              </span>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Ruolo</th>
              <th>Reparto</th>
              <th>Struttura</th>
              <th>Part-time</th>
              <th *ngIf="isHeadNurse">Azioni</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-staff>
            <tr>
              <td>{{ staff.name }}</td>
              <td>{{ staff.email }}</td>
              <td>
                <p-tag [value]="getRoleLabel(staff.role)" 
                      [severity]="getRoleSeverity(staff.role)"></p-tag>
              </td>
              <td>{{ staff.department }}</td>
              <td>{{ staff.facility }}</td>
              <td>
                <span *ngIf="staff.isPartTime">Sì ({{ staff.partTimeHours || 0 }} ore)</span>
                <span *ngIf="!staff.isPartTime">No</span>
              </td>
              <td *ngIf="isHeadNurse">
                <p-button icon="pi pi-pencil" styleClass="p-button-rounded p-button-text" 
                         (onClick)="editStaff(staff)"></p-button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center">Nessun membro del personale trovato.</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      
      <!-- Add/Edit Staff Dialog -->
      <p-dialog [(visible)]="staffDialogVisible" [style]="{width: '500px'}" [header]="dialogTitle" 
               [modal]="true" styleClass="p-fluid">
        <form #staffForm="ngForm">
          <div class="p-field mt-3">
            <label for="name">Nome</label>
            <input pInputText id="name" [(ngModel)]="currentStaff.name" name="name" required />
          </div>
          
          <div class="p-field mt-3">
            <label for="email">Email</label>
            <input pInputText id="email" [(ngModel)]="currentStaff.email" name="email" required 
                  type="email" />
          </div>
          
          <div class="p-field mt-3">
            <label for="role">Ruolo</label>
            <p-dropdown id="role" [options]="roleOptions" [(ngModel)]="currentStaff.role" 
                      optionLabel="label" optionValue="value" [style]="{width: '100%'}" 
                      name="role" required></p-dropdown>
          </div>
          
          <div class="p-field mt-3">
            <label for="department">Reparto</label>
            <input pInputText id="department" [(ngModel)]="currentStaff.department" 
                  name="department" required />
          </div>
          
          <div class="p-field mt-3">
            <label for="facility">Struttura</label>
            <input pInputText id="facility" [(ngModel)]="currentStaff.facility" 
                  name="facility" required />
          </div>
          
          <div class="p-field-checkbox mt-3">
            <p-checkbox [(ngModel)]="currentStaff.isPartTime" [binary]="true" 
                      name="isPartTime" inputId="isPartTime"></p-checkbox>
            <label for="isPartTime" class="ml-2">Part-time</label>
          </div>
          
          <div class="p-field mt-3" *ngIf="currentStaff.isPartTime">
            <label for="partTimeHours">Ore Settimanali</label>
            <p-inputNumber id="partTimeHours" [(ngModel)]="currentStaff.partTimeHours" 
                         name="partTimeHours" [min]="1" [max]="40"></p-inputNumber>
          </div>
        </form>
        
        <ng-template pTemplate="footer">
          <p-button icon="pi pi-times" label="Annulla" styleClass="p-button-text" 
                  (onClick)="staffDialogVisible = false"></p-button>
          <p-button icon="pi pi-check" label="Salva" [disabled]="!staffForm.valid" 
                  (onClick)="saveStaff()"></p-button>
        </ng-template>
      </p-dialog>
      
      <!-- Import Dialog -->
      <p-dialog [(visible)]="importDialogVisible" [style]="{width: '500px'}" 
               header="Importa Personale da Excel" [modal]="true">
        <div class="import-instructions">
          <p>Carica un file Excel (.xlsx) contenente i dati del personale. 
             Il file deve contenere le seguenti colonne:</p>
          <ul>
            <li>Nome</li>
            <li>Email</li>
            <li>Ruolo (nurse, oss, head_nurse)</li>
            <li>Reparto</li>
            <li>Struttura</li>
            <li>Part-time (true/false)</li>
            <li>Ore Settimanali (opzionale per part-time)</li>
          </ul>
        </div>
        
        <p-fileUpload #fileUpload mode="basic" chooseLabel="Seleziona File Excel" 
                     accept=".xlsx" [maxFileSize]="1000000" [auto]="false" 
                     (uploadHandler)="importExcel($event, fileUpload)"></p-fileUpload>
        
        <ng-template pTemplate="footer">
          <p-button icon="pi pi-times" label="Annulla" styleClass="p-button-text" 
                  (onClick)="importDialogVisible = false"></p-button>
        </ng-template>
      </p-dialog>
      
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .staff-container {
      padding: 1rem;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      color: #1976d2;
    }
    
    .staff-actions {
      margin-bottom: 1.5rem;
    }
    
    .staff-table {
      margin-top: 1rem;
    }
    
    .table-header {
      display: flex;
      justify-content: flex-end;
    }
    
    .import-instructions {
      margin-bottom: 1rem;
    }
    
    .import-instructions p {
      margin-bottom: 0.5rem;
    }
    
    .import-instructions ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    
    :host ::ng-deep .p-fileupload-buttonbar {
      padding: 0;
    }
    
    :host ::ng-deep .p-fileupload .p-button {
      width: 100%;
      margin-top: 1rem;
    }
  `]
})
export class StaffComponent implements OnInit {
  staffList: StaffListItem[] = [];
  staffDialogVisible = false;
  importDialogVisible = false;
  dialogTitle = '';
  isEditMode = false;
  currentStaff: Partial<Staff> = {};
  
  roleOptions = [
    { label: 'Infermiere', value: Role.Nurse },
    { label: 'OSS', value: Role.OSS },
    { label: 'Capo Sala', value: Role.HeadNurse }
  ];
  
  get isHeadNurse(): boolean {
    return this.authService.isHeadNurse;
  }
  
  constructor(
    private staffService: StaffService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}
  
  ngOnInit(): void {
    this.loadStaff();
  }
  
  loadStaff(): void {
    this.staffService.getAllStaff()
      .subscribe({
        next: (data) => {
          this.staffList = data;
        },
        error: (error) => {
          console.error('Error loading staff', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Impossibile caricare i dati del personale'
          });
        }
      });
  }
  
  applyFilterGlobal(event: Event, filterType: string): void {
    const element = event.target as HTMLInputElement;
    const table = document.querySelector('p-table') as any;
    if (table && table.filterable) {
      table.filterGlobal(element.value, filterType);
    }
  }
  
  getRoleLabel(role: Role): string {
    const labels: { [key: string]: string } = {
      [Role.Nurse]: 'Infermiere',
      [Role.OSS]: 'OSS',
      [Role.HeadNurse]: 'Capo Sala'
    };
    return labels[role] || role;
  }
  
  getRoleSeverity(role: Role): string {
    const severities: { [key: string]: string } = {
      [Role.Nurse]: 'info',
      [Role.OSS]: 'success',
      [Role.HeadNurse]: 'warning'
    };
    return severities[role] || 'info';
  }
  
  openNewStaffDialog(): void {
    this.isEditMode = false;
    this.dialogTitle = 'Aggiungi Nuovo Personale';
    this.currentStaff = {
      isPartTime: false
    };
    this.staffDialogVisible = true;
  }
  
  editStaff(staff: StaffListItem): void {
    this.isEditMode = true;
    this.dialogTitle = 'Modifica Personale';
    this.currentStaff = { ...staff };
    this.staffDialogVisible = true;
  }
  
  saveStaff(): void {
    if (this.isEditMode) {
      const id = this.currentStaff.id as number;
      this.staffService.updateStaff(id, this.currentStaff)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Successo',
              detail: 'Personale aggiornato con successo'
            });
            this.staffDialogVisible = false;
            this.loadStaff();
          },
          error: (error) => {
            console.error('Error updating staff', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Errore',
              detail: 'Impossibile aggiornare il personale'
            });
          }
        });
    } else {
      this.staffService.createStaff(this.currentStaff)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Successo',
              detail: 'Personale aggiunto con successo'
            });
            this.staffDialogVisible = false;
            this.loadStaff();
          },
          error: (error) => {
            console.error('Error creating staff', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Errore',
              detail: 'Impossibile aggiungere il personale'
            });
          }
        });
    }
  }
  
  showImportDialog(): void {
    this.importDialogVisible = true;
  }
  
  importExcel(event: any, fileUpload: any): void {
    const file = event.files[0];
    
    if (file) {
      this.staffService.importStaffFromExcel(file)
        .subscribe({
          next: (importedStaff) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Importazione Completata',
              detail: `${importedStaff.length} membri del personale importati con successo`
            });
            this.importDialogVisible = false;
            fileUpload.clear();
            this.loadStaff();
          },
          error: (error) => {
            console.error('Error importing staff', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Errore',
              detail: 'Impossibile importare il personale dal file Excel'
            });
            fileUpload.clear();
          }
        });
    }
  }
}