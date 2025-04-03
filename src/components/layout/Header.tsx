
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Header: React.FC = () => {
  const { isMobile } = useIsMobile();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          {isMobile ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <AppSidebar />
              </SheetContent>
            </Sheet>
          ) : null}
          <a href="/" className="hidden items-center space-x-2 lg:flex">
            <span className="hidden font-bold sm:inline-block">
              Flow Meter Monitoring System
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <ModeToggle />
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
