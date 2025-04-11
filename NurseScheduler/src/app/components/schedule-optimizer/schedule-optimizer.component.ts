import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { CardModule } from 'primeng/card';
import { SliderModule } from 'primeng/slider';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';

// Services and Models
import { OptimizationParams, SchedulerService } from '@services/scheduler.service';
import { ShiftType, Role, Shift, Staff, Vacation } from '@models/models';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-schedule-optimizer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    SliderModule,
    CheckboxModule,
    ButtonModule,
    InputNumberModule,
    AccordionModule,
    TooltipModule,
    ChartModule,
    DividerModule
  ],
  providers: [MessageService],
  template: `
    <p-card header="Ottimizzazione Avanzata Schedulazione" 
           subheader="Configura i parametri per migliorare la generazione dei turni"
           styleClass="optimizer-card">
      <p-accordion [multiple]="true">
        <!-- Parametri Base -->
        <p-accordionTab header="Parametri Base" [selected]="true">
          <div class="optimizer-section">
            <div class="optimizer-param">
              <label for="minConsecutiveRestDays">Giorni minimi di riposo consecutivi</label>
              <div class="optimizer-control">
                <p-inputNumber id="minConsecutiveRestDays" 
                             [(ngModel)]="optimizationParams.minConsecutiveRestDays"
                             [min]="1" [max]="5" [showButtons]="true"></p-inputNumber>
                <div class="param-description">
                  Garantisce che ogni persona abbia almeno questo numero di giorni di riposo consecutivi.
                </div>
              </div>
            </div>
            
            <div class="optimizer-param">
              <label for="maxConsecutiveWorkDays">Giorni massimi di lavoro consecutivi</label>
              <div class="optimizer-control">
                <p-inputNumber id="maxConsecutiveWorkDays" 
                             [(ngModel)]="optimizationParams.maxConsecutiveWorkDays"
                             [min]="3" [max]="7" [showButtons]="true"></p-inputNumber>
                <div class="param-description">
                  Limita il numero massimo di giorni di lavoro consecutivi per persona.
                </div>
              </div>
            </div>
          </div>
        </p-accordionTab>
        
        <!-- Opzioni Avanzate -->
        <p-accordionTab header="Opzioni Avanzate">
          <div class="optimizer-section">
            <div class="optimizer-param-checkbox">
              <p-checkbox [(ngModel)]="optimizationParams.considerPreferences" 
                        [binary]="true" inputId="considerPreferences"></p-checkbox>
              <label for="considerPreferences">Considera preferenze personali</label>
              <span class="p-help-text">
                Se abilitato, l'algoritmo terrà conto delle preferenze di turno espresse dal personale.
              </span>
            </div>
            
            <div class="optimizer-param-checkbox">
              <p-checkbox [(ngModel)]="optimizationParams.balanceWorkload" 
                        [binary]="true" inputId="balanceWorkload"></p-checkbox>
              <label for="balanceWorkload">Bilancia carichi di lavoro</label>
              <span class="p-help-text">
                Distribuisce equamente i turni tra il personale, considerando anche le ore part-time.
              </span>
            </div>
            
            <div class="optimizer-param-checkbox">
              <p-checkbox [(ngModel)]="optimizationParams.avoidNightAfterMorning" 
                        [binary]="true" inputId="avoidNightAfterMorning"></p-checkbox>
              <label for="avoidNightAfterMorning">Evita notte dopo mattina</label>
              <span class="p-help-text">
                Evita di assegnare un turno notturno subito dopo un turno mattutino.
              </span>
            </div>
            
            <div class="optimizer-param-checkbox">
              <p-checkbox [(ngModel)]="optimizationParams.respectSeniority" 
                        [binary]="true" inputId="respectSeniority"></p-checkbox>
              <label for="respectSeniority">Rispetta anzianità</label>
              <span class="p-help-text">
                Assegna turni più favorevoli al personale con maggiore anzianità.
              </span>
            </div>
            
            <div class="optimizer-param-checkbox">
              <p-checkbox [(ngModel)]="optimizationParams.optimizeWeekends" 
                        [binary]="true" inputId="optimizeWeekends"></p-checkbox>
              <label for="optimizeWeekends">Ottimizza weekend</label>
              <span class="p-help-text">
                Cerca di garantire un numero equo di weekend liberi per tutti.
              </span>
            </div>
            
            <div class="optimizer-param-checkbox">
              <p-checkbox [(ngModel)]="optimizationParams.avoidIsolatedWorkDays" 
                        [binary]="true" inputId="avoidIsolatedWorkDays"></p-checkbox>
              <label for="avoidIsolatedWorkDays">Evita giorni di lavoro isolati</label>
              <span class="p-help-text">
                Evita di programmare un singolo giorno di lavoro tra giorni di riposo.
              </span>
            </div>
          </div>
        </p-accordionTab>
        
        <!-- Analisi Qualità -->
        <p-accordionTab header="Analisi Qualità Turni" *ngIf="hasScheduleData">
          <div class="chart-container" *ngIf="scheduleQualityData">
            <div class="chart-wrapper">
              <h3>Qualità Complessiva</h3>
              <p-chart type="radar" [data]="scheduleQualityData" [options]="chartOptions"></p-chart>
            </div>
            
            <p-divider></p-divider>
            
            <div class="quality-metrics">
              <h3>Metriche di Qualità</h3>
              <div class="quality-metric-item" *ngFor="let metric of qualityMetrics">
                <div class="metric-name">{{ metric.name }}</div>
                <div class="metric-value">
                  <span [ngClass]="getMetricClass(metric.score)">{{ metric.score }}/10</span>
                </div>
                <div class="metric-description">{{ metric.description }}</div>
              </div>
            </div>
          </div>
          
          <div class="no-data-message" *ngIf="!scheduleQualityData">
            <p>Genera o carica i turni per visualizzare l'analisi della qualità.</p>
          </div>
        </p-accordionTab>
      </p-accordion>
      
      <div class="optimizer-actions">
        <p-button label="Resetta Impostazioni" icon="pi pi-refresh" 
                styleClass="p-button-outlined p-button-secondary mr-2"
                (onClick)="resetToDefault()"></p-button>
        <p-button label="Analizza Qualità" icon="pi pi-chart-bar" 
                styleClass="p-button-outlined mr-2"
                [disabled]="!hasScheduleData"
                (onClick)="analyzeScheduleQuality()"></p-button>
        <p-button label="Ottimizza Turni" icon="pi pi-cog" 
                styleClass="p-button-success"
                [disabled]="!hasScheduleData"
                (onClick)="optimizeSchedule()"></p-button>
      </div>
    </p-card>
  `,
  styles: [`
    .optimizer-card {
      margin-bottom: 1rem;
    }
    
    .optimizer-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .optimizer-param {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    
    .optimizer-param label {
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    
    .optimizer-control {
      display: flex;
      flex-direction: column;
    }
    
    .param-description {
      font-size: 0.8rem;
      color: #6c757d;
      margin-top: 0.5rem;
    }
    
    .optimizer-param-checkbox {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    
    .optimizer-param-checkbox label {
      margin-left: 0.5rem;
      font-weight: 500;
    }
    
    .optimizer-param-checkbox .p-help-text {
      display: block;
      margin-left: 1.75rem;
      font-size: 0.8rem;
      color: #6c757d;
    }
    
    .optimizer-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
    }
    
    .chart-container {
      margin: 1rem 0;
    }
    
    .chart-wrapper {
      margin-bottom: 1.5rem;
    }
    
    .quality-metrics {
      margin-top: 1.5rem;
    }
    
    .quality-metric-item {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .quality-metric-item:last-child {
      border-bottom: none;
    }
    
    .metric-name {
      font-weight: 500;
    }
    
    .metric-value {
      margin: 0.25rem 0;
      font-weight: bold;
    }
    
    .metric-description {
      font-size: 0.9rem;
      color: #6c757d;
    }
    
    .metric-good {
      color: #2e7d32;
    }
    
    .metric-average {
      color: #ed6c02;
    }
    
    .metric-poor {
      color: #d32f2f;
    }
    
    .mr-2 {
      margin-right: 0.5rem;
    }
    
    .no-data-message {
      text-align: center;
      padding: 2rem 0;
      color: #6c757d;
    }
  `]
})
export class ScheduleOptimizerComponent implements OnInit {
  @Input() shifts: Shift[] = [];
  @Input() staff: Staff[] = [];
  @Input() vacations: Vacation[] = [];
  @Input() startDate: string = '';
  @Input() endDate: string = '';
  @Input() staffType: Role = Role.Nurse;
  
