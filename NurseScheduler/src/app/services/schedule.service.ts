import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ScheduleData, Shift, Role, ShiftType } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private apiUrl = '/api/schedules';

  constructor(private http: HttpClient) {}

  // Get schedule for a date range and staff type
  getSchedule(startDate: string, endDate: string, staffType: Role): Observable<ScheduleData> {
    return this.http.get<ScheduleData>(`${this.apiUrl}?startDate=${startDate}&endDate=${endDate}&staffType=${staffType}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching schedule', error);
          return throwError(() => error);
        })
      );
  }

  // Generate a new schedule for a date range and staff type
  generateSchedule(startDate: string, endDate: string, staffType: Role): Observable<ScheduleData> {
    return this.http.post<ScheduleData>(`${this.apiUrl}/generate`, { startDate, endDate, staffType })
      .pipe(
        catchError(error => {
          console.error('Error generating schedule', error);
          return throwError(() => error);
        })
      );
  }

  // Update a shift
  updateShift(shiftId: number, shiftType: ShiftType): Observable<Shift> {
    return this.http.patch<Shift>(`${this.apiUrl}/shifts/${shiftId}`, { shiftType })
      .pipe(
        catchError(error => {
          console.error('Error updating shift', error);
          return throwError(() => error);
        })
      );
  }

  // Generate PDF of the schedule
  generatePdf(startDate: string, endDate: string, staffType: Role): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/pdf`, { startDate, endDate, staffType }, { responseType: 'blob' })
      .pipe(
        catchError(error => {
          console.error('Error generating PDF', error);
          return throwError(() => error);
        })
      );
  }

  // Send schedule via email
  sendScheduleViaEmail(startDate: string, endDate: string, staffType: Role): Observable<any> {
    return this.http.post(`${this.apiUrl}/email`, { startDate, endDate, staffType })
      .pipe(
        catchError(error => {
          console.error('Error sending schedule via email', error);
          return throwError(() => error);
        })
      );
  }
}