// This file defines additional types used in the client application

import { Role, ShiftType, RequestStatus } from "@shared/schema";

// Current authenticated user
export interface AuthUser {
  id: number;
  googleId: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  facility: string;
  imageUrl?: string;
  isPartTime?: boolean;
  partTimeHours?: number;
  createdAt: string;
}

// Dashboard stats
export interface DashboardStats {
  nurseCount: number;
  ossCount: number;
  changeRequests: number;
  onVacation: number;
}

// Notification
export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

// Schedule data
export interface StaffMember {
  id: number;
  name: string;
  role: Role;
}

export interface ScheduleData {
  startDate: string;
  endDate: string;
  shifts: ShiftData[];
  staffDetails: Record<number, StaffMember>;
}

export interface ShiftData {
  id: number;
  staffId: number;
  date: string;
  shiftType: ShiftType;
  changed: boolean;
  originalShiftType?: ShiftType;
  createdAt: string;
  updatedAt: string;
}

// Change request
export interface ChangeRequestData {
  id: number;
  staffId: number;
  shiftId: number;
  staffName: string;
  shiftDate: string;
  shiftType: ShiftType;
  requestedShiftType?: ShiftType;
  reason: string;
  status: RequestStatus;
  reviewedBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Vacation request
export interface VacationData {
  id: number;
  staffId: number;
  staffName: string;
  role: Role;
  startDate: string;
  endDate: string;
  approved: boolean;
  createdAt: string;
}

// Staff list item
export interface StaffListItem {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  facility: string;
  isPartTime: boolean;
  partTimeHours?: number;
  imageUrl?: string;
}

// Delegation
export interface DelegationData {
  id: number;
  headNurseId: number;
  delegatedToId: number;
  delegatedToName: string;
  delegatedToEmail: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

// Schedule generation options
export interface ScheduleGenerationOptions {
  staffType: Role;
  startDate: Date;
  endDate: Date;
  considerVacations: boolean;
  considerPartTime: boolean;
  balanceShifts: boolean;
  sendEmail: boolean;
  exportPdf: boolean;
}

// First login form data
export interface FirstLoginFormData {
  role: Role;
  department: string;
  facility: string;
}
