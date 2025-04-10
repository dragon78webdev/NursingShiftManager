import { useState } from "react";
import { AuthUser } from "@/lib/types";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  user: AuthUser;
  children: React.ReactNode;
}

const Layout = ({ user, children }: LayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header 
        user={user} 
        onMobileMenuClick={toggleMobileMenu} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          user={user} 
          isMobileOpen={isMobileMenuOpen} 
          onCloseMobile={closeMobileMenu} 
        />
        
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-4 pt-0 lg:p-6 lg:pt-0 w-full lg:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
