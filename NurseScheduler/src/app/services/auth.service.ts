import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User, Role } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check for existing user session on startup
    this.checkUserSession();
  }

  // Get current user value without subscribing to the observable
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if user is logged in
  public get isLoggedIn(): boolean {
    const user = this.currentUserSubject.value;
    return !!user;
  }

  // Check if user is a head nurse
  public get isHeadNurse(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && user.role === Role.HeadNurse;
  }

  // Check for existing user session
  checkUserSession(): void {
    this.http.get<User>(`${this.apiUrl}/user`)
      .pipe(
        catchError(error => {
          // If error 401, user is not authenticated, don't report it
          if (error.status !== 401) {
            console.error('Error checking user session', error);
          }
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
        },
        error: () => {
          this.currentUserSubject.next(null);
        }
      });
  }

  // Google Authentication
  googleLogin(): void {
    window.location.href = `${this.apiUrl}/google`;
  }

  // Set role for first-time login
  setRole(role: Role): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/role`, { role })
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
        }),
        catchError(error => {
          console.error('Error setting role', error);
          return throwError(() => error);
        })
      );
  }

  // Logout
  logout(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/logout`, {})
      .pipe(
        tap(() => {
          this.currentUserSubject.next(null);
        }),
        catchError(error => {
          console.error('Error during logout', error);
          return throwError(() => error);
        })
      );
  }
}