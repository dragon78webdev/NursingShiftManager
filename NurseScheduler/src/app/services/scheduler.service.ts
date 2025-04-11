import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { 
  ScheduleData, 
  Role, 
  ShiftType, 
  Staff, 
  Vacation,
  Shift
} from '@models/models';

// Interfaccia per i parametri di ottimizzazione
export interface OptimizationParams {
  minConsecutiveRestDays: number;
  maxConsecutiveWorkDays: number;
  considerPreferences: boolean;
  balanceWorkload: boolean;
  avoidNightAfterMorning: boolean;
  respectSeniority: boolean;
  optimizeWeekends: boolean;
  avoidIsolatedWorkDays: boolean;
}

// Interfaccia per le preferenze di turno
export interface ShiftPreference {
  staffId: number;
  date: string;
  preferredShiftTypes: ShiftType[];
  avoidedShiftTypes: ShiftType[];
  preferenceStrength: number; // 1-10, con 10 massima priorità
}

// Interfaccia per i vincoli di turno
export interface ScheduleConstraint {
  staffId: number;
  date: string;
  forbiddenShiftTypes: ShiftType[];
  requiredShiftTypes: ShiftType[];
  isHardConstraint: boolean; // Se true, il vincolo non può essere violato
}

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  private apiUrl = '/api/scheduler';
  
  // Parametri di default per l'ottimizzazione
  private defaultParams: OptimizationParams = {
    minConsecutiveRestDays: 2,
    maxConsecutiveWorkDays: 5,
    considerPreferences: true,
    balanceWorkload: true,
    avoidNightAfterMorning: true,
    respectSeniority: true,
    optimizeWeekends: true,
    avoidIsolatedWorkDays: true
  };
  
  constructor(private http: HttpClient) {}
  
  // Genera un nuovo schedule ottimizzato
  generateOptimizedSchedule(
    startDate: string, 
    endDate: string, 
    staffType: Role,
    params: Partial<OptimizationParams> = {}
  ): Observable<ScheduleData> {
    // Unisci i parametri di default con quelli forniti
    const optimizationParams = { ...this.defaultParams, ...params };
    
    return this.http.post<ScheduleData>(`${this.apiUrl}/generate`, {
      startDate,
      endDate,
      staffType,
      optimizationParams
    }).pipe(
      catchError(error => {
        console.error('Error generating optimized schedule', error);
        return throwError(() => error);
      })
    );
  }
  
  // Aggiunge una preferenza di turno per un membro dello staff
  addShiftPreference(preference: ShiftPreference): Observable<ShiftPreference> {
    return this.http.post<ShiftPreference>(`${this.apiUrl}/preferences`, preference)
      .pipe(
        catchError(error => {
          console.error('Error adding shift preference', error);
          return throwError(() => error);
        })
      );
  }
  
  // Ottiene tutte le preferenze di turno per un membro dello staff
  getShiftPreferences(staffId: number): Observable<ShiftPreference[]> {
    return this.http.get<ShiftPreference[]>(`${this.apiUrl}/preferences/${staffId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching shift preferences', error);
          return throwError(() => error);
        })
      );
  }
  
  // Aggiunge un vincolo di turno
  addScheduleConstraint(constraint: ScheduleConstraint): Observable<ScheduleConstraint> {
    return this.http.post<ScheduleConstraint>(`${this.apiUrl}/constraints`, constraint)
      .pipe(
        catchError(error => {
          console.error('Error adding schedule constraint', error);
          return throwError(() => error);
        })
      );
  }
  
  // Ottiene tutti i vincoli di turno per un periodo specifico
  getScheduleConstraints(startDate: string, endDate: string): Observable<ScheduleConstraint[]> {
    return this.http.get<ScheduleConstraint[]>(
      `${this.apiUrl}/constraints?startDate=${startDate}&endDate=${endDate}`
    ).pipe(
      catchError(error => {
        console.error('Error fetching schedule constraints', error);
        return throwError(() => error);
      })
    );
  }
  
  // Esegue l'analisi della qualità del turno
  analyzeScheduleQuality(
    shifts: Shift[], 
    staff: Staff[], 
    vacations: Vacation[]
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/analyze`, { shifts, staff, vacations })
      .pipe(
        catchError(error => {
          console.error('Error analyzing schedule quality', error);
          return throwError(() => error);
        })
      );
  }
  
  // Esegue un'ottimizzazione manuale su un turno esistente
  optimizeExistingSchedule(
    shifts: Shift[],
    startDate: string,
    endDate: string,
    params: Partial<OptimizationParams> = {}
  ): Observable<Shift[]> {
    // Unisci i parametri di default con quelli forniti
    const optimizationParams = { ...this.defaultParams, ...params };
    
    return this.http.post<Shift[]>(`${this.apiUrl}/optimize-existing`, {
      shifts,
      startDate,
      endDate,
      optimizationParams
    }).pipe(
      catchError(error => {
        console.error('Error optimizing existing schedule', error);
        return throwError(() => error);
      })
    );
  }
  
  // Verifica se ci sono conflitti nei turni
  checkScheduleConflicts(shifts: Shift[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/check-conflicts`, { shifts })
      .pipe(
        catchError(error => {
          console.error('Error checking schedule conflicts', error);
          return throwError(() => error);
        })
      );
  }
}