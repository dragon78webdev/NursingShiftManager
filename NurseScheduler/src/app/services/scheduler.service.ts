import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  private apiUrl = '/api/schedule';

  constructor(private http: HttpClient) {}

  /**
   * Ottiene i turni per un intervallo di date
   */
  getShifts(startDate?: Date, endDate?: Date): Observable<any[]> {
    let url = `${this.apiUrl}`;
    
    // Aggiunge i parametri di query per le date, se specificati
    const params: any = {};
    if (startDate) {
      params.startDate = startDate.toISOString().split('T')[0];
    }
    if (endDate) {
      params.endDate = endDate.toISOString().split('T')[0];
    }
    
    return this.http.get<any[]>(url, { params });
  }

  /**
   * Ottiene i turni dell'utente corrente
   */
  getMyShifts(startDate?: Date, endDate?: Date): Observable<any[]> {
    let url = `${this.apiUrl}/my`;
    
    // Aggiunge i parametri di query per le date, se specificati
    const params: any = {};
    if (startDate) {
      params.startDate = startDate.toISOString().split('T')[0];
    }
    if (endDate) {
      params.endDate = endDate.toISOString().split('T')[0];
    }
    
    return this.http.get<any[]>(url, { params });
  }

  /**
   * Ottiene i turni di un membro dello staff specifico
   */
  getStaffShifts(staffId: number, startDate?: Date, endDate?: Date): Observable<any[]> {
    let url = `${this.apiUrl}/staff/${staffId}`;
    
    // Aggiunge i parametri di query per le date, se specificati
    const params: any = {};
    if (startDate) {
      params.startDate = startDate.toISOString().split('T')[0];
    }
    if (endDate) {
      params.endDate = endDate.toISOString().split('T')[0];
    }
    
    return this.http.get<any[]>(url, { params });
  }

  /**
   * Genera un nuovo planning
   */
  generateSchedule(startDate: Date, endDate: Date, staffType: string, parameters?: any): Observable<any> {
    const url = `${this.apiUrl}/generate`;
    
    const body = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      staffType,
      parameters
    };
    
    return this.http.post<any>(url, body);
  }

  /**
   * Aggiorna un turno
   */
  updateShift(shiftId: number, shiftType: string, notes?: string): Observable<any> {
    const url = `${this.apiUrl}/${shiftId}`;
    
    const body = {
      shiftType,
      notes
    };
    
    return this.http.put<any>(url, body);
  }

  /**
   * Elimina un turno
   */
  deleteShift(shiftId: number): Observable<any> {
    const url = `${this.apiUrl}/${shiftId}`;
    return this.http.delete<any>(url);
  }

  /**
   * Elimina tutti i turni in un intervallo di date
   */
  deleteShiftsByDateRange(startDate: Date, endDate: Date): Observable<any> {
    const url = `${this.apiUrl}`;
    
    const params = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    return this.http.delete<any>(url, { params });
  }

  /**
   * Ottiene le generazioni di planning
   */
  getScheduleGenerations(staffType?: string): Observable<any[]> {
    const url = `${this.apiUrl}/generations`;
    
    const params: any = {};
    if (staffType) {
      params.staffType = staffType;
    }
    
    return this.http.get<any[]>(url, { params });
  }

  /**
   * Ottiene le metriche di qualità del planning
   */
  getScheduleQualityMetrics(startDate: Date, endDate: Date, staffType: string): Observable<any> {
    const url = `${this.apiUrl}/quality`;
    
    const params = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      staffType
    };
    
    return this.http.get<any>(url, { params });
  }
}