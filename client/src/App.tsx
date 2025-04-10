import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import Requests from "@/pages/requests";
import Generate from "@/pages/generate";
import Staff from "@/pages/staff";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Login from "@/pages/auth/login";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, [key: string]: any }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }
  
  return <Component {...rest} />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {isAuthenticated ? (
          <Layout>
            <Dashboard />
          </Layout>
        ) : (
          <Login />
        )}
      </Route>
      
      <Route path="/calendar">
        <Layout>
          <ProtectedRoute component={Calendar} />
        </Layout>
      </Route>
      
      <Route path="/requests">
        <Layout>
          <ProtectedRoute component={Requests} />
        </Layout>
      </Route>
      
      <Route path="/generate">
        <Layout>
          <ProtectedRoute component={Generate} />
        </Layout>
      </Route>
      
      <Route path="/staff">
        <Layout>
          <ProtectedRoute component={Staff} />
        </Layout>
      </Route>
      
      <Route path="/reports">
        <Layout>
          <ProtectedRoute component={Reports} />
        </Layout>
      </Route>
      
      <Route path="/settings">
        <Layout>
          <ProtectedRoute component={Settings} />
        </Layout>
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    // Setup WebSocket connection for real-time notifications
    if (user) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      ws.onopen = () => {
        setWsConnected(true);
        console.log('WebSocket connection established');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle notifications based on type
          if (data.type === 'NEW_SHIFT_REQUEST' || 
              data.type === 'SHIFT_REQUEST_STATUS_UPDATED' || 
              data.type === 'SCHEDULES_GENERATED') {
            // Create a notification if permission is granted
            if (Notification.permission === 'granted') {
              const notification = new Notification('NurseScheduler', {
                body: data.message || 'Hai una nuova notifica',
                icon: 'https://cdn-icons-png.flaticon.com/512/3974/3974880.png'
              });
              
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }
            
            // Update query cache if needed
            if (data.type === 'NEW_SHIFT_REQUEST' || data.type === 'SHIFT_REQUEST_STATUS_UPDATED') {
              queryClient.invalidateQueries({ queryKey: ['/api/shift-requests'] });
            } else if (data.type === 'SCHEDULES_GENERATED') {
              queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        setWsConnected(false);
        console.log('WebSocket connection closed');
      };
      
      return () => {
        ws.close();
      };
    }
  }, [user]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