  @Output() optimizationComplete = new EventEmitter<Shift[]>();
  
  optimizationParams: OptimizationParams = {
    minConsecutiveRestDays: 2,
    maxConsecutiveWorkDays: 5,
    considerPreferences: true,
    balanceWorkload: true,
    avoidNightAfterMorning: true,
    respectSeniority: false,
    optimizeWeekends: true,
    avoidIsolatedWorkDays: true
  };
  
  scheduleQualityData: any = null;
  chartOptions: any;
  qualityMetrics: any[] = [];
  
  get hasScheduleData(): boolean {
    return this.shifts.length > 0 && this.staff.length > 0;
  }
  
  constructor(
    private schedulerService: SchedulerService,
    private messageService: MessageService
  ) {}
  
  ngOnInit(): void {
    this.initializeChartOptions();
  }
  
  initializeChartOptions(): void {
    this.chartOptions = {
      scales: {
        r: {
          pointLabels: {
            font: {
              size: 12
            }
          },
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };
  }
  
  resetToDefault(): void {
    this.optimizationParams = {
      minConsecutiveRestDays: 2,
      maxConsecutiveWorkDays: 5,
      considerPreferences: true,
      balanceWorkload: true,
      avoidNightAfterMorning: true,
      respectSeniority: false,
      optimizeWeekends: true,
      avoidIsolatedWorkDays: true
    };
    
    this.messageService.add({
      severity: 'info',
      summary: 'Impostazioni Reset',
      detail: 'I parametri di ottimizzazione sono stati ripristinati ai valori predefiniti.'
    });
  }
  
  analyzeScheduleQuality(): void {
    if (!this.hasScheduleData) {
      return;
    }
    
    this.schedulerService.analyzeScheduleQuality(this.shifts, this.staff, this.vacations)
      .subscribe({
        next: (result) => {
          // Aggiorna i dati del grafico radar
          this.scheduleQualityData = {
            labels: [
              'Distribuzione Turni', 
              'Riposo Consecutivo',
              'Sequenza Turni',
              'Bilanciamento Weekend',
              'Preferenze Personali',
              'Distribuzione Turni Notturni'
            ],
            datasets: [
              {
                label: 'Punteggio Qualità',
                data: [
                  result.workloadDistribution,
                  result.consecutiveRestDays,
                  result.shiftSequence,
                  result.weekendBalance,
                  result.personalPreferences,
                  result.nightShiftDistribution
                ],
                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                borderColor: 'rgba(25, 118, 210, 1)',
                pointBackgroundColor: 'rgba(25, 118, 210, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(25, 118, 210, 1)'
              }
            ]
          };
          
          // Aggiorna le metriche di qualità
          this.qualityMetrics = [
            {
              name: 'Distribuzione Turni',
              score: result.workloadDistribution,
              description: 'Misura quanto equamente sono distribuiti i turni tra il personale.'
            },
            {
              name: 'Riposo Consecutivo',
              score: result.consecutiveRestDays,
              description: 'Valuta se i periodi di riposo sono adeguatamente raggruppati.'
            },
            {
              name: 'Sequenza Turni',
              score: result.shiftSequence,
              description: 'Misura se la sequenza dei turni segue un pattern ergonomico (es. evitare notte dopo mattina).'
            },
            {
              name: 'Bilanciamento Weekend',
              score: result.weekendBalance,
              description: 'Valuta quanto equamente sono distribuiti i weekend liberi.'
            },
            {
              name: 'Preferenze Personali',
              score: result.personalPreferences,
              description: 'Misura quanto sono state rispettate le preferenze espresse dal personale.'
            },
            {
              name: 'Distribuzione Turni Notturni',
              score: result.nightShiftDistribution,
              description: 'Valuta se i turni notturni sono distribuiti equamente.'
            }
          ];
          
          this.messageService.add({
            severity: 'success',
            summary: 'Analisi Completata',
            detail: 'L\'analisi della qualità dei turni è stata completata con successo.'
          });
        },
        error: (error) => {
          console.error('Error analyzing schedule quality', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Errore',
            detail: 'Si è verificato un errore durante l\'analisi della qualità dei turni.'
          });
        }
      });
  }
  
  optimizeSchedule(): void {
    if (!this.hasScheduleData || !this.startDate || !this.endDate) {
      return;
    }
    
    this.schedulerService.optimizeExistingSchedule(
      this.shifts,
      this.startDate,
      this.endDate,
      this.optimizationParams
    ).subscribe({
      next: (optimizedShifts) => {
        this.optimizationComplete.emit(optimizedShifts);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Ottimizzazione Completata',
          detail: 'I turni sono stati ottimizzati con successo.'
        });
        
        // Aggiorna anche l'analisi della qualità
        this.shifts = optimizedShifts;
        this.analyzeScheduleQuality();
      },
      error: (error) => {
        console.error('Error optimizing schedule', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: 'Si è verificato un errore durante l\'ottimizzazione dei turni.'
        });
      }
    });
  }
  
  getMetricClass(score: number): string {
    if (score >= 8) return 'metric-good';
    if (score >= 5) return 'metric-average';
    return 'metric-poor';
  }
}