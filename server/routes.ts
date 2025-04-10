import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { 
  UserRole, ShiftRequestStatus, StaffStatus, 
  ShiftType, ShiftRequestType, ContractType,
  insertUserSchema, insertStaffSchema, insertScheduleSchema,
  insertShiftRequestSchema, insertActivityLogSchema, insertScheduleSettingsSchema,
  insertNotificationSubscriptionSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { generateSchedule } from "../client/src/lib/schedule-generator";
import { generatePDF } from "../client/src/lib/pdf-generator";
import * as fs from "fs";
import * as path from "path";
import { WebSocketServer } from "ws";
import * as nodemailer from "nodemailer";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";
import MemoryStore from "memorystore";

// Create memory store for sessions
const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map();
  
  wss.on("connection", (ws) => {
    const id = nanoid();
    clients.set(id, ws);
    
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Check authentication if needed
      } catch (err) {
        console.error("Invalid WebSocket message format");
      }
    });
    
    ws.on("close", () => {
      clients.delete(id);
    });
  });
  
  // Configure session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "nurse-scheduler-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
      store: new SessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      })
    })
  );
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "google-client-id",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "google-client-secret",
        callbackURL: "/api/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await storage.getUserByGoogleId(profile.id);
          
          if (!user) {
            // New user - create account
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("Email information not provided by Google"));
            }
            
            const newUser = await storage.createUser({
              googleId: profile.id,
              email,
              name: profile.displayName,
              role: UserRole.NURSE, // Default role, will be updated by the user
              avatar: profile.photos?.[0]?.value || null
            });
            
            return done(null, newUser);
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: () => void) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Middleware to check if user is a head nurse
  const isHeadNurse = (req: Request, res: Response, next: () => void) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === UserRole.HEAD_NURSE) {
      return next();
    }
    res.status(403).json({ message: "Forbidden: requires head nurse role" });
  };
  
  // Middleware to check if user is a head nurse or has delegation
  const isHeadNurseOrDelegated = async (req: Request, res: Response, next: () => void) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = req.user as any;
    
    // If user is head nurse, proceed
    if (user.role === UserRole.HEAD_NURSE) {
      return next();
    }
    
    // Check if user has delegation
    const staff = await storage.getStaffByUserId(user.id);
    if (staff?.delegationActive) {
      return next();
    }
    
    res.status(403).json({ message: "Forbidden: requires head nurse role or delegation" });
  };
  
  // Authentication routes
  app.get("/api/auth/google", passport.authenticate("google"));
  
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/login?error=auth_failed"
    })
  );
  
  app.get("/api/auth/session", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ 
        authenticated: true, 
        user: req.user 
      });
    } else {
      res.json({ 
        authenticated: false 
      });
    }
  });
  
  app.post("/api/auth/set-role", isAuthenticated, async (req, res) => {
    try {
      const { role } = req.body;
      
      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const userId = (req.user as any).id;
      const updatedUser = await storage.updateUserRole(userId, role);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create staff record if it doesn't exist
      const existingStaff = await storage.getStaffByUserId(userId);
      
      if (!existingStaff) {
        const prefix = role === UserRole.NURSE ? "NRS" : "OSS";
        const staffCount = (await storage.getStaffMembers()).length;
        const staffId = `${prefix}${String(staffCount + 1).padStart(4, '0')}`;
        
        await storage.createStaff({
          userId,
          staffId,
          contractType: ContractType.FULL_TIME,
          partTimePercentage: null,
          status: StaffStatus.ACTIVE,
          delegatedBy: null,
          delegationActive: false
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "SET_ROLE",
        details: { role }
      });
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed", error: err.message });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Staff management routes
  app.get("/api/staff", isAuthenticated, async (req, res) => {
    try {
      const { role, contractType, status } = req.query;
      
      const filter: any = {};
      
      if (role && Object.values(UserRole).includes(role as UserRole)) {
        filter.role = role;
      }
      
      if (contractType && Object.values(ContractType).includes(contractType as ContractType)) {
        filter.contractType = contractType;
      }
      
      if (status && Object.values(StaffStatus).includes(status as StaffStatus)) {
        filter.status = status;
      }
      
      const staffMembers = await storage.getStaffMembers(filter);
      res.json(staffMembers);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.post("/api/staff", isHeadNurse, async (req, res) => {
    try {
      const staffData = insertStaffSchema.parse(req.body);
      const createdStaff = await storage.createStaff(staffData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "CREATE_STAFF",
        details: { staffId: createdStaff.id }
      });
      
      res.status(201).json(createdStaff);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.put("/api/staff/:id", isHeadNurse, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const staffData = req.body;
      
      const updatedStaff = await storage.updateStaff(id, staffData);
      
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "UPDATE_STAFF",
        details: { staffId: id }
      });
      
      res.json(updatedStaff);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.delete("/api/staff/:id", isHeadNurse, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStaff(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "DELETE_STAFF",
        details: { staffId: id }
      });
      
      res.json({ message: "Staff deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  // Staff import from Excel
  app.post("/api/staff/import-excel", isHeadNurse, async (req, res) => {
    try {
      const excelData = req.body.excelData;
      const buffer = Buffer.from(excelData, 'base64');
      
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (const row of rows) {
        try {
          // Check if user with email exists
          let user = await storage.getUserByEmail(row.email);
          
          if (!user) {
            // Create new user
            user = await storage.createUser({
              googleId: `temp_${nanoid()}`,  // Temporary ID until user logs in
              email: row.email,
              name: row.name,
              role: row.role === "OSS" ? UserRole.OSS : UserRole.NURSE,
              avatar: null
            });
          }
          
          // Check if staff already exists for this user
          const existingStaff = await storage.getStaffByUserId(user.id);
          
          if (!existingStaff) {
            // Create staff record
            const prefix = user.role === UserRole.NURSE ? "NRS" : "OSS";
            const staffCount = (await storage.getStaffMembers()).length;
            const staffId = row.staffId || `${prefix}${String(staffCount + 1).padStart(4, '0')}`;
            
            await storage.createStaff({
              userId: user.id,
              staffId,
              contractType: row.contractType === "part_time" ? ContractType.PART_TIME : ContractType.FULL_TIME,
              partTimePercentage: row.partTimePercentage || null,
              status: StaffStatus.ACTIVE,
              delegatedBy: null,
              delegationActive: false
            });
          }
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Error processing row ${row.name || row.email}: ${(error as Error).message}`);
        }
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "IMPORT_STAFF",
        details: { 
          success: results.success,
          failed: results.failed
        }
      });
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  // Delegation routes
  app.post("/api/delegation/:staffId", isHeadNurse, async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const { active } = req.body;
      
      if (typeof active !== "boolean") {
        return res.status(400).json({ message: "Active status must be a boolean" });
      }
      
      const updatedStaff = await storage.setDelegation((req.user as any).id, staffId, active);
      
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: active ? "ENABLE_DELEGATION" : "DISABLE_DELEGATION",
        details: { staffId }
      });
      
      res.json(updatedStaff);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.get("/api/delegation", isHeadNurse, async (req, res) => {
    try {
      const delegatedStaff = await storage.getDelegatedStaff((req.user as any).id);
      res.json(delegatedStaff);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  // Schedule routes
  app.get("/api/schedules", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, staffType } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      let staffTypeFilter: UserRole | undefined = undefined;
      if (staffType && Object.values(UserRole).includes(staffType as UserRole)) {
        staffTypeFilter = staffType as UserRole;
      }
      
      const schedules = await storage.getSchedulesByDateRange(start, end, staffTypeFilter);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.post("/api/schedules/generate", isHeadNurseOrDelegated, async (req, res) => {
    try {
      const settingsData = insertScheduleSettingsSchema.parse(req.body);
      
      // Create settings in storage
      const settings = await storage.createScheduleSettings({
        ...settingsData,
        createdBy: (req.user as any).id
      });
      
      // Get staff members based on staff type
      const staffMembers = await storage.getStaffMembers({ role: settings.staffType });
      
      // Generate schedules
      const generatedSchedules = generateSchedule(
        staffMembers,
        settings.startDate,
        settings.endDate,
        {
          considerVacations: settings.considerVacations,
          considerPartTime: settings.considerPartTime,
          distributeNightShifts: settings.distributeNightShifts,
          avoidConsecutiveNights: settings.avoidConsecutiveNights
        }
      );
      
      // Save generated schedules
      const savedSchedules = [];
      for (const schedule of generatedSchedules) {
        const savedSchedule = await storage.createSchedule({
          staffId: schedule.staffId,
          date: schedule.date,
          shiftType: schedule.shiftType,
          generatedBy: (req.user as any).id
        });
        savedSchedules.push(savedSchedule);
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "GENERATE_SCHEDULES",
        details: { 
          settingsId: settings.id,
          staffType: settings.staffType,
          startDate: settings.startDate,
          endDate: settings.endDate,
          count: savedSchedules.length
        }
      });
      
      // Generate PDF if requested
      if (settings.generatePdf) {
        const pdfBuffer = await generatePDF(savedSchedules, staffMembers, settings);
        
        // In a real app, you'd save this to a file service or send directly via email
        // For now, we'll just return success
      }
      
      // Send emails if requested
      if (settings.sendEmail) {
        // Create a testing transport for development
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.example.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER || "user@example.com",
            pass: process.env.SMTP_PASS || "password"
          }
        });
        
        // Group schedules by staff
        const schedulesByStaff = savedSchedules.reduce((acc, schedule) => {
          if (!acc[schedule.staffId]) {
            acc[schedule.staffId] = [];
          }
          acc[schedule.staffId].push(schedule);
          return acc;
        }, {} as Record<number, any[]>);
        
        // Send email to each staff member
        for (const staffId in schedulesByStaff) {
          const staff = staffMembers.find(s => s.id === parseInt(staffId));
          if (staff) {
            // In a real app, you would send an actual email here
            console.log(`Sending email to ${staff.user.email} with their schedules`);
          }
        }
      }
      
      // Send push notifications if requested
      if (settings.sendPushNotification) {
        // Broadcast to all connected clients
        clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: "SCHEDULES_GENERATED",
              data: {
                startDate: settings.startDate,
                endDate: settings.endDate,
                staffType: settings.staffType
              }
            }));
          }
        });
      }
      
      res.json({
        settings,
        schedulesGenerated: savedSchedules.length
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  // Shift request routes
  app.get("/api/shift-requests", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      
      // If status provided and valid, filter by status
      if (status && Object.values(ShiftRequestStatus).includes(status as ShiftRequestStatus)) {
        const requests = await storage.getShiftRequestsByStatus(status as ShiftRequestStatus);
        return res.json(requests);
      }
      
      // If user is head nurse, get all requests
      if ((req.user as any).role === UserRole.HEAD_NURSE) {
        // Get all statuses and combine results
        const allRequests = [];
        for (const statusValue of Object.values(ShiftRequestStatus)) {
          const requests = await storage.getShiftRequestsByStatus(statusValue);
          allRequests.push(...requests);
        }
        return res.json(allRequests);
      }
      
      // Otherwise, get only the user's requests
      const staff = await storage.getStaffByUserId((req.user as any).id);
      if (!staff) {
        return res.status(404).json({ message: "Staff record not found for user" });
      }
      
      const requests = await storage.getShiftRequestsByStaffId(staff.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.post("/api/shift-requests", isAuthenticated, async (req, res) => {
    try {
      const staff = await storage.getStaffByUserId((req.user as any).id);
      if (!staff) {
        return res.status(404).json({ message: "Staff record not found for user" });
      }
      
      // Generate a request ID
      const requestCount = (await storage.getShiftRequestsByStaffId(staff.id)).length;
      const requestId = `REQ-${String(requestCount + 1).padStart(3, '0')}`;
      
      const requestData = insertShiftRequestSchema.parse({
        ...req.body,
        requestId,
        requestedBy: staff.id
      });
      
      const createdRequest = await storage.createShiftRequest(requestData);
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "CREATE_SHIFT_REQUEST",
        details: { requestId: createdRequest.id }
      });
      
      // Notify head nurses via WebSocket
      clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "NEW_SHIFT_REQUEST",
            data: {
              requestId: createdRequest.requestId,
              staffName: (req.user as any).name,
              shiftDate: createdRequest.shiftDate
            }
          }));
        }
      });
      
      res.status(201).json(createdRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  app.put("/api/shift-requests/:id/status", isHeadNurseOrDelegated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!Object.values(ShiftRequestStatus).includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedRequest = await storage.updateShiftRequestStatus(
        id, 
        status, 
        (req.user as any).id
      );
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Shift request not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: (req.user as any).id,
        action: "UPDATE_SHIFT_REQUEST_STATUS",
        details: { 
          requestId: id,
          status
        }
      });
      
      // Notify the requestor via WebSocket
      const request = await storage.getShiftRequest(id);
      if (request) {
        const staff = await storage.getStaff(request.requestedBy);
        if (staff) {
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: "SHIFT_REQUEST_STATUS_UPDATED",
                data: {
                  requestId: request.requestId,
                  status,
                  staffId: staff.userId
                }
              }));
            }
          });
        }
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  // Activity logs
  app.get("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getRecentActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  // Push notification subscription
  app.post("/api/notifications/subscribe", isAuthenticated, async (req, res) => {
    try {
      const { subscription } = req.body;
      
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription object" });
      }
      
      const savedSubscription = await storage.saveNotificationSubscription({
        userId: (req.user as any).id,
        subscription
      });
      
      res.status(201).json(savedSubscription);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: (error as Error).message });
    }
  });
  
  return httpServer;
}
