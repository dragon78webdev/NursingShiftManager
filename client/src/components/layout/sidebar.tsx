import React from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Calendar, 
  RefreshCw, 
  Cog, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      logout();
      setLocation('/login');
      toast({
        title: 'Logout effettuato',
        description: 'Hai effettuato il logout con successo',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore durante il logout',
        description: 'Si è verificato un errore durante il logout',
      });
    }
  };

  const isHeadNurse = user?.role === 'head_nurse';
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home className="h-5 w-5 mr-3" /> },
    { path: '/calendar', label: 'Calendario Turni', icon: <Calendar className="h-5 w-5 mr-3" /> },
    { path: '/requests', label: 'Richieste Cambio', icon: <RefreshCw className="h-5 w-5 mr-3" /> },
    // Only show if user is head nurse or has delegation
    ...(isHeadNurse ? [
      { path: '/generate', label: 'Genera Turni', icon: <Cog className="h-5 w-5 mr-3" /> },
      { path: '/staff', label: 'Gestione Personale', icon: <Users className="h-5 w-5 mr-3" /> }
    ] : []),
    { path: '/reports', label: 'Report', icon: <BarChart3 className="h-5 w-5 mr-3" /> }
  ];

  // Handle navigation clicks on mobile to close sidebar
  const handleNavClick = (path: string) => {
    setLocation(path);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-600 bg-opacity-50 z-20 md:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "w-64 bg-white border-r border-gray-200 pt-5 pb-4 flex flex-col h-full",
          "transform transition-transform duration-300 ease-in-out",
          "fixed md:static z-30",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="px-4">
          <div className="flex items-center px-4 py-3 mb-6 bg-blue-50 text-primary rounded-md">
            <Calendar className="mr-3 text-xl" />
            <span className="font-medium">Turni & Scheduling</span>
          </div>
        </div>
        
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => handleNavClick(item.path)}
            >
              <a 
                className={cn(
                  "group flex items-center px-4 py-2 text-sm font-medium rounded-md",
                  location === item.path
                    ? "bg-blue-50 text-primary"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {item.icon}
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
        
        <div className="px-4 mt-6">
          <div className="pt-4 border-t border-gray-200">
            <Link href="/settings" onClick={() => handleNavClick('/settings')}>
              <a className="group flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50">
                <Settings className="h-5 w-5 mr-3" />
                Impostazioni
              </a>
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full mt-2 group flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Esci
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
