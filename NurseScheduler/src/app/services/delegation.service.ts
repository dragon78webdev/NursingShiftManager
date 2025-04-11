import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Delegation } from '@models/models';

@Injectable({
  providedIn: 'root'
})
export class DelegationService {
  private apiUrl = '/api/delegations';
  
  constructor(private http: HttpClient) {}
  
  getDelegationsByHeadNurse(headNurseId: number): Observable<Delegation[]> {
    return this.http.get<Delegation[]>(`${this.apiUrl}/head-nurse/${headNurseId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching delegations', error);
          return throwError(() => error);
        })
      );
  }
  
  getActiveDelegations(): Observable<Delegation[]> {
    return this.http.get<Delegation[]>(`${this.apiUrl}/active`)
      .pipe(
        catchError(error => {
          console.error('Error fetching active delegations', error);
          return throwError(() => error);
        })
      );
  }
  
  createDelegation(delegation: Partial<Delegation>): Observable<Delegation> {
    return this.http.post<Delegation>(this.apiUrl, delegation)
      .pipe(
        catchError(error => {
          console.error('Error creating delegation', error);
          return throwError(() => error);
        })
      );
  }
  
  updateDelegation(id: number, active: boolean, endDate?: Date): Observable<Delegation> {
    return this.http.patch<Delegation>(`${this.apiUrl}/${id}`, { active, endDate })
      .pipe(
        catchError(error => {
          console.error('Error updating delegation', error);
          return throwError(() => error);
        })
      );
  }
}