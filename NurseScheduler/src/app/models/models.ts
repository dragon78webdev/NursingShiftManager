// Enum per i ruoli
export enum Role {
  Nurse = 'nurse',
  OSS = 'oss',
  HeadNurse = 'head_nurse'
}

// Enum per i tipi di turno
export enum ShiftType {
  Morning = 'M',
  Afternoon = 'P',
  Night = 'N',
  Rest = 'R',
  Vacation = 'F'
}

// Enum per lo stato delle richieste
export enum RequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected'
}

// Interfaccia per gli utenti
export interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  facility: string;
  isPartTime: boolean;
  partTimeHours?: number;
  createdAt: Date;
}

// Interfaccia per il personale
export interface Staff {
  id: number;
  userId: number;
  role: Role;
  department: string;
  facility: string;
  isPartTime: boolean;
  partTimeHours?: number;
  name?: string; // campo esteso
  email?: string; // campo esteso
}

// Interfaccia per i turni
export interface Shift {
  id: number;
  staffId: number;
  date: string;
  shiftType: ShiftType;
  createdAt: Date;
  updatedAt: Date;
  staffName?: string; // campo esteso
  role?: Role; // campo esteso
}

// Interfaccia per le ferie
export interface Vacation {
  id: number;
  staffId: number;
  startDate: string;
  endDate: string;
  approved: boolean | null;
  createdAt: Date;
  staffName?: string; // campo esteso
  role?: Role; // campo esteso
}

// Interfaccia per le richieste di cambio turno
export interface ChangeRequest {
  id: number;
  staffId: number;
  shiftId: number;
  shiftDate?: string; // campo esteso
  shiftType?: ShiftType; // campo esteso
  requestedShiftType: ShiftType;
  reason: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  staffName?: string; // campo esteso
  role?: Role; // campo esteso
}

// Interfaccia per le deleghe
export interface Delegation {
  id: number;
  headNurseId: number;
  delegatedToId: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: Date;
  delegatedToName?: string; // campo esteso
  delegatedToEmail?: string; // campo esteso
}

// Interfaccia per il calendario dei turni
export interface ScheduleData {
  shifts: Shift[];
  staffDetails: Record<number, Staff>;
  startDate: string;
  endDate: string;
}

// Interfaccia estesa per la lista personale
export interface StaffListItem extends Staff {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  facility: string;
  isPartTime: boolean;
  partTimeHours?: number;
}

// Interfaccia per i dati di una richiesta di cambio
export interface ChangeRequestData extends ChangeRequest {
  staffName: string;
  shiftDate: string;
  shiftType: ShiftType;
}

// Interfaccia per i dati di una vacanza
export interface VacationData extends Vacation {
  staffName: string;
  role: Role;
}