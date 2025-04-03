
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFlowData } from "@/context/FlowDataContext";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Server, 
  Activity, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Pause, 
  Cable, 
  ChevronsUpDown,
  Gauge,
  BarChartHorizontal,
  FileUp,
  FileDown
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Define the schema for Modbus Connection
const modbusConnectionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  ipAddress: z.string().min(1, "IP Address is required"),
  port: z.number().min(1, "Port is required"),
  slaveId: z.number().min(1, "Unit ID is required"),
  protocol: z.enum(["tcp", "rtu", "rtuovertcp"]),
  enabled: z.boolean().default(true),
  pollRate: z.number().min(1000, "Poll rate must be at least 1000ms"),
  flowMeterId: z.number().int().nonnegative(),
  registers: z.array(z.object({
    id: z.number(),
    address: z.number().min(0, "Address must be non-negative"),
    type: z.enum(["flowRate", "totalFlow"]),
    dataType: z.enum(["int16", "int32", "float32", "float64"]),
    multiplier: z.number().default(1),
    description: z.string().optional(),
  })).min(1, "At least one register is required"),
});

type ModbusConnection = z.infer<typeof modbusConnectionSchema>;

// Mock registers for demonstration
const DEFAULT_REGISTERS = [
  { id: 1, address: 3000, type: "flowRate", dataType: "float32", multiplier: 1, description: "Flow Rate" },
  { id: 2, address: 3002, type: "totalFlow", dataType: "float32", multiplier: 1, description: "Total Flow" }
];

