import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Staff, Role, StaffListItem } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private apiUrl = '/api/staff';

  constructor(private http: HttpClient) {}

  // Get all staff
  getAllStaff(): Observable<StaffListItem[]> {
    return this.http.get<StaffListItem[]>(this.apiUrl)
      .pipe(
        catchError(error => {
          console.error('Error fetching staff', error);
          return throwError(() => error);
        })
      );
  }

  // Get staff by role
  getStaffByRole(role: Role): Observable<StaffListItem[]> {
    return this.http.get<StaffListItem[]>(`${this.apiUrl}/role/${role}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching staff by role', error);
          return throwError(() => error);
        })
      );
  }

  // Get staff by department
  getStaffByDepartment(department: string): Observable<StaffListItem[]> {
    return this.http.get<StaffListItem[]>(`${this.apiUrl}/department/${department}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching staff by department', error);
          return throwError(() => error);
        })
      );
  }

  // Create new staff
  createStaff(staff: Partial<Staff>): Observable<Staff> {
    return this.http.post<Staff>(this.apiUrl, staff)
      .pipe(
        catchError(error => {
          console.error('Error creating staff', error);
          return throwError(() => error);
        })
      );
  }

  // Update staff
  updateStaff(id: number, staff: Partial<Staff>): Observable<Staff> {
    return this.http.patch<Staff>(`${this.apiUrl}/${id}`, staff)
      .pipe(
        catchError(error => {
          console.error('Error updating staff', error);
          return throwError(() => error);
        })
      );
  }

  // Import staff from Excel file
  importStaffFromExcel(file: File): Observable<StaffListItem[]> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<StaffListItem[]>(`${this.apiUrl}/import`, formData)
      .pipe(
        catchError(error => {
          console.error('Error importing staff from Excel', error);
          return throwError(() => error);
        })
      );
  }
}