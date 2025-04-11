import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { checkAuth, needsFirstLogin } from "./lib/auth";
import { AuthUser } from "./lib/types";
import { setupNotificationWebSocket, requestNotificationPermission, showNotification } from "./lib/pwa";

// Pages
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Staff from "./pages/Staff";
import ChangeRequests from "./pages/ChangeRequests";
import Vacations from "./pages/Vacations";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Delegates from "./pages/Delegates";
import NotFound from "./pages/not-found";

// Components
import Layout from "./components/layout/layout";
import FirstLoginDialog from "./components/dialogs/FirstLoginDialog";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFirstLogin, setShowFirstLogin] = useState(false);
  const [_, navigate] = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      const user = await checkAuth();
      setUser(user);
      setLoading(false);

      // Check if first login
      if (user && needsFirstLogin()) {
        setShowFirstLogin(true);
        // Remove the query parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Request notification permission (disabled for now to fix connectivity issues)
      if (user) {
        const hasPermission = await requestNotificationPermission();
        console.log("Notification permission:", hasPermission ? "granted" : "denied");
        
        // WebSocket connectivity temporarily disabled while fixing issues
        console.log("WebSocket connectivity disabled for debugging");
        
        /*
        // Setup WebSocket for push notifications
        setupNotificationWebSocket(user.id, (notification) => {
          // Show notification
          showNotification(notification.title, {
            body: notification.message,
            data: notification.data,
          });
        });
        */
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-light p-4 rounded-full">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-10 w-10 text-primary"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M10 2v6" />
                  <path d="M14 2v6" />
                  <path d="M3 10h18" />
                  <path d="M9 16H5a2 2 0 0 0-2 2v4" />
                  <path d="M19 22a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4" />
                  <circle cx="12" cy="15" r="4" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">NurseScheduler</h1>
            <p className="text-gray-600">Sistema di gestione turni per personale infermieristico</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = "/api/auth/google"}
              className="w-full flex items-center justify-center bg-white border border-gray-300 rounded-md shadow-sm py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="#4285F4"
                />
                <path
                  d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="#34A853"
                  clipPath="url(#b)"
                  transform="translate(0 6)"
                />
                <path
                  d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="#FBBC05"
                  clipPath="url(#c)"
                  transform="translate(0 12)"
                />
                <path
                  d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="#EA4335"
                  clipPath="url(#d)"
                  transform="translate(0 18)"
                />
              </svg>
              Accedi con Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Oppure</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = formData.get('email') as string;
                const password = formData.get('password') as string;
                
                fetch('/api/auth/login', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ email, password }),
                })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    // Redirect to dashboard or show first login dialog
                    if (data.firstLogin) {
                      window.location.href = "/?firstLogin=true";
                    } else {
                      window.location.href = "/";
                    }
                  } else {
                    alert('Login failed: ' + (data.error || 'Unknown error'));
                  }
                })
                .catch(err => {
                  console.error('Login error:', err);
                  alert('Login failed. Please try again.');
                });
              }}
              className="space-y-2"
            >
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  defaultValue="admin@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  defaultValue="password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Accedi
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Layout user={user}>
        <Switch>
          <Route path="/">
            {() => <Dashboard userRole={user?.role || "nurse"} />}
          </Route>
          <Route path="/schedule">
            {() => <Schedule />}
          </Route>
          <Route path="/staff">
            {() => <Staff />}
          </Route>
          <Route path="/change-requests">
            {() => <ChangeRequests />}
          </Route>
          <Route path="/vacations">
            {() => <Vacations />}
          </Route>
          <Route path="/reports">
            {() => <Reports />}
          </Route>
          <Route path="/settings">
            {() => <Settings />}
          </Route>
          <Route path="/delegates">
            {() => <Delegates />}
          </Route>
          <Route>
            {() => <NotFound />}
          </Route>
        </Switch>
      </Layout>
      
      {showFirstLogin && (
        <FirstLoginDialog 
          onComplete={(updatedUser) => {
            setUser(updatedUser);
            setShowFirstLogin(false);
          }}
          onClose={() => setShowFirstLogin(false)}
        />
      )}
      
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
