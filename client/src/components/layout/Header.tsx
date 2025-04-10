import { useState, useEffect, useRef } from "react";
import { Bell, Menu, LogOut, User, Settings } from "lucide-react";
import { AuthUser, Notification } from "@/lib/types";
import { logout } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface HeaderProps {
  user: AuthUser;
  onMobileMenuClick: () => void;
}

const Header = ({ user, onMobileMenuClick }: HeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Get notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Count unread notifications
  const unreadCount = notifications.filter((notification: Notification) => !notification.read).length;

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Mark notification as read
  const markAsRead = async (id: number) => {
    try {
      await apiRequest("PATCH", `/api/notifications/${id}`, { read: true });
      refetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Format notification timestamp
  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ore fa`;
    } else if (diffDays === 1) {
      return `ieri`;
    } else {
      return date.toLocaleDateString('it-IT');
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'change_request':
        return (
          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
            <Repeat2 className="h-4 w-4 text-red-500" />
          </div>
        );
      case 'schedule_generated':
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-green-600" />
          </div>
        );
      case 'vacation_request':
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <Umbrella className="h-4 w-4 text-yellow-600" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" />
          </div>
        );
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user.name) return "";
    
    const nameParts = user.name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  // Get role in Italian
  const getRoleInItalian = (role: string) => {
    switch (role) {
      case 'nurse': return 'Infermiere';
      case 'oss': return 'OSS';
      case 'head_nurse': return 'Caposala';
      default: return role;
    }
  };

  return (
    <header className="bg-primary text-white shadow-md z-10 sticky top-0">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded lg:hidden text-white"
            onClick={onMobileMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
          <a href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6" />
            <span className="font-bold text-xl">NurseScheduler</span>
          </a>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:block">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs block opacity-75">{getRoleInItalian(user.role)}</span>
          </div>
          
          <div className="relative" ref={notificationsRef}>
            <button 
              className="p-2 rounded hover:bg-primary-dark relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute top-0 right-0 min-w-[1rem] h-4 px-1 flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-medium text-gray-800">Notifiche</h3>
                  <span className="text-xs text-gray-500">
                    {unreadCount} non lette
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Nessuna notifica
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {notifications.map((notification: Notification) => (
                        <li 
                          key={notification.id}
                          className={cn(
                            "p-3 hover:bg-gray-50 cursor-pointer",
                            !notification.read && "bg-blue-50"
                          )}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex">
                            <div className="flex-shrink-0 mr-3">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatNotificationTime(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <button 
                    className="w-full text-xs text-primary hover:text-primary-dark text-center py-1"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <div className="h-8 w-8 rounded-full bg-primary-light overflow-hidden flex items-center justify-center">
                {user.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt={user.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-sm text-primary">
                    {getUserInitials()}
                  </span>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profilo</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Impostazioni</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
