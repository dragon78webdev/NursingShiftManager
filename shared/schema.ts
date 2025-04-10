import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export enum UserRole {
  NURSE = "nurse",
  OSS = "oss", // Nursing assistant
  HEAD_NURSE = "head_nurse",
}

// Employment contract types
export enum ContractType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
}

// Staff status
export enum StaffStatus {
  ACTIVE = "active",
  VACATION = "vacation",
  SICK_LEAVE = "sick_leave",
  INACTIVE = "inactive",
}

// Shift types
export enum ShiftType {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  NIGHT = "night",
  OFF = "off",
  VACATION = "vacation",
  SICK = "sick",
}

// Shift request status
export enum ShiftRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// Shift request type
export enum ShiftRequestType {
  SWAP = "swap",
  TIME_OFF = "time_off",
  COMPENSATION = "compensation",
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").$type<UserRole>().notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Staff table
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  staffId: text("staff_id").notNull().unique(), // Eg: NRS0012, OSS0005
  contractType: text("contract_type").$type<ContractType>().notNull(),
  partTimePercentage: integer("part_time_percentage"), // NULL for full-time, percentage for part-time
  status: text("status").$type<StaffStatus>().notNull().default("active"),
  delegatedBy: integer("delegated_by").references(() => users.id), // Head nurse who delegated permissions
  delegationActive: boolean("delegation_active").default(false),
});

// Schedule table
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  date: timestamp("date").notNull(),
  shiftType: text("shift_type").$type<ShiftType>().notNull(),
  generatedBy: integer("generated_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shift change requests
export const shiftRequests = pgTable("shift_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(), // Eg: REQ-001
  requestedBy: integer("requested_by").references(() => staff.id).notNull(),
  shiftDate: timestamp("shift_date").notNull(),
  shiftType: text("shift_type").$type<ShiftType>().notNull(),
  requestType: text("request_type").$type<ShiftRequestType>().notNull(),
  swapWithStaffId: integer("swap_with_staff_id").references(() => staff.id),
  status: text("status").$type<ShiftRequestStatus>().notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schedule generation settings
export const scheduleSettings = pgTable("schedule_settings", {
  id: serial("id").primaryKey(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  staffType: text("staff_type").$type<UserRole>().notNull(), // Either NURSE or OSS
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  considerVacations: boolean("consider_vacations").default(true),
  considerPartTime: boolean("consider_part_time").default(true),
  distributeNightShifts: boolean("distribute_night_shifts").default(true),
  avoidConsecutiveNights: boolean("avoid_consecutive_nights").default(true),
  sendEmail: boolean("send_email").default(true),
  generatePdf: boolean("generate_pdf").default(true),
  sendPushNotification: boolean("send_push_notification").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification subscriptions for push notifications
export const notificationSubscriptions = pgTable("notification_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subscription: jsonb("subscription").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShiftRequestSchema = createInsertSchema(shiftRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertScheduleSettingsSchema = createInsertSchema(scheduleSettings).omit({ id: true, createdAt: true });
export const insertNotificationSubscriptionSchema = createInsertSchema(notificationSubscriptions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type ShiftRequest = typeof shiftRequests.$inferSelect;
export type InsertShiftRequest = z.infer<typeof insertShiftRequestSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type ScheduleSettings = typeof scheduleSettings.$inferSelect;
export type InsertScheduleSettings = z.infer<typeof insertScheduleSettingsSchema>;

export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type InsertNotificationSubscription = z.infer<typeof insertNotificationSubscriptionSchema>;
