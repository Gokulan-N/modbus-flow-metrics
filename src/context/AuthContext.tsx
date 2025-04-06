
import React, { createContext, useContext, useState, useEffect } from "react";

type User = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "operator" | "viewer";
};

export type AuthContextProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  user: User | null;
  userRole: string;
};

const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  user: null,
  userRole: "",
});

export const useAuth = () => useContext(AuthContext);

// Mock user data
const MOCK_USERS = {
  admin: {
    id: "1",
    username: "admin",
    email: "admin@example.com",
    role: "admin" as const,
    password: "admin123"
  },
  client: {
    id: "2",
    username: "client",
    email: "client@example.com",
    role: "viewer" as const,
    password: "client123"
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse stored user", e);
          localStorage.removeItem("user");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Check against our mock users
    return new Promise((resolve) => {
      setTimeout(() => {
        // Check if username exists in our mock data
        const lowerUsername = username.toLowerCase();
        if (
          (lowerUsername === "admin" && password === MOCK_USERS.admin.password) || 
          (lowerUsername === "client" && password === MOCK_USERS.client.password)
        ) {
          const userData = lowerUsername === "admin" ? 
            MOCK_USERS.admin : 
            MOCK_USERS.client;
          
          // Remove password before storing
          const { password: _, ...userToStore } = userData;
          
          setUser(userToStore);
          localStorage.setItem("user", JSON.stringify(userToStore));
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        user,
        userRole: user?.role || "",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
