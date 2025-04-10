import { AuthUser } from "./types";

// Check if user is authenticated
export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/user", {
      credentials: "include"
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error checking authentication:", error);
    return null;
  }
}

// Login with Google
export function loginWithGoogle() {
  window.location.href = "/api/auth/google";
}

// Login with email (for development)
export async function loginWithEmail(email: string, password: string): Promise<{ success: boolean; firstLogin: boolean; error?: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password }),
      credentials: "include"
    });
    
    if (!response.ok) {
      return { 
        success: false, 
        firstLogin: false,
        error: "Login failed. Invalid credentials."
      };
    }
    
    const data = await response.json();
    return {
      success: data.success,
      firstLogin: data.firstLogin
    };
  } catch (error) {
    console.error("Error logging in:", error);
    return { 
      success: false, 
      firstLogin: false,
      error: "An error occurred during login."
    };
  }
}

// Logout
export async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    
    window.location.href = "/";
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

// Complete first login profile
export async function completeProfile(data: {
  role: string;
  department: string;
  facility: string;
}): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data),
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error("Failed to complete profile");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error completing profile:", error);
    return null;
  }
}

// Check if a user needs to complete first login
export function needsFirstLogin(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("firstLogin") === "true";
}
