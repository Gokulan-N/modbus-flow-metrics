
import React from "react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, UserCog } from "lucide-react";
import { useFlowData } from "@/context/FlowDataContext";

const Header: React.FC = () => {
  const { isAuthenticated, userRole, logout } = useAuth();
  const { connectedIds } = useFlowData();
  const navigate = useNavigate();
  
  const hasActiveConnections = connectedIds.length > 0;
  
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <div className="flex items-center gap-2 font-semibold">
          <span className="hidden sm:inline-block">Flow Meter Monitoring System</span>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          {isAuthenticated && (
            <>
              <Badge 
                variant={hasActiveConnections ? "success" : "destructive"}
              >
                {hasActiveConnections ? "Connected" : "Disconnected"}
              </Badge>
              
              <div className="flex items-center gap-2">
                {userRole === "admin" ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <UserCog className="h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Client
                  </Badge>
                )}
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
          
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
