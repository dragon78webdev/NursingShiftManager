import { pgTable, text, serial, integer, boolean, date, timestamp, jsonb, pgEnum, real, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for staff roles and shift types
export const roleEnum = pgEnum('role', ['nurse', 'oss', 'head_nurse']);
export const shiftTypeEnum = pgEnum('shift_type', ['M', 'P', 'N', 'R', 'F']);
export const requestStatusEnum = pgEnum('request_status', ['pending', 'approved', 'rejected']);
export const complexityFactorEnum = pgEnum('complexity_factor', ['workload', 'staff_experience', 'patient_acuity', 'time_of_day', 'consecutive_shifts', 'staff_preferences']);

// Additional enums for frontend usage
export enum ShiftRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum ShiftRequestType {
  SWAP = 'swap',
  TIME_OFF = 'time_off',
  COMPENSATION = 'compensation'
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  department: text("department").notNull(),
  facility: text("facility").notNull(),
  isPartTime: boolean("is_part_time").default(false),
  partTimeHours: integer("part_time_hours"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Staff table for nurses and nursing assistants (OSS)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  isPartTime: boolean("is_part_time").default(false),
  partTimeHours: integer("part_time_hours"),
  department: text("department").notNull(),
  facility: text("facility").notNull(),
  role: roleEnum("role").notNull(),
});

// Shifts table
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  date: date("date").notNull(),
  shiftType: shiftTypeEnum("shift_type").notNull(), // M = Morning, P = Afternoon, N = Night, R = Rest, F = Vacation
  changed: boolean("changed").default(false),
  originalShiftType: shiftTypeEnum("original_shift_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vacation / Leave requests
export const vacations = pgTable("vacations", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shift change requests
export const changeRequests = pgTable("change_requests", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  requestedShiftType: shiftTypeEnum("requested_shift_type"),
  reason: text("reason").notNull(),
  status: requestStatusEnum("status").default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delegations table
export const delegations = pgTable("delegations", {
  id: serial("id").primaryKey(),
  headNurseId: integer("head_nurse_id").references(() => users.id).notNull(),
  delegatedToId: integer("delegated_to_id").references(() => users.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // change_request, schedule_generated, etc.
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schedule generation history
export const scheduleGenerations = pgTable("schedule_generations", {
  id: serial("id").primaryKey(),
  generatedBy: integer("generated_by").references(() => users.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  staffType: roleEnum("staff_type").notNull(), // nurse or oss
  parameters: jsonb("parameters"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shift complexity scores
export const shiftComplexityScores = pgTable("shift_complexity_scores", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  complexityScore: decimal("complexity_score", { precision: 4, scale: 2 }).notNull(),
  aiAnalysisDetails: jsonb("ai_analysis_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Complexity factors for each shift
export const complexityFactors = pgTable("complexity_factors", {
  id: serial("id").primaryKey(),
  scoreId: integer("score_id").references(() => shiftComplexityScores.id).notNull(),
  factorType: complexityFactorEnum("factor_type").notNull(),
  factorScore: decimal("factor_score", { precision: 3, scale: 1 }).notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true,
  createdAt: true 
});

export const insertStaffSchema = createInsertSchema(staff).omit({ 
  id: true
});

export const insertShiftSchema = createInsertSchema(shifts).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});

export const insertVacationSchema = createInsertSchema(vacations).omit({ 
  id: true, 
  createdAt: true
});

export const insertChangeRequestSchema = createInsertSchema(changeRequests).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
  reviewedBy: true
});

export const insertDelegationSchema = createInsertSchema(delegations).omit({ 
  id: true, 
  createdAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true,
  read: true
});

export const insertScheduleGenerationSchema = createInsertSchema(scheduleGenerations).omit({ 
  id: true, 
  createdAt: true
});

export const insertShiftComplexityScoreSchema = createInsertSchema(shiftComplexityScores).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});

export const insertComplexityFactorSchema = createInsertSchema(complexityFactors).omit({ 
  id: true, 
  createdAt: true
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

export type InsertVacation = z.infer<typeof insertVacationSchema>;
export type Vacation = typeof vacations.$inferSelect;

export type InsertChangeRequest = z.infer<typeof insertChangeRequestSchema>;
export type ChangeRequest = typeof changeRequests.$inferSelect;

export type InsertDelegation = z.infer<typeof insertDelegationSchema>;
export type Delegation = typeof delegations.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertScheduleGeneration = z.infer<typeof insertScheduleGenerationSchema>;
export type ScheduleGeneration = typeof scheduleGenerations.$inferSelect;

export type InsertShiftComplexityScore = z.infer<typeof insertShiftComplexityScoreSchema>;
export type ShiftComplexityScore = typeof shiftComplexityScores.$inferSelect;

export type InsertComplexityFactor = z.infer<typeof insertComplexityFactorSchema>;
export type ComplexityFactor = typeof complexityFactors.$inferSelect;

// Role type for client-side use
export type Role = 'nurse' | 'oss' | 'head_nurse';

// Shift type for client-side use
export type ShiftType = 'M' | 'P' | 'N' | 'R' | 'F';

// Request status type for client-side use
export type RequestStatus = 'pending' | 'approved' | 'rejected';

// Complexity factor type for client-side use
export type ComplexityFactorType = 'workload' | 'staff_experience' | 'patient_acuity' | 'time_of_day' | 'consecutive_shifts' | 'staff_preferences';
