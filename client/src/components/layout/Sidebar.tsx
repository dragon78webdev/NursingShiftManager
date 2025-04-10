import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AuthUser } from "@/lib/types";
import { 
  Home, 
  Calendar, 
  Users, 
  Repeat2, 
  Umbrella, 
  BarChart2, 
  Settings, 
  UserCheck, 
  Search,
  HelpCircle
} from "lucide-react";

interface SidebarProps {
  user: AuthUser;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const Sidebar = ({ user, isMobileOpen, onCloseMobile }: SidebarProps) => {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const isHeadNurse = user.role === "head_nurse";

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Gestione Turni", href: "/schedule", icon: Calendar },
    { name: "Personale", href: "/staff", icon: Users, adminOnly: true },
    { name: "Richieste Cambio", href: "/change-requests", icon: Repeat2 },
    { name: "Ferie & Permessi", href: "/vacations", icon: Umbrella },
    { name: "Report", href: "/reports", icon: BarChart2 },
  ];

  const adminNavigation = [
    { name: "Impostazioni", href: "/settings", icon: Settings },
    { name: "Gestione Deleghe", href: "/delegates", icon: UserCheck, adminOnly: true },
  ];

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <>
      <aside className={`sidebar bg-white w-64 shadow-md flex-shrink-0 border-r border-neutral-200 h-full flex-col z-20 fixed inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <nav className="h-full flex flex-col">
          <div className="p-4">
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Cerca..."
                className="pl-10 pr-4 py-2 w-full border border-neutral-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ul className="px-2">
              {navigation.map((item) => {
                if (item.adminOnly && !isHeadNurse) return null;
                
                return (
                  <li key={item.name} className="mt-1 first:mt-0">
                    <Link href={item.href}>
                      <a
                        onClick={(e) => {
                          if (isMobileOpen) onCloseMobile();
                        }}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                          isActive(item.href)
                            ? "bg-primary-light text-primary-dark font-medium"
                            : "text-neutral-700 hover:bg-neutral-100"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
            
            {isHeadNurse && (
              <>
                <div className="px-4 py-2 mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Amministrazione
                  </h3>
                </div>
                
                <ul className="px-2">
                  {adminNavigation.map((item) => {
                    if (item.adminOnly && !isHeadNurse) return null;
                    
                    return (
                      <li key={item.name} className="mt-1 first:mt-0">
                        <Link href={item.href}>
                          <a
                            onClick={(e) => {
                              if (isMobileOpen) onCloseMobile();
                            }}
                            className={cn(
                              "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                              isActive(item.href)
                                ? "bg-primary-light text-primary-dark font-medium"
                                : "text-neutral-700 hover:bg-neutral-100"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </a>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          
          <div className="p-3 border-t border-neutral-200">
            <div className="p-card bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
              <div className="p-2 text-center">
                <p className="text-xs text-neutral-600">Hai bisogno di aiuto?</p>
                <button className="flex items-center justify-center space-x-1 text-primary hover:bg-neutral-100 text-xs py-1 mt-1 w-full rounded transition-colors">
                  <HelpCircle className="h-3 w-3" />
                  <span>Supporto</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </aside>
      
      {/* Mobile overlay */}
      <div 
        className={`mobile-menu-overlay fixed inset-0 bg-neutral-900 bg-opacity-50 z-10 lg:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
        onClick={onCloseMobile}
      />
    </>
  );
};

export default Sidebar;
