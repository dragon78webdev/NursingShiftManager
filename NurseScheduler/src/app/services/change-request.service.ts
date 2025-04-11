import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChangeRequest, ChangeRequestData, RequestStatus } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ChangeRequestService {
  private apiUrl = '/api/change-requests';

  constructor(private http: HttpClient) {}

  // Get all change requests
  getAllChangeRequests(): Observable<ChangeRequestData[]> {
    return this.http.get<ChangeRequestData[]>(this.apiUrl)
      .pipe(
        catchError(error => {
          console.error('Error fetching change requests', error);
          return throwError(() => error);
        })
      );
  }

  // Get change requests by staff ID
  getChangeRequestsByStaffId(staffId: number): Observable<ChangeRequestData[]> {
    return this.http.get<ChangeRequestData[]>(`${this.apiUrl}/staff/${staffId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching change requests by staff ID', error);
          return throwError(() => error);
        })
      );
  }

  // Get change requests by status
  getChangeRequestsByStatus(status: RequestStatus): Observable<ChangeRequestData[]> {
    return this.http.get<ChangeRequestData[]>(`${this.apiUrl}/status/${status}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching change requests by status', error);
          return throwError(() => error);
        })
      );
  }

  // Create a new change request
  createChangeRequest(request: Partial<ChangeRequest>): Observable<ChangeRequest> {
    return this.http.post<ChangeRequest>(this.apiUrl, request)
      .pipe(
        catchError(error => {
          console.error('Error creating change request', error);
          return throwError(() => error);
        })
      );
  }

  // Update a change request status
  updateChangeRequestStatus(id: number, status: RequestStatus): Observable<ChangeRequest> {
    return this.http.patch<ChangeRequest>(`${this.apiUrl}/${id}`, { status })
      .pipe(
        catchError(error => {
          console.error('Error updating change request status', error);
          return throwError(() => error);
        })
      );
  }
}