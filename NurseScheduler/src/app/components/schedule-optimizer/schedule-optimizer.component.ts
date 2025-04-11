import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SchedulerService } from '../../services/scheduler.service';
import { Chart, ChartConfiguration, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ChartData } from 'chart.js';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-schedule-optimizer',
  templateUrl: './schedule-optimizer.component.html',
  styleUrls: ['./schedule-optimizer.component.scss']
})
export class ScheduleOptimizerComponent implements OnInit, OnChanges {
  @Input() startDate: Date = new Date();
  @Input() endDate: Date = new Date();
  @Input() staffType: string = 'nurse';
  
  metrics: any = null;
  loading = false;
  error = '';
  
  // Configurazione del grafico radar
  radarChart: Chart | null = null;
  qualityScore: number = 0;
  
  // Parametri di ottimizzazione
  optimizationParameters = {
    maxIterations: 1000,
    coolingRate: 0.995,
    initialTemperature: 100.0
  };
  
  constructor(
    private schedulerService: SchedulerService,
    private route: ActivatedRoute
  ) {
    // Registra i componenti di Chart.js
    Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
  }

  ngOnInit(): void {
    // Controlla se ci sono parametri nella rotta
    this.route.queryParams.subscribe(params => {
      if (params['startDate']) {
        this.startDate = new Date(params['startDate']);
      }
      if (params['endDate']) {
        this.endDate = new Date(params['endDate']);
      }
      if (params['staffType']) {
        this.staffType = params['staffType'];
      }
      
      this.loadMetrics();
    });
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Ricarica i dati quando cambiano i parametri di input
    if (changes['startDate'] || changes['endDate'] || changes['staffType']) {
      this.loadMetrics();
    }
  }
  
  loadMetrics(): void {
    this.loading = true;
    this.error = '';
    
    this.schedulerService.getScheduleQualityMetrics(this.startDate, this.endDate, this.staffType)
      .subscribe({
        next: (data) => {
          this.metrics = data;
          this.qualityScore = Math.round(data.overallQualityScore || 0);
          this.updateRadarChart();
          this.loading = false;
        },
        error: (err) => {
          console.error('Errore nel caricamento delle metriche:', err);
          this.error = 'Impossibile caricare le metriche di qualità del planning';
          this.loading = false;
        }
      });
  }
  
  updateRadarChart(): void {
    if (!this.metrics) {
      return;
    }
    
    // Calcola i punteggi normalizzati per il grafico radar
    const workloadBalanceScore = Math.min(100, Math.max(0, 100 - (this.metrics.maxWorkload - this.metrics.minWorkload) * 10));
    const weekendFairnessScore = Math.min(100, Math.max(0, 100 - (this.metrics.maxWeekendWorkdays - this.metrics.minWeekendWorkdays) * 20));
    const shiftVarietyScore = Math.min(100, Math.max(0, 100 - this.countConsecutiveSameTypeShifts() * 5));
    const restAfterNightScore = Math.min(100, Math.max(0, 100 - this.metrics.nightToMorningViolations * 25));
    const weekdayWeekendBalanceScore = this.calculateWeekdayWeekendBalance();
    
    const data: ChartData<'radar'> = {
      labels: [
        'Bilanciamento carico di lavoro',
        'Equità weekend',
        'Varietà turni',
        'Riposo dopo notte',
        'Equilibrio feriali/festivi'
      ],
      datasets: [
        {
          label: 'Qualità del planning',
          data: [
            workloadBalanceScore,
            weekendFairnessScore,
            shiftVarietyScore,
            restAfterNightScore,
            weekdayWeekendBalanceScore
          ],
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(54, 162, 235)'
        }
      ]
    };
    
    const config: ChartConfiguration<'radar'> = {
      type: 'radar',
      data: data,
      options: {
        elements: {
          line: {
            borderWidth: 3
          }
        },
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        }
      }
    };
    
    // Distruggi il grafico esistente, se presente
    if (this.radarChart) {
      this.radarChart.destroy();
    }
    
