import React, { useState } from 'react';
import Header from './header';
import Sidebar from './sidebar';
import NotificationsPanel from './notifications-panel';
import { AuthUser } from '../../lib/types';

export interface LayoutProps {
  children: React.ReactNode;
  user: AuthUser;
}

export function Layout({ children, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
  };
  
  return (
    <div className="flex flex-col h-screen">
      <Header 
        onToggleSidebar={toggleSidebar} 
        onToggleNotifications={toggleNotifications} 
        user={user}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {children}
        </main>
      </div>
      
      <NotificationsPanel 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
    </div>
  );
}

export default Layout;
