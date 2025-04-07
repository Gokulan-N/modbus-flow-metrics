
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Database, ServerCrash, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SystemSettings {
  id: number;
  data_logging_interval: number;
  data_retention_period: number;
  alarm_notification_email: string;
  backup_schedule: string;
  auto_update: boolean;
  data_db_type: "sqlite" | "mysql";
  updated_at: string;
}

interface SystemStatus {
  status: string;
  uptime: string;
  sqlite_status: string;
  mysql_status: string;
  devices: {
    total: number;
    enabled: number;
  };
  disk_usage: {
    database: string;
    logs: string;
  };
  version: string;
}

const DatabaseSettings: React.FC = () => {
  const { toast } = useToast();
  const [dbType, setDbType] = useState<"sqlite" | "mysql">("sqlite");
  const [mysqlHost, setMysqlHost] = useState("");
  const [mysqlUser, setMysqlUser] = useState("");
  const [mysqlPassword, setMysqlPassword] = useState("");
  const [mysqlDatabase, setMysqlDatabase] = useState("");

  // Fetch current system settings
  const { 
    data: settings,
    isLoading: isLoadingSettings
  } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await fetch('/api/system/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      const data = await response.json();
      return data.settings as SystemSettings;
    },
    onSuccess: (data) => {
      setDbType(data.data_db_type);
    }
  });

  // Fetch system status
  const { 
    data: status,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const response = await fetch('/api/system/status');
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      const data = await response.json();
      return data as SystemStatus;
    }
  });

  // Mutation for updating database settings
  const mutation = useMutation({
    mutationFn: async (newSettings: {
      data_db_type: string;
      mysql_host?: string;
      mysql_user?: string;
      mysql_pass?: string;
      mysql_db_name?: string;
    }) => {
      const response = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update database settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Database Settings Updated",
        description: "Your database configuration has been saved.",
      });
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSaveSettings = () => {
    const newSettings: any = {
      data_db_type: dbType
    };
    
    if (dbType === "mysql") {
      newSettings.mysql_host = mysqlHost;
      newSettings.mysql_user = mysqlUser;
      newSettings.mysql_pass = mysqlPassword;
      newSettings.mysql_db_name = mysqlDatabase;
    }
    
    mutation.mutate(newSettings);
  };

  const isLoading = isLoadingSettings || isLoadingStatus || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Configuration</CardTitle>
        <CardDescription>Configure which database to use for data storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {status?.mysql_status === "error" && dbType === "mysql" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cannot connect to MySQL database. Please check your configuration and ensure the MySQL server is running.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="db-type">Database Type</Label>
            <Select value={dbType} onValueChange={(value: "sqlite" | "mysql") => setDbType(value)}>
              <SelectTrigger id="db-type">
                <SelectValue placeholder="Select database type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sqlite">
                  <div className="flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    SQLite (embedded)
                  </div>
                </SelectItem>
                <SelectItem value="mysql">
                  <div className="flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    MySQL
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Database status indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 p-2 border rounded-md">
              <div className={`w-2 h-2 rounded-full ${status?.sqlite_status === "connected" ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm">SQLite:</span>
              <span className="text-sm font-medium">
                {status?.sqlite_status === "connected" ? "Connected" : "Disconnected"}
              </span>
              {!isLoadingStatus && status?.disk_usage?.database && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {status?.disk_usage?.database}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 p-2 border rounded-md">
              <div className={`w-2 h-2 rounded-full ${status?.mysql_status === "connected" ? "bg-green-500" : status?.mysql_status === "error" ? "bg-red-500" : "bg-yellow-500"}`}></div>
              <span className="text-sm">MySQL:</span>
              <span className="text-sm font-medium">
                {status?.mysql_status === "connected" 
                  ? "Connected" 
                  : status?.mysql_status === "error" 
                  ? "Error" 
                  : "Not Configured"}
              </span>
            </div>
          </div>

          {dbType === "mysql" && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mysql-host">MySQL Host</Label>
                  <Input
                    id="mysql-host"
                    placeholder="localhost"
                    value={mysqlHost}
                    onChange={(e) => setMysqlHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mysql-database">Database Name</Label>
                  <Input
                    id="mysql-database"
                    placeholder="flowmeter"
                    value={mysqlDatabase}
                    onChange={(e) => setMysqlDatabase(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mysql-user">Username</Label>
                  <Input
                    id="mysql-user"
                    placeholder="root"
                    value={mysqlUser}
                    onChange={(e) => setMysqlUser(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mysql-password">Password</Label>
                  <Input
                    id="mysql-password"
                    type="password"
                    placeholder="********"
                    value={mysqlPassword}
                    onChange={(e) => setMysqlPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Help text */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p className="mb-2">
              <strong>Database configuration:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>SQLite (default): All data stored in a single file. Simple, no configuration needed.</li>
              <li>MySQL: Flow meter data and alarm events stored in MySQL database. Configuration required.</li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveSettings} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Database Configuration"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DatabaseSettings;
