import {
  users, User, InsertUser,
  staff, Staff, InsertStaff,
  shifts, Shift, InsertShift,
  vacations, Vacation, InsertVacation,
  changeRequests, ChangeRequest, InsertChangeRequest,
  delegations, Delegation, InsertDelegation,
  notifications, Notification, InsertNotification,
  scheduleGenerations, ScheduleGeneration, InsertScheduleGeneration,
  shiftComplexityScores, ShiftComplexityScore, InsertShiftComplexityScore,
  complexityFactors, ComplexityFactor, InsertComplexityFactor,
  Role, ShiftType, RequestStatus, ComplexityFactorType
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, or, desc, isNull } from "drizzle-orm";

// Storage interface that defines all the methods needed for the application
export interface IStorage {
  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  listUsersByRole(role: Role): Promise<User[]>;

  // Staff methods
  getStaffById(id: number): Promise<Staff | undefined>;
  getStaffByUserId(userId: number): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: number, data: Partial<Staff>): Promise<Staff | undefined>;
  listStaff(): Promise<Staff[]>;
  listStaffByRole(role: Role): Promise<Staff[]>;
  listStaffByDepartment(department: string): Promise<Staff[]>;
  
  // Shift methods
  getShiftById(id: number): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, data: Partial<Shift>): Promise<Shift | undefined>;
  listShiftsByStaffId(staffId: number): Promise<Shift[]>;
  listShiftsByDateRange(startDate: Date, endDate: Date): Promise<Shift[]>;
  listShiftsByStaffAndDateRange(staffId: number, startDate: Date, endDate: Date): Promise<Shift[]>;
  
  // Vacation methods
  getVacationById(id: number): Promise<Vacation | undefined>;
  createVacation(vacation: InsertVacation): Promise<Vacation>;
  updateVacation(id: number, data: Partial<Vacation>): Promise<Vacation | undefined>;
  listVacationsByStaffId(staffId: number): Promise<Vacation[]>;
  listVacationsByDateRange(startDate: Date, endDate: Date): Promise<Vacation[]>;
  
  // Change request methods
  getChangeRequestById(id: number): Promise<ChangeRequest | undefined>;
  createChangeRequest(changeRequest: InsertChangeRequest): Promise<ChangeRequest>;
  updateChangeRequest(id: number, data: Partial<ChangeRequest>): Promise<ChangeRequest | undefined>;
  listChangeRequests(): Promise<ChangeRequest[]>;
  listChangeRequestsByStaffId(staffId: number): Promise<ChangeRequest[]>;
  listChangeRequestsByStatus(status: RequestStatus): Promise<ChangeRequest[]>;
  
  // Delegation methods
  getDelegationById(id: number): Promise<Delegation | undefined>;
  createDelegation(delegation: InsertDelegation): Promise<Delegation>;
  updateDelegation(id: number, data: Partial<Delegation>): Promise<Delegation | undefined>;
  listDelegationsByHeadNurse(headNurseId: number): Promise<Delegation[]>;
  listActiveDelegations(): Promise<Delegation[]>;
  
  // Notification methods
  getNotificationById(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, data: Partial<Notification>): Promise<Notification | undefined>;
  listNotificationsByUserId(userId: number): Promise<Notification[]>;
  listUnreadNotificationsByUserId(userId: number): Promise<Notification[]>;
  
  // Schedule generation methods
  getScheduleGenerationById(id: number): Promise<ScheduleGeneration | undefined>;
  createScheduleGeneration(scheduleGeneration: InsertScheduleGeneration): Promise<ScheduleGeneration>;
  listScheduleGenerations(): Promise<ScheduleGeneration[]>;
  
  // Shift complexity scoring methods
  getShiftComplexityScoreById(id: number): Promise<ShiftComplexityScore | undefined>;
  getShiftComplexityScoreByShiftId(shiftId: number): Promise<ShiftComplexityScore | undefined>;
  createShiftComplexityScore(score: InsertShiftComplexityScore): Promise<ShiftComplexityScore>;
  updateShiftComplexityScore(id: number, data: Partial<ShiftComplexityScore>): Promise<ShiftComplexityScore | undefined>;
  listShiftComplexityScores(): Promise<ShiftComplexityScore[]>;
  listShiftComplexityScoresByDateRange(startDate: Date, endDate: Date): Promise<ShiftComplexityScore[]>;
  
  // Complexity factors methods
  getComplexityFactorById(id: number): Promise<ComplexityFactor | undefined>;
  createComplexityFactor(factor: InsertComplexityFactor): Promise<ComplexityFactor>;
  listComplexityFactorsByScoreId(scoreId: number): Promise<ComplexityFactor[]>;
  listComplexityFactorsByType(factorType: ComplexityFactorType): Promise<ComplexityFactor[]>;
}

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private staff: Map<number, Staff>;
  private shifts: Map<number, Shift>;
  private vacations: Map<number, Vacation>;
  private changeRequests: Map<number, ChangeRequest>;
  private delegations: Map<number, Delegation>;
  private notifications: Map<number, Notification>;
  private scheduleGenerations: Map<number, ScheduleGeneration>;
  private shiftComplexityScores: Map<number, ShiftComplexityScore>;
  private complexityFactors: Map<number, ComplexityFactor>;
  
  private nextUserId = 1;
  private nextStaffId = 1;
  private nextShiftId = 1;
  private nextVacationId = 1;
  private nextChangeRequestId = 1;
  private nextDelegationId = 1;
  private nextNotificationId = 1;
  private nextScheduleGenerationId = 1;
  private nextShiftComplexityScoreId = 1;
  private nextComplexityFactorId = 1;

  constructor() {
    this.users = new Map();
    this.staff = new Map();
    this.shifts = new Map();
    this.vacations = new Map();
    this.changeRequests = new Map();
    this.delegations = new Map();
    this.notifications = new Map();
    this.scheduleGenerations = new Map();
    
    // Add some initial demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // This would be filled with demo data in a real app
    // but we're avoiding mock data as per instructions
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const createdAt = new Date();
    const user: User = { ...userData, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async listUsersByRole(role: Role): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // Staff methods
  async getStaffById(id: number): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async getStaffByUserId(userId: number): Promise<Staff | undefined> {
    return Array.from(this.staff.values()).find(staff => staff.userId === userId);
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const id = this.nextStaffId++;
    const staff: Staff = { ...staffData, id };
    this.staff.set(id, staff);
    return staff;
  }

  async updateStaff(id: number, data: Partial<Staff>): Promise<Staff | undefined> {
    const staff = this.staff.get(id);
    if (!staff) return undefined;
    
    const updatedStaff = { ...staff, ...data };
    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }

  async listStaff(): Promise<Staff[]> {
    return Array.from(this.staff.values());
  }

  async listStaffByRole(role: Role): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(staff => staff.role === role);
  }

  async listStaffByDepartment(department: string): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(staff => staff.department === department);
  }

  // Shift methods
  async getShiftById(id: number): Promise<Shift | undefined> {
    return this.shifts.get(id);
  }

  async createShift(shiftData: InsertShift): Promise<Shift> {
    const id = this.nextShiftId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const shift: Shift = { ...shiftData, id, createdAt, updatedAt };
    this.shifts.set(id, shift);
    return shift;
  }

  async updateShift(id: number, data: Partial<Shift>): Promise<Shift | undefined> {
    const shift = this.shifts.get(id);
    if (!shift) return undefined;
    
    const updatedAt = new Date();
    const updatedShift = { ...shift, ...data, updatedAt };
    this.shifts.set(id, updatedShift);
    return updatedShift;
  }

  async listShiftsByStaffId(staffId: number): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => shift.staffId === staffId);
  }

  async listShiftsByDateRange(startDate: Date, endDate: Date): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= startDate && shiftDate <= endDate;
    });
  }

  async listShiftsByStaffAndDateRange(staffId: number, startDate: Date, endDate: Date): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => {
      const shiftDate = new Date(shift.date);
      return shift.staffId === staffId && shiftDate >= startDate && shiftDate <= endDate;
    });
  }

  // Vacation methods
  async getVacationById(id: number): Promise<Vacation | undefined> {
    return this.vacations.get(id);
  }

  async createVacation(vacationData: InsertVacation): Promise<Vacation> {
    const id = this.nextVacationId++;
    const createdAt = new Date();
    const vacation: Vacation = { ...vacationData, id, createdAt };
    this.vacations.set(id, vacation);
    return vacation;
  }

  async updateVacation(id: number, data: Partial<Vacation>): Promise<Vacation | undefined> {
    const vacation = this.vacations.get(id);
    if (!vacation) return undefined;
    
    const updatedVacation = { ...vacation, ...data };
    this.vacations.set(id, updatedVacation);
    return updatedVacation;
  }

  async listVacationsByStaffId(staffId: number): Promise<Vacation[]> {
    return Array.from(this.vacations.values()).filter(vacation => vacation.staffId === staffId);
  }

  async listVacationsByDateRange(startDate: Date, endDate: Date): Promise<Vacation[]> {
    return Array.from(this.vacations.values()).filter(vacation => {
      const vacStartDate = new Date(vacation.startDate);
      const vacEndDate = new Date(vacation.endDate);
      return (
        (vacStartDate >= startDate && vacStartDate <= endDate) ||
        (vacEndDate >= startDate && vacEndDate <= endDate) ||
        (vacStartDate <= startDate && vacEndDate >= endDate)
      );
    });
  }

  // Change request methods
  async getChangeRequestById(id: number): Promise<ChangeRequest | undefined> {
    return this.changeRequests.get(id);
  }

  async createChangeRequest(requestData: InsertChangeRequest): Promise<ChangeRequest> {
    const id = this.nextChangeRequestId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const status: RequestStatus = 'pending';
    const changeRequest: ChangeRequest = { ...requestData, id, status, createdAt, updatedAt };
    this.changeRequests.set(id, changeRequest);
    return changeRequest;
  }

  async updateChangeRequest(id: number, data: Partial<ChangeRequest>): Promise<ChangeRequest | undefined> {
    const request = this.changeRequests.get(id);
    if (!request) return undefined;
    
    const updatedAt = new Date();
    const updatedRequest = { ...request, ...data, updatedAt };
    this.changeRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async listChangeRequests(): Promise<ChangeRequest[]> {
    return Array.from(this.changeRequests.values());
  }

  async listChangeRequestsByStaffId(staffId: number): Promise<ChangeRequest[]> {
    return Array.from(this.changeRequests.values()).filter(req => req.staffId === staffId);
  }

  async listChangeRequestsByStatus(status: RequestStatus): Promise<ChangeRequest[]> {
    return Array.from(this.changeRequests.values()).filter(req => req.status === status);
  }

  // Delegation methods
  async getDelegationById(id: number): Promise<Delegation | undefined> {
    return this.delegations.get(id);
  }

  async createDelegation(delegationData: InsertDelegation): Promise<Delegation> {
    const id = this.nextDelegationId++;
    const createdAt = new Date();
    const delegation: Delegation = { ...delegationData, id, createdAt };
    this.delegations.set(id, delegation);
    return delegation;
  }

  async updateDelegation(id: number, data: Partial<Delegation>): Promise<Delegation | undefined> {
    const delegation = this.delegations.get(id);
    if (!delegation) return undefined;
    
    const updatedDelegation = { ...delegation, ...data };
    this.delegations.set(id, updatedDelegation);
    return updatedDelegation;
  }

  async listDelegationsByHeadNurse(headNurseId: number): Promise<Delegation[]> {
    return Array.from(this.delegations.values()).filter(
      delegation => delegation.headNurseId === headNurseId
    );
  }

  async listActiveDelegations(): Promise<Delegation[]> {
    const today = new Date();
    return Array.from(this.delegations.values()).filter(delegation => {
      const startDate = new Date(delegation.startDate);
      const endDate = delegation.endDate ? new Date(delegation.endDate) : null;
      return delegation.active && startDate <= today && (!endDate || endDate >= today);
    });
  }

  // Notification methods
  async getNotificationById(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.nextNotificationId++;
    const createdAt = new Date();
    const read = false;
    const notification: Notification = { ...notificationData, id, read, createdAt };
    this.notifications.set(id, notification);
    return notification;
  }

  async updateNotification(id: number, data: Partial<Notification>): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, ...data };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async listNotificationsByUserId(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async listUnreadNotificationsByUserId(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.read)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Schedule generation methods
  async getScheduleGenerationById(id: number): Promise<ScheduleGeneration | undefined> {
    return this.scheduleGenerations.get(id);
  }

  async createScheduleGeneration(data: InsertScheduleGeneration): Promise<ScheduleGeneration> {
    const id = this.nextScheduleGenerationId++;
    const createdAt = new Date();
    const scheduleGeneration: ScheduleGeneration = { ...data, id, createdAt };
    this.scheduleGenerations.set(id, scheduleGeneration);
    return scheduleGeneration;
  }

  async listScheduleGenerations(): Promise<ScheduleGeneration[]> {
    return Array.from(this.scheduleGenerations.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const storage = new MemStorage();