const ConfigurationPage: React.FC = () => {
  const { flowMeters, connectedIds, connectFlowMeter, disconnectFlowMeter } = useFlowData();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentConnectionId, setCurrentConnectionId] = useState<number | null>(null);
  const [modbusConnections, setModbusConnections] = useState<ModbusConnection[]>([]);
  const [activeTab, setActiveTab] = useState("connections");
  
  useEffect(() => {
    // Initialize with mock connections if empty
    if (modbusConnections.length === 0) {
      // Create one connection per flow meter
      const initialConnections = flowMeters.map((meter, index) => ({
        id: index + 1,
        name: meter.name,
        ipAddress: "192.168.1.100",
        port: 502,
        slaveId: index + 1,
        protocol: "tcp" as const,
        enabled: true,
        pollRate: 1000,
        flowMeterId: meter.id,
        registers: [...DEFAULT_REGISTERS]
      }));
      
      setModbusConnections(initialConnections);
    }
  }, [flowMeters]);
  
  const form = useForm<ModbusConnection>({
    resolver: zodResolver(modbusConnectionSchema),
    defaultValues: {
      name: "",
      ipAddress: "192.168.1.100",
      port: 502,
      slaveId: 1,
      protocol: "tcp",
      enabled: true,
      pollRate: 1000,
      flowMeterId: flowMeters.length > 0 ? flowMeters[0].id : 0,
      registers: [...DEFAULT_REGISTERS]
    }
  });
  
  const openAddDialog = () => {
    setIsEditMode(false);
    setCurrentConnectionId(null);
    
    const nextId = modbusConnections.length > 0 
      ? Math.max(...modbusConnections.map(c => c.id || 0)) + 1 
      : 1;
    
    form.reset({
      id: nextId,
      name: `Connection ${nextId}`,
      ipAddress: "192.168.1.100",
      port: 502,
      slaveId: 1,
      protocol: "tcp",
      enabled: true,
      pollRate: 1000,
      flowMeterId: flowMeters.length > 0 ? flowMeters[0].id : 0,
      registers: [...DEFAULT_REGISTERS]
    });
    
    setIsAddDialogOpen(true);
  };
  
  const openEditDialog = (connection: ModbusConnection) => {
    setIsEditMode(true);
    setCurrentConnectionId(connection.id || null);
    form.reset({
      ...connection,
    });
    setIsAddDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setTimeout(() => form.reset(), 100);
  };
  
  const onSubmit = (data: ModbusConnection) => {
    if (isEditMode && currentConnectionId !== null) {
      // Update existing connection
      setModbusConnections(prev => 
        prev.map(conn => conn.id === currentConnectionId ? { ...data } : conn)
      );
      
      toast({
        title: "Connection Updated",
        description: `${data.name} has been updated successfully`,
      });
    } else {
      // Add new connection
      setModbusConnections(prev => [...prev, { ...data }]);
      
      toast({
        title: "Connection Added",
        description: `${data.name} has been added successfully`,
      });
    }
    
    closeDialog();
  };
  
  const handleDeleteConnection = (id: number) => {
    // First disconnect if connected
    const connection = modbusConnections.find(c => c.id === id);
    if (connection && connectedIds.includes(connection.flowMeterId)) {
      disconnectFlowMeter(connection.flowMeterId);
    }
    
    // Then remove from list
    setModbusConnections(prev => prev.filter(conn => conn.id !== id));
    
    toast({
      title: "Connection Deleted",
      description: "The Modbus connection has been removed"
    });
  };
  
  const handleConnectionToggle = (connection: ModbusConnection) => {
    const flowMeterId = connection.flowMeterId;
    
    if (connectedIds.includes(flowMeterId)) {
      disconnectFlowMeter(flowMeterId);
      
      toast({
        title: "Disconnected",
        description: `${connection.name} has been disconnected`
      });
    } else {
      connectFlowMeter(flowMeterId);
      
      toast({
        title: "Connected",
        description: `${connection.name} has been connected successfully`
      });
    }
  };
  
  const handleConnectAll = () => {
    // Connect all enabled connections that aren't already connected
    modbusConnections.forEach(connection => {
      if (connection.enabled && !connectedIds.includes(connection.flowMeterId)) {
        connectFlowMeter(connection.flowMeterId);
      }
    });
    
    toast({
      title: "All Connections Started",
      description: "All enabled Modbus connections have been started"
    });
  };
  
  const handleDisconnectAll = () => {
    // Disconnect all connections
    connectedIds.forEach(id => {
      disconnectFlowMeter(id);
    });
    
    toast({
      title: "All Connections Stopped",
      description: "All Modbus connections have been stopped"
    });
  };
  
  const getConnectionStatus = (flowMeterId: number) => {
    return connectedIds.includes(flowMeterId) ? "connected" : "disconnected";
  };
  
  const updateRegisterField = (index: number, field: string, value: any) => {
    const registers = form.getValues('registers');
    registers[index] = { ...registers[index], [field]: value };
    form.setValue('registers', registers);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Configuration</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDisconnectAll}
            disabled={connectedIds.length === 0}
          >
            <Pause className="mr-2 h-4 w-4" />
            Stop All
          </Button>
          <Button 
            onClick={handleConnectAll}
            disabled={modbusConnections.filter(c => c.enabled).length === 0 || 
              connectedIds.length === modbusConnections.filter(c => c.enabled).length}
          >
            <Play className="mr-2 h-4 w-4" />
            Start All
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="connections">
            <Server className="mr-2 h-4 w-4" />
            Modbus Connections
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Modbus Device Connections</CardTitle>
                <CardDescription>
                  Configure and manage your Modbus device connections
                </CardDescription>
              </div>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Flow Meter</TableHead>
                    <TableHead>Connection</TableHead>
                    <TableHead>Poll Rate</TableHead>
                    <TableHead>Registers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modbusConnections.map((connection) => {
                    const status = getConnectionStatus(connection.flowMeterId);
                    const flowMeter = flowMeters.find(fm => fm.id === connection.flowMeterId);
                    
                    return (
                      <TableRow key={connection.id}>
                        <TableCell>
                          <Badge 
                            variant={status === "connected" ? "success" : "secondary"}
                            className="capitalize"
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{connection.name}</TableCell>
                        <TableCell>{flowMeter ? flowMeter.name : 'Unknown'}</TableCell>
                        <TableCell>
                          {connection.ipAddress}:{connection.port} (ID: {connection.slaveId})
                        </TableCell>
                        <TableCell>{connection.pollRate}ms</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {connection.registers.some(r => r.type === "flowRate") && (
                              <Badge variant="outline">
                                <Gauge className="mr-1 h-3 w-3" />
                                Flow Rate
                              </Badge>
                            )}
                            {connection.registers.some(r => r.type === "totalFlow") && (
                              <Badge variant="outline">
                                <BarChartHorizontal className="mr-1 h-3 w-3" />
                                Total
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              title={status === "connected" ? "Disconnect" : "Connect"}
                              onClick={() => handleConnectionToggle(connection)}
                            >
                              {status === "connected" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditDialog(connection)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteConnection(connection.id || 0)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {modbusConnections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No connections configured. Click "Add Connection" to add your first Modbus device.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Communication Settings</CardTitle>
                <CardDescription>
                  Configure global communication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Connection Timeout (ms)</Label>
                  <Slider
                    id="timeout"
                    defaultValue={[5000]}
                    min={1000}
                    max={15000}
                    step={1000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1000</span>
                    <span>15000</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retries">Connection Retries</Label>
                  <Slider
                    id="retries"
                    defaultValue={[3]}
                    min={0}
                    max={10}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>10</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="auto-reconnect" defaultChecked />
                  <Label htmlFor="auto-reconnect">Auto-reconnect on failure</Label>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Data Storage</CardTitle>
                <CardDescription>
                  Configure data storage and history settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="history-days">History Retention (days)</Label>
                  <Slider
                    id="history-days"
                    defaultValue={[30]}
                    min={1}
                    max={365}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 day</span>
                    <span>365 days</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data-resolution">Data Resolution (minutes)</Label>
                  <Slider
                    id="data-resolution"
                    defaultValue={[5]}
                    min={1}
                    max={60}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 min</span>
                    <span>60 min</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="data-compression" defaultChecked />
                  <Label htmlFor="data-compression">Enable data compression</Label>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button variant="outline">
                    <FileUp className="mr-2 h-4 w-4" />
                    Backup Config
                  </Button>
                  <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Restore Config
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Connection Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Connection" : "Add New Connection"}</DialogTitle>
            <DialogDescription>
              Configure the Modbus connection details for your flow meter device
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Flow Meter Connection" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="flowMeterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flow Meter</FormLabel>
                      <Select 
                        value={field.value.toString()} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a flow meter" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flowMeters.map(meter => (
                            <SelectItem key={meter.id} value={meter.id.toString()}>
                              {meter.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="protocol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocol Type</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select protocol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tcp">Modbus TCP</SelectItem>
                          <SelectItem value="rtu">Modbus RTU</SelectItem>
                          <SelectItem value="rtuovertcp">Modbus RTU over TCP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pollRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poll Rate (ms)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1000}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 1000ms recommended
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="ipAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Address</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          max={65535}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="slaveId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit ID / Slave ID</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          max={255}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <h3 className="text-base font-medium mb-2">Register Configuration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure the Modbus registers for flow rate and total flow
                </p>
                
                <div className="space-y-4 border rounded-md p-4">
                  {form.watch('registers').map((register, index) => (
                    <div key={register.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div>
                        <Label htmlFor={`register-${index}-type`}>Register Type</Label>
                        <Select 
                          value={register.type}
                          onValueChange={(value) => updateRegisterField(index, 'type', value)}
                        >
                          <SelectTrigger id={`register-${index}-type`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flowRate">Flow Rate</SelectItem>
                            <SelectItem value="totalFlow">Total Flow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor={`register-${index}-address`}>Register Address</Label>
                        <Input 
                          id={`register-${index}-address`}
                          type="number" 
                          min={0}
                          value={register.address}
                          onChange={(e) => updateRegisterField(index, 'address', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`register-${index}-dataType`}>Data Type</Label>
                        <Select 
                          value={register.dataType}
                          onValueChange={(value) => updateRegisterField(index, 'dataType', value)}
                        >
                          <SelectTrigger id={`register-${index}-dataType`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="int16">16-bit Integer</SelectItem>
                            <SelectItem value="int32">32-bit Integer</SelectItem>
                            <SelectItem value="float32">32-bit Float</SelectItem>
                            <SelectItem value="float64">64-bit Float</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor={`register-${index}-multiplier`}>Multiplier</Label>
                        <Input 
                          id={`register-${index}-multiplier`}
                          type="number" 
                          step="0.001"
                          value={register.multiplier}
                          onChange={(e) => updateRegisterField(index, 'multiplier', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Enable Connection
                      </FormLabel>
                      <FormDescription>
                        Enable or disable this Modbus connection
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditMode ? "Update Connection" : "Add Connection"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfigurationPage;
