import React, { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { NotificationsBadge } from '../../components/ui/notifications-badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { Menu } from 'lucide-react';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { useLocation } from 'wouter';

import { AuthUser } from '../../lib/types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleNotifications: () => void;
  user: AuthUser;
}

export function Header({ onToggleSidebar, onToggleNotifications, user }: HeaderProps) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
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
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'nurse': return 'Infermiere';
      case 'oss': return 'OSS';
      case 'head_nurse': return 'Caposala';
      default: return role;
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="p-2 mr-2 md:hidden rounded-md hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">NurseScheduler</h1>
        </div>
        
        <div className="flex items-center">
          <NotificationsBadge onClick={onToggleNotifications} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center ml-4 cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.imageUrl || ''} alt={user?.name || 'User'} />
                  <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
                </Avatar>
                <div className="ml-2 hidden md:block">
                  <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role ? getRoleLabel(user.role) : '-'}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center p-2 md:hidden">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500 ml-auto">{user?.role ? getRoleLabel(user.role) : '-'}</p>
              </div>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem onSelect={() => setLocation('/settings')}>
                Impostazioni
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Header;
