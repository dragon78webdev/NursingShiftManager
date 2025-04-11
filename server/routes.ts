import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isHeadNurse, isHeadNurseOrDelegate } from "./auth";
import passport from "passport";
import session from "express-session";
import { setupEmail, sendShiftChangeRequestEmail, sendScheduleEmail, sendChangeRequestStatusEmail } from "./email";
import { generateSchedule, createPdf } from "./scheduler";
import { z } from "zod";
import { WebSocket, WebSocketServer } from "ws";
import { 
  insertUserSchema, 
  insertChangeRequestSchema, 
  insertVacationSchema,
  Role,
  ShiftType
} from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import MemoryStore from "memorystore";

const MemoryStoreSession = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "nurse-scheduler-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Initialize passport and session
  const passport = setupAuth(app);
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup email service
  setupEmail();

  // Setup multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
  });

  // Create HTTP server - make sure it's properly configured for Replit
  const httpServer = createServer(app);

  // Setup WebSocket server for push notifications with a specific path (/ws)
  // to avoid conflicts with Vite's HMR WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  const clients = new Map<number, WebSocket[]>();

  wss.on("connection", (ws, req) => {
    // The user ID should be sent as a query parameter in the WebSocket URL
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = Number(url.searchParams.get("userId"));

    if (!userId) {
      ws.close();
      return;
    }

    // Store the connection
    if (!clients.has(userId)) {
      clients.set(userId, []);
    }
    clients.get(userId)?.push(ws);

    ws.on("close", () => {
      // Remove the connection when it's closed
      const userConnections = clients.get(userId);
      if (userConnections) {
        const index = userConnections.indexOf(ws);
        if (index !== -1) {
          userConnections.splice(index, 1);
        }
        if (userConnections.length === 0) {
          clients.delete(userId);
        }
      }
    });
  });

  // Function to send push notification
  const sendPushNotification = (userId: number, notification: any) => {
    const userConnections = clients.get(userId);
    if (userConnections) {
      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
        }
      });
    }
  };

  // Auth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
    }),
    (req, res) => {
      // Check if user has completed first login
      const user = req.user as any;
      if (!user.department || !user.facility || user.role === 'nurse') {
        // User needs to complete profile
        res.redirect("/?firstLogin=true");
      } else {
        // User has completed profile
        res.redirect("/");
      }
    }
  );

  // Local auth route for development
  app.post(
    "/api/auth/login",
    passport.authenticate("local"),
    (req, res) => {
      // Check if user has completed first login
      const user = req.user as any;
      if (!user.department || !user.facility || user.role === 'nurse') {
        // User needs to complete profile
        res.json({ success: true, firstLogin: true });
      } else {
        // User has completed profile
        res.json({ success: true, firstLogin: false });
      }
    }
  );

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  // Complete first login profile
  app.post("/api/auth/complete-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      const completeProfileSchema = z.object({
        role: z.enum(["nurse", "oss", "head_nurse"]),
        department: z.string().min(1),
        facility: z.string().min(1),
      });
      
      const validatedData = completeProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Dashboard data
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const nurses = await storage.listStaffByRole("nurse");
      const oss = await storage.listStaffByRole("oss");
      const pendingRequests = await storage.listChangeRequestsByStatus("pending");
      
      // Get count of staff on vacation today
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const vacations = await storage.listVacationsByDateRange(today, today);
      
      res.json({
        nurseCount: nurses.length,
        ossCount: oss.length,
        changeRequests: pendingRequests.length,
        onVacation: vacations.length
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get weekly schedule
  app.get("/api/schedule/weekly", isAuthenticated, async (req, res) => {
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() + 1); // Monday of current week
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Sunday of current week
      
      const shifts = await storage.listShiftsByDateRange(startDate, endDate);
      
      // Get staff details for each shift
      const staffIds = [...new Set(shifts.map(shift => shift.staffId))];
      const staffDetails: Record<number, any> = {};
      
      for (const staffId of staffIds) {
        const staff = await storage.getStaffById(staffId);
        if (staff) {
          const user = await storage.getUserById(staff.userId);
          if (user) {
            staffDetails[staffId] = {
              id: staffId,
              name: user.name,
              role: staff.role
            };
          }
        }
      }
      
      res.json({
        startDate,
        endDate,
        shifts,
        staffDetails
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get shift change requests
  app.get("/api/change-requests", isAuthenticated, async (req, res) => {
    try {
      let requests;
      const user = req.user as any;
      
      if (user.role === "head_nurse") {
        // Head nurses can see all pending requests
        requests = await storage.listChangeRequestsByStatus("pending");
      } else {
        // Regular staff can only see their own requests
        const staff = await storage.getStaffByUserId(user.id);
        if (!staff) {
          return res.status(404).json({ message: "Staff record not found" });
        }
        requests = await storage.listChangeRequestsByStaffId(staff.id);
      }
      
      // Expand the data with staff and shift details
      const expandedRequests = await Promise.all(requests.map(async (request) => {
        const staff = await storage.getStaffById(request.staffId);
        const shift = await storage.getShiftById(request.shiftId);
        const user = staff ? await storage.getUserById(staff.userId) : null;
        
        return {
          ...request,
          staffName: user ? user.name : "Unknown",
          shiftDate: shift ? shift.date : null,
          shiftType: shift ? shift.shiftType : null
        };
      }));
      
      res.json(expandedRequests);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Create shift change request
  app.post("/api/change-requests", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const staff = await storage.getStaffByUserId(user.id);
      
      if (!staff) {
        return res.status(404).json({ message: "Staff record not found" });
      }
      
      const requestSchema = insertChangeRequestSchema.extend({
        shiftId: z.number(),
        reason: z.string().min(1)
      });
      
      const validatedData = requestSchema.parse({
        ...req.body,
        staffId: staff.id
      });
      
      const shift = await storage.getShiftById(validatedData.shiftId);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      // Create change request
      const changeRequest = await storage.createChangeRequest(validatedData);
      
      // Send notification to head nurses
      const headNurses = await storage.listUsersByRole("head_nurse");
      
      for (const headNurse of headNurses) {
        // Create notification in database
        await storage.createNotification({
          userId: headNurse.id,
          title: "Richiesta cambio turno",
          message: `${user.name} ha richiesto un cambio turno per il ${new Date(shift.date).toLocaleDateString('it-IT')}`,
          type: "change_request"
        });
        
        // Send push notification if connected
        sendPushNotification(headNurse.id, {
          type: "change_request",
          title: "Nuova richiesta cambio turno",
          message: `${user.name} ha richiesto un cambio turno per il ${new Date(shift.date).toLocaleDateString('it-IT')}`,
          data: {
            requestId: changeRequest.id
          }
        });
        
        // Send email notification
        await sendShiftChangeRequestEmail(
          headNurse,
          user.name,
          new Date(shift.date),
          shift.shiftType as ShiftType
        );
      }
      
      res.status(201).json(changeRequest);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Update shift change request status (approve/reject)
  app.patch("/api/change-requests/:id", isHeadNurseOrDelegate, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const user = req.user as any;
      
      const statusSchema = z.object({
        status: z.enum(["approved", "rejected"])
      });
      
      const { status } = statusSchema.parse(req.body);
      
      const changeRequest = await storage.getChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }
      
      // Update the request
      const updatedRequest = await storage.updateChangeRequest(requestId, {
        status,
        reviewedBy: user.id
      });
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }
      
      // If approved, update the shift
      if (status === "approved") {
        const shift = await storage.getShiftById(changeRequest.shiftId);
        if (shift) {
          await storage.updateShift(shift.id, {
            shiftType: changeRequest.requestedShiftType as ShiftType,
            changed: true,
            originalShiftType: shift.originalShiftType || shift.shiftType
          });
        }
      }
      
      // Get staff user to send notification
      const staff = await storage.getStaffById(changeRequest.staffId);
      if (staff) {
        const staffUser = await storage.getUserById(staff.userId);
        if (staffUser) {
          // Get shift details for the notification
          const shift = await storage.getShiftById(changeRequest.shiftId);
          
          if (shift) {
            // Create notification
            await storage.createNotification({
              userId: staffUser.id,
              title: `Richiesta cambio turno ${status === "approved" ? "approvata" : "rifiutata"}`,
              message: `La tua richiesta di cambio turno per il ${new Date(shift.date).toLocaleDateString('it-IT')} è stata ${status === "approved" ? "approvata" : "rifiutata"}`,
              type: "change_request_status"
            });
            
            // Send push notification
            sendPushNotification(staffUser.id, {
              type: "change_request_status",
              title: `Richiesta cambio turno ${status === "approved" ? "approvata" : "rifiutata"}`,
              message: `La tua richiesta di cambio turno per il ${new Date(shift.date).toLocaleDateString('it-IT')} è stata ${status === "approved" ? "approvata" : "rifiutata"}`,
              data: {
                requestId: changeRequest.id,
                status
              }
            });
            
            // Send email notification
            await sendChangeRequestStatusEmail(
              staffUser,
              status === "approved",
              new Date(shift.date),
              shift.shiftType as ShiftType
            );
          }
        }
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Staff management
  app.get("/api/staff", isAuthenticated, async (req, res) => {
    try {
      const staffList = await storage.listStaff();
      
      // Expand data with user details
      const expandedStaffList = await Promise.all(staffList.map(async (staff) => {
        const user = await storage.getUserById(staff.userId);
        return {
          ...staff,
          name: user ? user.name : "Unknown",
          email: user ? user.email : "Unknown",
          imageUrl: user ? user.imageUrl : null
        };
      }));
      
      res.json(expandedStaffList);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Import staff from Excel
  app.post("/api/staff/import", isHeadNurse, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Read Excel file
      const workbook = XLSX.read(req.file.buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Validate the Excel format
      const requiredFields = ["name", "email", "role", "department", "facility"];
      
      // Check if all required fields are present in the first row
      const firstRow = data[0] as any;
      const missingFields = requiredFields.filter(field => !(field in firstRow));
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(", ")}` 
        });
      }
      
      // Import staff data
      const importedStaff = [];
      const errors = [];
      
      for (const row of data as any[]) {
        try {
          const role = row.role.toLowerCase();
          if (!["nurse", "oss", "head_nurse"].includes(role)) {
            throw new Error(`Invalid role: ${role}. Must be nurse, oss, or head_nurse.`);
          }
          
          // Check if user with this email already exists
          const existingUser = await storage.getUserByEmail(row.email);
          
          if (existingUser) {
            // Update existing user
            const updatedUser = await storage.updateUser(existingUser.id, {
              name: row.name,
              role: role as Role,
              department: row.department,
              facility: row.facility,
              isPartTime: row.isPartTime === "true" || row.isPartTime === true,
              partTimeHours: row.partTimeHours ? parseInt(row.partTimeHours) : undefined
            });
            
            // Check if staff record exists
            const existingStaff = await storage.getStaffByUserId(existingUser.id);
            
            if (existingStaff) {
              // Update staff record
              await storage.updateStaff(existingStaff.id, {
                role: role as Role,
                department: row.department,
                facility: row.facility,
                isPartTime: row.isPartTime === "true" || row.isPartTime === true,
                partTimeHours: row.partTimeHours ? parseInt(row.partTimeHours) : undefined
              });
              
              importedStaff.push({
                ...existingStaff,
                name: updatedUser?.name,
                email: updatedUser?.email,
                status: "updated"
              });
            } else {
              // Create new staff record
              const newStaff = await storage.createStaff({
                userId: existingUser.id,
                role: role as Role,
                department: row.department,
                facility: row.facility,
                isPartTime: row.isPartTime === "true" || row.isPartTime === true,
                partTimeHours: row.partTimeHours ? parseInt(row.partTimeHours) : undefined
              });
              
              importedStaff.push({
                ...newStaff,
                name: updatedUser?.name,
                email: updatedUser?.email,
                status: "created"
              });
            }
          } else {
            // Create dummy Google ID for imported users
            // In a real app, these users would need to login with Google
            const dummyGoogleId = `imported_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            // Create new user
            const newUser = await storage.createUser({
              googleId: dummyGoogleId,
              email: row.email,
              name: row.name,
              role: role as Role,
              department: row.department,
              facility: row.facility,
              isPartTime: row.isPartTime === "true" || row.isPartTime === true,
              partTimeHours: row.partTimeHours ? parseInt(row.partTimeHours) : undefined
            });
            
            // Create staff record
            const newStaff = await storage.createStaff({
              userId: newUser.id,
              role: role as Role,
              department: row.department,
              facility: row.facility,
              isPartTime: row.isPartTime === "true" || row.isPartTime === true,
              partTimeHours: row.partTimeHours ? parseInt(row.partTimeHours) : undefined
            });
            
            importedStaff.push({
              ...newStaff,
              name: newUser.name,
              email: newUser.email,
              status: "created"
            });
          }
        } catch (error) {
          errors.push({
            row: row,
            error: (error as Error).message
          });
        }
      }
      
      res.json({
        success: true,
        imported: importedStaff.length,
        errors: errors.length,
        data: {
          staff: importedStaff,
          errors
        }
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Create staff manually
  app.post("/api/staff", isHeadNurse, async (req, res) => {
    try {
      const userSchema = insertUserSchema.extend({
        isPartTime: z.boolean().optional(),
        partTimeHours: z.number().optional(),
      });
      
      const validatedData = userSchema.parse(req.body);
      
      // Create dummy Google ID for manually created users
      // In a real app, these users would need to login with Google
      const dummyGoogleId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create new user
      const newUser = await storage.createUser({
        ...validatedData,
        googleId: dummyGoogleId
      });
      
      // Create staff record
      const newStaff = await storage.createStaff({
        userId: newUser.id,
        role: validatedData.role,
        department: validatedData.department,
        facility: validatedData.facility,
        isPartTime: validatedData.isPartTime || false,
        partTimeHours: validatedData.partTimeHours
      });
      
      res.status(201).json({
        ...newStaff,
        name: newUser.name,
        email: newUser.email
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Update staff
  app.patch("/api/staff/:id", isHeadNurse, async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      
      const updateSchema = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(["nurse", "oss", "head_nurse"]).optional(),
        department: z.string().optional(),
        facility: z.string().optional(),
        isPartTime: z.boolean().optional(),
        partTimeHours: z.number().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Get staff record
      const staff = await storage.getStaffById(staffId);
      if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      // Update staff record
      const staffUpdateData: any = {};
      if (validatedData.role) staffUpdateData.role = validatedData.role;
      if (validatedData.department) staffUpdateData.department = validatedData.department;
      if (validatedData.facility) staffUpdateData.facility = validatedData.facility;
      if (validatedData.isPartTime !== undefined) staffUpdateData.isPartTime = validatedData.isPartTime;
      if (validatedData.partTimeHours !== undefined) staffUpdateData.partTimeHours = validatedData.partTimeHours;
      
      if (Object.keys(staffUpdateData).length > 0) {
        await storage.updateStaff(staffId, staffUpdateData);
      }
      
      // Update user record
      const userUpdateData: any = {};
      if (validatedData.name) userUpdateData.name = validatedData.name;
      if (validatedData.email) userUpdateData.email = validatedData.email;
      if (validatedData.role) userUpdateData.role = validatedData.role;
      if (validatedData.department) userUpdateData.department = validatedData.department;
      if (validatedData.facility) userUpdateData.facility = validatedData.facility;
      if (validatedData.isPartTime !== undefined) userUpdateData.isPartTime = validatedData.isPartTime;
      if (validatedData.partTimeHours !== undefined) userUpdateData.partTimeHours = validatedData.partTimeHours;
      
      if (Object.keys(userUpdateData).length > 0) {
        await storage.updateUser(staff.userId, userUpdateData);
      }
      
      // Get updated staff record
      const updatedStaff = await storage.getStaffById(staffId);
      const user = await storage.getUserById(staff.userId);
      
      res.json({
        ...updatedStaff,
        name: user?.name,
        email: user?.email
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Get vacations
  app.get("/api/vacations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let vacations;
      
      if (user.role === "head_nurse") {
        // Head nurses can see all vacations
        vacations = await storage.listVacationsByDateRange(
          new Date(new Date().getFullYear(), 0, 1), // January 1st of current year
          new Date(new Date().getFullYear(), 11, 31) // December 31st of current year
        );
      } else {
        // Regular staff can only see their own vacations
        const staff = await storage.getStaffByUserId(user.id);
        if (!staff) {
          return res.status(404).json({ message: "Staff record not found" });
        }
        vacations = await storage.listVacationsByStaffId(staff.id);
      }
      
      // Expand the data with staff details
      const expandedVacations = await Promise.all(vacations.map(async (vacation) => {
        const staff = await storage.getStaffById(vacation.staffId);
        const user = staff ? await storage.getUserById(staff.userId) : null;
        
        return {
          ...vacation,
          staffName: user ? user.name : "Unknown",
          role: staff ? staff.role : null
        };
      }));
      
      res.json(expandedVacations);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Create vacation request
  app.post("/api/vacations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const staff = await storage.getStaffByUserId(user.id);
      
      if (!staff) {
        return res.status(404).json({ message: "Staff record not found" });
      }
      
      const vacationSchema = insertVacationSchema.extend({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }).refine(data => data.startDate <= data.endDate, {
        message: "End date must be after start date",
        path: ["endDate"]
      });
      
      const validatedData = vacationSchema.parse({
        ...req.body,
        staffId: staff.id
      });
      
      // Create vacation request
      const vacation = await storage.createVacation(validatedData);
      
      // Send notification to head nurses if it's not a head nurse creating the request
      if (user.role !== "head_nurse") {
        const headNurses = await storage.listUsersByRole("head_nurse");
        
        const startDate = new Date(vacation.startDate).toLocaleDateString('it-IT');
        const endDate = new Date(vacation.endDate).toLocaleDateString('it-IT');
        
        for (const headNurse of headNurses) {
          // Create notification
          await storage.createNotification({
            userId: headNurse.id,
            title: "Richiesta ferie",
            message: `${user.name} ha richiesto ferie dal ${startDate} al ${endDate}`,
            type: "vacation_request"
          });
          
          // Send push notification
          sendPushNotification(headNurse.id, {
            type: "vacation_request",
            title: "Nuova richiesta ferie",
            message: `${user.name} ha richiesto ferie dal ${startDate} al ${endDate}`,
            data: {
              vacationId: vacation.id
            }
          });
        }
      }
      
      res.status(201).json(vacation);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Update vacation request status (approve/reject)
  app.patch("/api/vacations/:id", isHeadNurseOrDelegate, async (req, res) => {
    try {
      const vacationId = parseInt(req.params.id);
      
      const statusSchema = z.object({
        approved: z.boolean()
      });
      
      const { approved } = statusSchema.parse(req.body);
      
      const vacation = await storage.getVacationById(vacationId);
      if (!vacation) {
        return res.status(404).json({ message: "Vacation request not found" });
      }
      
      // Update the vacation
      const updatedVacation = await storage.updateVacation(vacationId, {
        approved
      });
      
      if (!updatedVacation) {
        return res.status(404).json({ message: "Vacation request not found" });
      }
      
      // Get staff user to send notification
      const staff = await storage.getStaffById(vacation.staffId);
      if (staff) {
        const staffUser = await storage.getUserById(staff.userId);
        if (staffUser) {
          const startDate = new Date(vacation.startDate).toLocaleDateString('it-IT');
          const endDate = new Date(vacation.endDate).toLocaleDateString('it-IT');
          
          // Create notification
          await storage.createNotification({
            userId: staffUser.id,
            title: `Richiesta ferie ${approved ? "approvata" : "rifiutata"}`,
            message: `La tua richiesta di ferie dal ${startDate} al ${endDate} è stata ${approved ? "approvata" : "rifiutata"}`,
            type: "vacation_status"
          });
          
          // Send push notification
          sendPushNotification(staffUser.id, {
            type: "vacation_status",
            title: `Richiesta ferie ${approved ? "approvata" : "rifiutata"}`,
            message: `La tua richiesta di ferie dal ${startDate} al ${endDate} è stata ${approved ? "approvata" : "rifiutata"}`,
            data: {
              vacationId: vacation.id,
              approved
            }
          });
        }
      }
      
      res.json(updatedVacation);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Generate schedule
  app.post("/api/schedule/generate", isHeadNurseOrDelegate, async (req, res) => {
    try {
      const user = req.user as any;
      
      const scheduleSchema = z.object({
        staffType: z.enum(["nurse", "oss"]),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        considerVacations: z.boolean().default(true),
        considerPartTime: z.boolean().default(true),
        balanceShifts: z.boolean().default(true),
        sendEmail: z.boolean().default(true),
        exportPdf: z.boolean().default(true)
      }).refine(data => data.startDate <= data.endDate, {
        message: "End date must be after start date",
        path: ["endDate"]
      });
      
      const validatedData = scheduleSchema.parse(req.body);
      
      // Generate the schedule
      const shifts = await generateSchedule(
        validatedData.startDate,
        validatedData.endDate,
        validatedData.staffType,
        validatedData.considerVacations,
        validatedData.considerPartTime,
        validatedData.balanceShifts
      );
      
      // Record the schedule generation
      const scheduleGeneration = await storage.createScheduleGeneration({
        generatedBy: user.id,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        staffType: validatedData.staffType,
        parameters: {
          considerVacations: validatedData.considerVacations,
          considerPartTime: validatedData.considerPartTime,
          balanceShifts: validatedData.balanceShifts
        }
      });
      
      // If sendEmail is true, send email to all staff of the specified type
      if (validatedData.sendEmail) {
        const staffList = await storage.listStaffByRole(validatedData.staffType);
        
        for (const staff of staffList) {
          const user = await storage.getUserById(staff.userId);
          if (user) {
            const staffShifts = shifts.filter(shift => shift.staffId === staff.id);
            if (staffShifts.length > 0) {
              await sendScheduleEmail(
                user,
                validatedData.startDate,
                validatedData.endDate,
                staffShifts,
                user.name,
                validatedData.staffType
              );
            }
          }
        }
      }
      
      // Send notification to all staff of the specified type
      const staffList = await storage.listStaffByRole(validatedData.staffType);
      
      const startDate = validatedData.startDate.toLocaleDateString('it-IT');
      const endDate = validatedData.endDate.toLocaleDateString('it-IT');
      
      for (const staff of staffList) {
        const staffUser = await storage.getUserById(staff.userId);
        if (staffUser) {
          // Create notification
          await storage.createNotification({
            userId: staffUser.id,
            title: "Nuovi turni generati",
            message: `Sono stati generati i turni dal ${startDate} al ${endDate}`,
            type: "schedule_generated"
          });
          
          // Send push notification
          sendPushNotification(staffUser.id, {
            type: "schedule_generated",
            title: "Nuovi turni generati",
            message: `Sono stati generati i turni dal ${startDate} al ${endDate}`,
            data: {
              scheduleGenerationId: scheduleGeneration.id
            }
          });
        }
      }
      
      res.status(201).json({
        success: true,
        scheduleGeneration,
        shiftsGenerated: shifts.length
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Get schedule for a specific date range
  app.get("/api/schedule", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      
      const shifts = await storage.listShiftsByDateRange(startDate, endDate);
      
      // Get staff details for each shift
      const staffIds = [...new Set(shifts.map(shift => shift.staffId))];
      const staffDetails: Record<number, any> = {};
      
      for (const staffId of staffIds) {
        const staff = await storage.getStaffById(staffId);
        if (staff) {
          const user = await storage.getUserById(staff.userId);
          if (user) {
            staffDetails[staffId] = {
              id: staffId,
              name: user.name,
              role: staff.role
            };
          }
        }
      }
      
      res.json({
        startDate,
        endDate,
        shifts,
        staffDetails
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Download schedule as PDF
  app.get("/api/schedule/pdf", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      
      const staffType = req.query.staffType as Role || "nurse";
      
      // Get shifts for the date range
      const shifts = await storage.listShiftsByDateRange(startDate, endDate);
      
      // Filter shifts by staff type
      const staffList = await storage.listStaffByRole(staffType);
      const staffIds = staffList.map(staff => staff.id);
      const filteredShifts = shifts.filter(shift => staffIds.includes(shift.staffId));
      
      // Generate PDF
      const title = staffType === "nurse" ? "Infermieri" : "OSS";
      const pdfBuffer = await createPdf(filteredShifts, startDate, endDate, title, staffType);
      
      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition", 
        `attachment; filename=turni_${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}.pdf`
      );
      
      // Send the PDF
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const notifications = await storage.listNotificationsByUserId(user.id);
      
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const user = req.user as any;
      
      const notification = await storage.getNotificationById(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Check if the notification belongs to the user
      if (notification.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Mark as read
      const updatedNotification = await storage.updateNotification(notificationId, {
        read: true
      });
      
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get delegation settings
  app.get("/api/delegations", isHeadNurse, async (req, res) => {
    try {
      const user = req.user as any;
      const delegations = await storage.listDelegationsByHeadNurse(user.id);
      
      // Expand the data with user details
      const expandedDelegations = await Promise.all(delegations.map(async (delegation) => {
        const delegatedTo = await storage.getUserById(delegation.delegatedToId);
        
        return {
          ...delegation,
          delegatedToName: delegatedTo ? delegatedTo.name : "Unknown",
          delegatedToEmail: delegatedTo ? delegatedTo.email : "Unknown"
        };
      }));
      
      res.json(expandedDelegations);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Create delegation
  app.post("/api/delegations", isHeadNurse, async (req, res) => {
    try {
      const user = req.user as any;
      
      const delegationSchema = z.object({
        delegatedToId: z.number(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
      }).refine(data => !data.endDate || data.startDate <= data.endDate, {
        message: "End date must be after start date",
        path: ["endDate"]
      });
      
      const validatedData = delegationSchema.parse({
        ...req.body,
        headNurseId: user.id
      });
      
      // Create delegation
      const delegation = await storage.createDelegation({
        headNurseId: user.id,
        delegatedToId: validatedData.delegatedToId,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        active: true
      });
      
      // Notify the delegated user
      const delegatedTo = await storage.getUserById(validatedData.delegatedToId);
      if (delegatedTo) {
        // Create notification
        await storage.createNotification({
          userId: delegatedTo.id,
          title: "Nuova delega",
          message: `${user.name} ti ha delegato i permessi di gestione turni`,
          type: "delegation"
        });
        
        // Send push notification
        sendPushNotification(delegatedTo.id, {
          type: "delegation",
          title: "Nuova delega",
          message: `${user.name} ti ha delegato i permessi di gestione turni`,
          data: {
            delegationId: delegation.id
          }
        });
      }
      
      // Expand the delegation with user details
      const delegatedToUser = await storage.getUserById(delegation.delegatedToId);
      
      res.status(201).json({
        ...delegation,
        delegatedToName: delegatedToUser ? delegatedToUser.name : "Unknown",
        delegatedToEmail: delegatedToUser ? delegatedToUser.email : "Unknown"
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Update delegation (activate/deactivate)
  app.patch("/api/delegations/:id", isHeadNurse, async (req, res) => {
    try {
      const delegationId = parseInt(req.params.id);
      const user = req.user as any;
      
      const updateSchema = z.object({
        active: z.boolean(),
        endDate: z.coerce.date().optional()
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      const delegation = await storage.getDelegationById(delegationId);
      if (!delegation) {
        return res.status(404).json({ message: "Delegation not found" });
      }
      
      // Check if the delegation belongs to the user
      if (delegation.headNurseId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Update the delegation
      const updatedDelegation = await storage.updateDelegation(delegationId, validatedData);
      
      if (!updatedDelegation) {
        return res.status(404).json({ message: "Delegation not found" });
      }
      
      // Notify the delegated user if the delegation is deactivated
      if (delegation.active && !validatedData.active) {
        const delegatedTo = await storage.getUserById(delegation.delegatedToId);
        if (delegatedTo) {
          // Create notification
          await storage.createNotification({
            userId: delegatedTo.id,
            title: "Delega disattivata",
            message: `${user.name} ha disattivato la tua delega di gestione turni`,
            type: "delegation_deactivated"
          });
          
          // Send push notification
          sendPushNotification(delegatedTo.id, {
            type: "delegation_deactivated",
            title: "Delega disattivata",
            message: `${user.name} ha disattivato la tua delega di gestione turni`,
            data: {
              delegationId: delegation.id
            }
          });
        }
      }
      
      // Expand the delegation with user details
      const delegatedToUser = await storage.getUserById(updatedDelegation.delegatedToId);
      
      res.json({
        ...updatedDelegation,
        delegatedToName: delegatedToUser ? delegatedToUser.name : "Unknown",
        delegatedToEmail: delegatedToUser ? delegatedToUser.email : "Unknown"
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // PWA manifest
  app.get("/manifest.json", (req, res) => {
    res.json({
      name: "NurseScheduler",
      short_name: "NurseScheduler",
      description: "Sistema di gestione turni per infermieri e OSS",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#2196F3",
      icons: [
        {
          "src": "/icons/icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icons/icon-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    });
  });

  // Service worker
  app.get("/service-worker.js", (req, res) => {
    res.sendFile("service-worker.js", { root: "./dist/public" });
  });

  return httpServer;
}
