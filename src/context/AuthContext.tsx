
import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

type UserRole = "admin" | "client" | null;

interface AuthContextProps {
  isAuthenticated: boolean;
  userRole: UserRole;
  login: (username: string, password: string, role: UserRole) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const { toast } = useToast();

  // Check for existing session on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("flowMeterUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUserRole(user.role);
      } catch (error) {
        localStorage.removeItem("flowMeterUser");
      }
    }
  }, []);

  // Set up credentials for admin and client roles
  // In a real app, this would be connected to a secure backend
  const adminCredentials = {
    username: "admin",
    password: "admin123",
  };

  const clientCredentials = {
    username: "client",
    password: "client123",
  };

  const login = (username: string, password: string, role: UserRole): boolean => {
    let isValid = false;

    if (role === "admin") {
      isValid = username === adminCredentials.username && password === adminCredentials.password;
    } else if (role === "client") {
      isValid = username === clientCredentials.username && password === clientCredentials.password;
    }

    if (isValid) {
      setIsAuthenticated(true);
      setUserRole(role);
      localStorage.setItem("flowMeterUser", JSON.stringify({ username, role }));
      
      toast({
        title: "Login Successful",
        description: `Welcome, ${username}!`,
      });
      
      return true;
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem("flowMeterUser");
    
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
