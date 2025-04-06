
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, UserCog, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "admin">("client");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await login(username, password);
      
      if (success) {
        navigate("/");
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid username or password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Flow Meter Dashboard</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the monitoring system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="client" onValueChange={(value) => setRole(value as "client" | "admin")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="client" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Client
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="client">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-username">Username</Label>
                  <Input 
                    id="client-username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Password</Label>
                  <Input 
                    id="client-password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in as Client"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="admin">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username">Admin Username</Label>
                  <Input 
                    id="admin-username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Input 
                    id="admin-password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in as Admin"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-xs text-muted-foreground text-center w-full">
            <p>Client credentials: client / client123</p>
            <p>Admin credentials: admin / admin123</p>
            <p className="mt-2 text-xs text-muted-foreground">For demo purposes only. Use secure credentials in production.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
