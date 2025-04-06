
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-2">
                  {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <div className="flex items-center mb-4">
                  <div className="flex items-center h-8 w-8 overflow-hidden rounded-md bg-primary mr-2">
                    <span className="font-bold text-white text-lg w-full text-center">F</span>
                  </div>
                  <span className="font-bold text-lg">FlexiFlow</span>
                </div>
                <AppSidebar />
              </SheetContent>
            </Sheet>
          )}
          <div className="flex items-center space-x-2">
            <div className={cn(
              "hidden items-center h-8 w-8 overflow-hidden rounded-md bg-primary mr-1",
              isMobile ? "hidden" : "flex"
            )}>
              <span className="font-bold text-white text-lg w-full text-center">F</span>
            </div>
            <span className={cn(
              "font-bold text-lg",
              isMobile ? "text-sm" : "text-base"
            )}>
              FlexiFlow
            </span>
          </div>
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
