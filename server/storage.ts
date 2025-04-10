import { 
  type User, type InsertUser, 
  type Staff, type InsertStaff,
  type Schedule, type InsertSchedule,
  type ShiftRequest, type InsertShiftRequest,
  type ActivityLog, type InsertActivityLog,
  type ScheduleSettings, type InsertScheduleSettings,
  type NotificationSubscription, type InsertNotificationSubscription,
  UserRole, ShiftRequestStatus, StaffStatus, ShiftType, ContractType, ShiftRequestType
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: UserRole): Promise<User | undefined>;
  
  // Staff operations
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffByUserId(userId: number): Promise<Staff | undefined>;
  getStaffMembers(filter?: {
    role?: UserRole,
    contractType?: ContractType,
    status?: StaffStatus
  }): Promise<(Staff & { user: User })[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: number, data: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaff(id: number): Promise<boolean>;
  
  // Schedule operations
  getSchedule(id: number): Promise<Schedule | undefined>;
  getSchedulesByStaffId(staffId: number): Promise<Schedule[]>;
  getSchedulesByDateRange(startDate: Date, endDate: Date, staffType?: UserRole): Promise<(Schedule & { staff: Staff & { user: User } })[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, data: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: number): Promise<boolean>;
  
  // Shift request operations
  getShiftRequest(id: number): Promise<ShiftRequest | undefined>;
  getShiftRequestsByStaffId(staffId: number): Promise<ShiftRequest[]>;
  getShiftRequestsByStatus(status: ShiftRequestStatus): Promise<(ShiftRequest & { requestedByStaff: Staff & { user: User } })[]>;
  createShiftRequest(request: InsertShiftRequest): Promise<ShiftRequest>;
  updateShiftRequestStatus(id: number, status: ShiftRequestStatus, approvedBy?: number): Promise<ShiftRequest | undefined>;
  
  // Activity log operations
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivityLogs(limit: number): Promise<(ActivityLog & { user: User })[]>;
  
  // Schedule settings operations
  createScheduleSettings(settings: InsertScheduleSettings): Promise<ScheduleSettings>;
  getScheduleSettings(id: number): Promise<ScheduleSettings | undefined>;
  
  // Notification subscriptions
  saveNotificationSubscription(subscription: InsertNotificationSubscription): Promise<NotificationSubscription>;
  getNotificationSubscriptionsByUserId(userId: number): Promise<NotificationSubscription[]>;
  
  // Delegation operations
  setDelegation(headNurseId: number, delegatedStaffId: number, active: boolean): Promise<Staff | undefined>;
  getDelegatedStaff(headNurseId: number): Promise<(Staff & { user: User })[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private staff: Map<number, Staff>;
  private schedules: Map<number, Schedule>;
  private shiftRequests: Map<number, ShiftRequest>;
  private activityLogs: Map<number, ActivityLog>;
  private scheduleSettings: Map<number, ScheduleSettings>;
  private notificationSubscriptions: Map<number, NotificationSubscription>;
  
  private currentUserId: number;
  private currentStaffId: number;
  private currentScheduleId: number;
  private currentRequestId: number;
  private currentLogId: number;
  private currentSettingsId: number;
  private currentSubscriptionId: number;
  
  constructor() {
    this.users = new Map();
    this.staff = new Map();
    this.schedules = new Map();
    this.shiftRequests = new Map();
    this.activityLogs = new Map();
    this.scheduleSettings = new Map();
    this.notificationSubscriptions = new Map();
    
    this.currentUserId = 1;
    this.currentStaffId = 1;
    this.currentScheduleId = 1;
    this.currentRequestId = 1;
    this.currentLogId = 1;
    this.currentSettingsId = 1;
    this.currentSubscriptionId = 1;
    
    // Initialize with some data
    this.initializeData();
  }
  
  private initializeData() {
    // We'll seed with a head nurse user to start with
    const headNurse: User = {
      id: this.currentUserId++,
      googleId: "example_google_id_head_nurse",
      email: "headnurse@example.com",
      name: "Maria Rossi",
      role: UserRole.HEAD_NURSE,
      avatar: null,
      createdAt: new Date()
    };
    this.users.set(headNurse.id, headNurse);
    
    const headNurseStaff: Staff = {
      id: this.currentStaffId++,
      userId: headNurse.id,
      staffId: "NRS0001",
      contractType: ContractType.FULL_TIME,
      partTimePercentage: null,
      status: StaffStatus.ACTIVE,
      delegatedBy: null,
      delegationActive: false
    };
    this.staff.set(headNurseStaff.id, headNurseStaff);
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = { ...user, id, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUserRole(id: number, role: UserRole): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, role };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Staff operations
  async getStaff(id: number): Promise<Staff | undefined> {
    return this.staff.get(id);
  }
  
  async getStaffByUserId(userId: number): Promise<Staff | undefined> {
    return Array.from(this.staff.values()).find(staff => staff.userId === userId);
  }
  
  async getStaffMembers(filter?: {
    role?: UserRole,
    contractType?: ContractType,
    status?: StaffStatus
  }): Promise<(Staff & { user: User })[]> {
    let staffMembers = Array.from(this.staff.values());
    
    // Apply filters
    if (filter) {
      const { role, contractType, status } = filter;
      
      if (role) {
        const staffWithRole = staffMembers.filter(staff => {
          const user = this.users.get(staff.userId);
          return user && user.role === role;
        });
        staffMembers = staffWithRole;
      }
      
      if (contractType) {
        staffMembers = staffMembers.filter(staff => staff.contractType === contractType);
      }
      
      if (status) {
        staffMembers = staffMembers.filter(staff => staff.status === status);
      }
    }
    
    // Join with users
    return staffMembers.map(staff => {
      const user = this.users.get(staff.userId);
      if (!user) throw new Error(`User not found for staff member: ${staff.id}`);
      return { ...staff, user };
    });
  }
  
  async createStaff(staff: InsertStaff): Promise<Staff> {
    const id = this.currentStaffId++;
    const newStaff: Staff = { ...staff, id };
    this.staff.set(id, newStaff);
    return newStaff;
  }
  
  async updateStaff(id: number, data: Partial<InsertStaff>): Promise<Staff | undefined> {
    const staff = this.staff.get(id);
    if (!staff) return undefined;
    
    const updatedStaff = { ...staff, ...data };
    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }
  
  async deleteStaff(id: number): Promise<boolean> {
    return this.staff.delete(id);
  }
  
  // Schedule operations
  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }
  
  async getSchedulesByStaffId(staffId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.staffId === staffId);
  }
  
  async getSchedulesByDateRange(startDate: Date, endDate: Date, staffType?: UserRole): Promise<(Schedule & { staff: Staff & { user: User } })[]> {
    let schedules = Array.from(this.schedules.values()).filter(schedule => {
      return schedule.date >= startDate && schedule.date <= endDate;
    });
    
    if (staffType) {
      schedules = schedules.filter(schedule => {
        const staff = this.staff.get(schedule.staffId);
        if (!staff) return false;
        
        const user = this.users.get(staff.userId);
        return user?.role === staffType;
      });
    }
    
    return schedules.map(schedule => {
      const staff = this.staff.get(schedule.staffId);
      if (!staff) throw new Error(`Staff not found for schedule: ${schedule.id}`);
      
      const user = this.users.get(staff.userId);
      if (!user) throw new Error(`User not found for staff: ${staff.id}`);
      
      return {
        ...schedule,
        staff: { ...staff, user }
      };
    });
  }
  
  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const id = this.currentScheduleId++;
    const now = new Date();
    const newSchedule: Schedule = { 
      ...schedule, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }
  
  async updateSchedule(id: number, data: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    
    const updatedSchedule = { 
      ...schedule, 
      ...data,
      updatedAt: new Date()
    };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }
  
  async deleteSchedule(id: number): Promise<boolean> {
    return this.schedules.delete(id);
  }
  
  // Shift request operations
  async getShiftRequest(id: number): Promise<ShiftRequest | undefined> {
    return this.shiftRequests.get(id);
  }
  
  async getShiftRequestsByStaffId(staffId: number): Promise<ShiftRequest[]> {
    return Array.from(this.shiftRequests.values()).filter(request => request.requestedBy === staffId);
  }
  
  async getShiftRequestsByStatus(status: ShiftRequestStatus): Promise<(ShiftRequest & { requestedByStaff: Staff & { user: User } })[]> {
    const requests = Array.from(this.shiftRequests.values()).filter(request => request.status === status);
    
    return requests.map(request => {
      const staff = this.staff.get(request.requestedBy);
      if (!staff) throw new Error(`Staff not found for request: ${request.id}`);
      
      const user = this.users.get(staff.userId);
      if (!user) throw new Error(`User not found for staff: ${staff.id}`);
      
      return {
        ...request,
        requestedByStaff: { ...staff, user }
      };
    });
  }
  
  async createShiftRequest(request: InsertShiftRequest): Promise<ShiftRequest> {
    const id = this.currentRequestId++;
    const now = new Date();
    const newRequest: ShiftRequest = { 
      ...request, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.shiftRequests.set(id, newRequest);
    return newRequest;
  }
  
  async updateShiftRequestStatus(id: number, status: ShiftRequestStatus, approvedBy?: number): Promise<ShiftRequest | undefined> {
    const request = this.shiftRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { 
      ...request, 
      status,
      approvedBy,
      updatedAt: new Date()
    };
    this.shiftRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // Activity log operations
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentLogId++;
    const newLog: ActivityLog = { ...log, id, createdAt: new Date() };
    this.activityLogs.set(id, newLog);
    return newLog;
  }
  
  async getRecentActivityLogs(limit: number): Promise<(ActivityLog & { user: User })[]> {
    const logs = Array.from(this.activityLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return logs.map(log => {
      const user = this.users.get(log.userId);
      if (!user) throw new Error(`User not found for log: ${log.id}`);
      return { ...log, user };
    });
  }
  
  // Schedule settings operations
  async createScheduleSettings(settings: InsertScheduleSettings): Promise<ScheduleSettings> {
    const id = this.currentSettingsId++;
    const newSettings: ScheduleSettings = { ...settings, id, createdAt: new Date() };
    this.scheduleSettings.set(id, newSettings);
    return newSettings;
  }
  
  async getScheduleSettings(id: number): Promise<ScheduleSettings | undefined> {
    return this.scheduleSettings.get(id);
  }
  
  // Notification subscriptions
  async saveNotificationSubscription(subscription: InsertNotificationSubscription): Promise<NotificationSubscription> {
    const id = this.currentSubscriptionId++;
    const newSubscription: NotificationSubscription = { ...subscription, id, createdAt: new Date() };
    this.notificationSubscriptions.set(id, newSubscription);
    return newSubscription;
  }
  
  async getNotificationSubscriptionsByUserId(userId: number): Promise<NotificationSubscription[]> {
    return Array.from(this.notificationSubscriptions.values()).filter(sub => sub.userId === userId);
  }
  
  // Delegation operations
  async setDelegation(headNurseId: number, delegatedStaffId: number, active: boolean): Promise<Staff | undefined> {
    const staff = this.staff.get(delegatedStaffId);
    if (!staff) return undefined;
    
    const updatedStaff = { 
      ...staff, 
      delegatedBy: active ? headNurseId : null,
      delegationActive: active
    };
    this.staff.set(delegatedStaffId, updatedStaff);
    return updatedStaff;
  }
  
  async getDelegatedStaff(headNurseId: number): Promise<(Staff & { user: User })[]> {
    const delegatedStaff = Array.from(this.staff.values()).filter(staff => 
      staff.delegatedBy === headNurseId && staff.delegationActive
    );
    
    return delegatedStaff.map(staff => {
      const user = this.users.get(staff.userId);
      if (!user) throw new Error(`User not found for staff: ${staff.id}`);
      return { ...staff, user };
    });
  }
}

export const storage = new MemStorage();