    // Crea il nuovo grafico
    const canvas = document.getElementById('qualityRadarChart') as HTMLCanvasElement;
    if (canvas) {
      this.radarChart = new Chart(canvas, config);
    }
  }
  
  // Metodo fittizio per calcolare le sequenze di turni dello stesso tipo
  countConsecutiveSameTypeShifts(): number {
    // In una versione reale, questo analizzerebbe i turni effettivi
    // In questa versione dimostrativa, restituiamo un valore basato sulla varianza dei tipi di turno
    const total = this.metrics.totalMorningShifts + this.metrics.totalAfternoonShifts + this.metrics.totalNightShifts;
    if (total === 0) return 0;
    
    const mRatio = this.metrics.totalMorningShifts / total;
    const pRatio = this.metrics.totalAfternoonShifts / total;
    const nRatio = this.metrics.totalNightShifts / total;
    
    // Calcola una metrica di varianza semplificata
    const idealM = 0.4;
    const idealP = 0.4;
    const idealN = 0.2;
    
    const variance = 
      Math.abs(mRatio - idealM) + 
      Math.abs(pRatio - idealP) + 
      Math.abs(nRatio - idealN);
    
    // Trasforma la varianza in un numero di "sequenze problematiche"
    return Math.round(variance * 10);
  }
  
  // Metodo per calcolare l'equilibrio tra giorni feriali e weekend
  calculateWeekdayWeekendBalance(): number {
    if (!this.metrics || this.metrics.avgWeekendWorkdays === 0) {
      return 100; // Nessun dato, punteggio massimo per default
    }
    
    // Calcola il numero medio di giorni di lavoro a settimana
    const totalDays = (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
    const totalWeeks = totalDays / 7;
    const avgWorkPerWeek = this.metrics.avgWorkload / totalWeeks;
    
    // Calcola la percentuale ideale di lavoro nei weekend
    // Idealmente, il 28.6% dei giorni di lavoro dovrebbero essere nel weekend (2/7)
    const idealWeekendRatio = 2 / 7; // 28.6%
    const actualWeekendRatio = this.metrics.avgWeekendWorkdays / avgWorkPerWeek;
    
    // Calcola il punteggio basato sulla differenza dal rapporto ideale
    const deviation = Math.abs(actualWeekendRatio - idealWeekendRatio);
    const score = 100 - (deviation * 200); // Moltiplica per 200 per amplificare la penalità
    
    return Math.min(100, Math.max(0, score));
  }
  
  // Metodo per generare un nuovo planning
  generateSchedule(): void {
    this.loading = true;
    this.error = '';
    
    this.schedulerService.generateSchedule(this.startDate, this.endDate, this.staffType, this.optimizationParameters)
      .subscribe({
        next: (result) => {
          console.log('Risultato generazione planning:', result);
          if (result.success) {
            // Aggiorna le metriche con quelle restituite dalla generazione
            this.metrics = result.qualityMetrics;
            this.qualityScore = Math.round(result.qualityMetrics.overallQualityScore || 0);
            this.updateRadarChart();
            
            // Mostra un messaggio di successo
            this.showSuccessMessage(`Planning generato con successo: ${result.generatedShifts.length} turni creati`);
          } else {
            this.error = result.message || 'Errore nella generazione del planning';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Errore nella generazione del planning:', err);
          this.error = 'Impossibile generare il planning';
          this.loading = false;
        }
      });
  }
  
  // Metodo per cancellare i turni esistenti
  clearExistingShifts(): void {
    this.loading = true;
    this.error = '';
    
    this.schedulerService.deleteShiftsByDateRange(this.startDate, this.endDate)
      .subscribe({
        next: (result) => {
          console.log('Risultato cancellazione turni:', result);
          this.showSuccessMessage(`Eliminati ${result.deletedCount} turni`);
          this.loadMetrics(); // Ricarica le metriche
        },
        error: (err) => {
          console.error('Errore nella cancellazione dei turni:', err);
          this.error = 'Impossibile cancellare i turni esistenti';
          this.loading = false;
        }
      });
  }
  
  // Metodo fittizio per mostrare messaggi di successo
  private showSuccessMessage(message: string): void {
    // In una versione reale, questo utilizzerebbe un servizio di notifica/toast
    console.log('Messaggio di successo:', message);
    // Qui potremmo usare il servizio MessageService di PrimeNG per mostrare un toast
  }
}