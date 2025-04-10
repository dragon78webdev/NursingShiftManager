import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { storage } from './storage';
import { InsertUser } from '@shared/schema';

// Configure auth strategies
export function setupAuth(app: any) {
  // Use Local Strategy for development
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // For demo, we'll just check if a user with the email exists or create one
          let user = await storage.getUserByEmail(email);
          
          if (!user) {
            // Create a new user if not found
            const newUser: InsertUser = {
              googleId: `local_${Date.now()}`, // Mock ID for local auth
              email,
              name: email.split('@')[0], // Use part of email as name
              role: 'nurse', // Default role, can be updated later
              department: 'General', // Default department
              facility: 'Main Hospital', // Default facility
            };
            
            user = await storage.createUser(newUser);
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  // Keep Google Strategy configuration for production use
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists
            const existingUser = await storage.getUserByGoogleId(profile.id);
            
            if (existingUser) {
              // Return existing user
              return done(null, existingUser);
            }
            
            // Create new user
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google profile'));
            }
            
            // Create a new user without role, department and facility
            // These will be set during first login
            const newUser: InsertUser = {
              googleId: profile.id,
              email,
              name: profile.displayName,
              role: 'nurse', // Default role, will be updated during first login
              department: '', // Will be updated during first login
              facility: '', // Will be updated during first login
            };
            
            const createdUser = await storage.createUser(newUser);
            return done(null, createdUser);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }
  
  // Serialize user for the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
  return passport;
}

// Check if user is authenticated
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

// Check if user is a head nurse
export const isHeadNurse = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === 'head_nurse') {
    return next();
  }
  res.status(403).json({ message: 'Not authorized' });
};

// Check if user is a delegate or head nurse
export const isHeadNurseOrDelegate = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // If user is head nurse, proceed
  if (req.user.role === 'head_nurse') {
    return next();
  }
  
  // Check if user is a delegate
  const activeDelegations = await storage.listActiveDelegations();
  const isDelegate = activeDelegations.some(d => d.delegatedToId === req.user.id);
  
  if (isDelegate) {
    return next();
  }
  
  res.status(403).json({ message: 'Not authorized' });
};
