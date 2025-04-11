import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Vacation, VacationData } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class VacationService {
  private apiUrl = '/api/vacations';

  constructor(private http: HttpClient) {}

  // Get all vacations
  getAllVacations(): Observable<VacationData[]> {
    return this.http.get<VacationData[]>(this.apiUrl)
      .pipe(
        catchError(error => {
          console.error('Error fetching vacations', error);
          return throwError(() => error);
        })
      );
  }

  // Get vacations by staff ID
  getVacationsByStaffId(staffId: number): Observable<Vacation[]> {
    return this.http.get<Vacation[]>(`${this.apiUrl}/staff/${staffId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching vacations by staff ID', error);
          return throwError(() => error);
        })
      );
  }

  // Get vacations in a date range
  getVacationsByDateRange(startDate: string, endDate: string): Observable<VacationData[]> {
    return this.http.get<VacationData[]>(`${this.apiUrl}/range?startDate=${startDate}&endDate=${endDate}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching vacations by date range', error);
          return throwError(() => error);
        })
      );
  }

  // Create a new vacation request
  createVacation(vacation: Partial<Vacation>): Observable<Vacation> {
    return this.http.post<Vacation>(this.apiUrl, vacation)
      .pipe(
        catchError(error => {
          console.error('Error creating vacation', error);
          return throwError(() => error);
        })
      );
  }

  // Update a vacation's approval status
  updateVacationStatus(id: number, approved: boolean): Observable<Vacation> {
    return this.http.patch<Vacation>(`${this.apiUrl}/${id}`, { approved })
      .pipe(
        catchError(error => {
          console.error('Error updating vacation status', error);
          return throwError(() => error);
        })
      );
  }
}