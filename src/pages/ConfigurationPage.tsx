
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Network, 
  Settings, 
  CheckCircle, 
  XCircle, 
  ChevronsUpDown, 
  Link, 
  Unlink,
  Plus 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFlowData, DeviceConfiguration } from "@/context/FlowDataContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";

// Mock configurations
const mockDeviceConfigurations: DeviceConfiguration[] = [
  {
    id: 1,
    name: "Flow Meter Controller 1",
    ipAddress: "192.168.1.100",
    port: 502,
    slaveId: 1,
    protocol: "tcp",
    enabled: true,
    pollRate: 5000,
    flowMeterId: 1,
    registers: [
      {
        id: 1,
        type: "flowRate",
        address: 3000,
        dataType: "float32",
        multiplier: 1,
        description: "Current Flow Rate"
      },
      {
        id: 2,
        type: "totalFlow",
        address: 3002,
        dataType: "float32",
        multiplier: 1,
        description: "Total Flow Value"
      }
    ]
  },
  {
    id: 2,
    name: "Flow Meter Controller 2",
    ipAddress: "192.168.1.101",
    port: 502,
    slaveId: 2,
    protocol: "tcp",
    enabled: false,
    pollRate: 10000,
    flowMeterId: 2,
    registers: [
      {
        id: 3,
        type: "flowRate",
        address: 4000,
        dataType: "float32",
        multiplier: 0.1,
        description: "Current Flow Rate"
      },
      {
        id: 4,
        type: "totalFlow",
        address: 4002,
        dataType: "float32",
        multiplier: 0.1,
        description: "Total Flow Value"
      }
    ]
  }
];

// New type for the form data
type FlowMeterFormData = {
  name: string;
  ipAddress: string;
  port: number;
  slaveId: number;
  protocol: "tcp" | "rtu" | "rtuovertcp";
  pollRate: number;
  flowMeterId: number;
};

type RegisterFormData = {
  type: "flowRate" | "totalFlow";
  address: number;
  dataType: "int16" | "int32" | "float32" | "float64";
  multiplier: number;
  description: string;
  deviceId: number;
};

const ConfigurationPage: React.FC = () => {
  const [configurations, setConfigurations] = useState<DeviceConfiguration[]>(mockDeviceConfigurations);
  const [expandedDevices, setExpandedDevices] = useState<number[]>([]);
  const [openFlowMeterDialog, setOpenFlowMeterDialog] = useState(false);
  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const { toast } = useToast();
  const { connectFlowMeter, disconnectFlowMeter, connectedIds, connectAll, disconnectAll } = useFlowData();
  
  const flowMeterForm = useForm<FlowMeterFormData>({
    defaultValues: {
      name: "New Flow Meter",
      ipAddress: "192.168.1.100",
      port: 502,
      slaveId: 1,
      protocol: "tcp",
      pollRate: 5000,
      flowMeterId: configurations.length + 1
    }
  });

  const registerForm = useForm<RegisterFormData>({
    defaultValues: {
      type: "flowRate",
      address: 3000,
      dataType: "float32",
      multiplier: 1,
      description: "New Register",
      deviceId: 0
    }
  });
  
  const toggleDeviceExpanded = (deviceId: number) => {
    setExpandedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };
  
  const saveConfiguration = () => {
    toast({
      title: "Configuration Saved",
      description: "Your device configuration changes have been saved",
    });
  };
  
  const toggleDeviceEnabled = (deviceId: number) => {
    setConfigurations(devices => 
      devices.map(device => 
        device.id === deviceId 
          ? { ...device, enabled: !device.enabled }
          : device
      )
    );
    
    toast({
      title: "Device Updated",
      description: `Device ${deviceId} has been ${configurations.find(d => d.id === deviceId)?.enabled ? 'disabled' : 'enabled'}`,
    });
  };
  
  const handleConnectAll = () => {
    connectAll();
    toast({
      title: "All Devices Connected",
      description: "All flow meters have been connected",
    });
  };
  
  const handleDisconnectAll = () => {
    disconnectAll();
    toast({
      title: "All Devices Disconnected",
      description: "All flow meters have been disconnected",
    });
  };
  
  const addNewFlowMeter = (data: FlowMeterFormData) => {
    const newId = Math.max(...configurations.map(c => c.id!)) + 1;
    const newDevice: DeviceConfiguration = {
      id: newId,
      name: data.name,
      ipAddress: data.ipAddress,
      port: data.port,
      slaveId: data.slaveId,
      protocol: data.protocol,
      enabled: false,
      pollRate: data.pollRate,
      flowMeterId: data.flowMeterId,
      registers: []
    };
    
    setConfigurations([...configurations, newDevice]);
    setOpenFlowMeterDialog(false);
    
    toast({
      title: "Flow Meter Added",
      description: `Flow meter "${data.name}" has been added successfully`,
    });
  };
  
  const addNewRegister = (data: RegisterFormData) => {
    const newRegisterId = Math.max(...configurations.flatMap(c => c.registers?.map(r => r.id!) ?? [0])) + 1;
    
    const newRegister = {
      id: newRegisterId,
      type: data.type,
      address: data.address,
      dataType: data.dataType,
      multiplier: data.multiplier,
      description: data.description
    };
    
    setConfigurations(devices => 
      devices.map(device => 
        device.id === data.deviceId 
          ? { ...device, registers: [...(device.registers || []), newRegister] }
          : device
      )
    );
    setOpenRegisterDialog(false);
    
    toast({
      title: "Register Added",
      description: `Register "${data.description}" has been added successfully to device ${data.deviceId}`,
    });
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configuration</h2>
      
      <Tabs defaultValue="devices">
        <TabsList className="mb-4">
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="devices">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-semibold">Modbus Device Configuration</h3>
            <div className="space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleConnectAll}
                className="flex items-center gap-1"
              >
                <Link className="h-4 w-4" />
                Connect All
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleDisconnectAll}
                className="flex items-center gap-1"
              >
                <Unlink className="h-4 w-4" />
                Disconnect All
              </Button>
              <Button variant="default" onClick={() => setOpenFlowMeterDialog(true)} className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Flow Meter
              </Button>
              <Button onClick={saveConfiguration} className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Save Configuration
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            {configurations.map(device => (
              <Card key={device.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Network className="h-5 w-5 text-primary" />
                      <CardTitle>{device.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.enabled ? (
                        <span className="flex items-center text-xs text-green-500">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Enabled
                        </span>
                      ) : (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <XCircle className="h-4 w-4 mr-1" />
                          Disabled
                        </span>
                      )}
                      <Switch 
                        checked={device.enabled}
                        onCheckedChange={() => toggleDeviceEnabled(device.id!)}
                      />
                      <Button
                        variant={connectedIds.includes(device.flowMeterId!) ? "default" : "outline"}
                        size="sm"
                        onClick={() => connectedIds.includes(device.flowMeterId!) 
                          ? disconnectFlowMeter(device.flowMeterId!)
                          : connectFlowMeter(device.flowMeterId!)}
                      >
                        {connectedIds.includes(device.flowMeterId!) ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    IP: {device.ipAddress}:{device.port} - {device.protocol?.toUpperCase()} - Slave ID: {device.slaveId}
                  </CardDescription>
                </CardHeader>
                
                <Collapsible
                  open={expandedDevices.includes(device.id!)}
                  onOpenChange={() => toggleDeviceExpanded(device.id!)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full flex items-center justify-center">
                      <ChevronsUpDown className="h-4 w-4" />
                      <span className="ml-1">
                        {expandedDevices.includes(device.id!) ? "Hide Details" : "Show Details"}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Device Name</Label>
                          <Input value={device.name} onChange={() => {}} />
                        </div>
                        <div className="space-y-2">
                          <Label>Poll Rate (ms)</Label>
                          <Input type="number" value={device.pollRate} onChange={() => {}} />
                        </div>
                        <div className="space-y-2">
                          <Label>IP Address</Label>
                          <Input value={device.ipAddress} onChange={() => {}} />
                        </div>
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input type="number" value={device.port} onChange={() => {}} />
                        </div>
                        <div className="space-y-2">
                          <Label>Slave ID</Label>
                          <Input type="number" value={device.slaveId} onChange={() => {}} />
                        </div>
                        <div className="space-y-2">
                          <Label>Protocol</Label>
                          <Select defaultValue={device.protocol}>
                            <SelectTrigger>
                              <SelectValue placeholder="Protocol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tcp">TCP</SelectItem>
                              <SelectItem value="rtu">RTU</SelectItem>
                              <SelectItem value="rtuovertcp">RTU over TCP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Register Configuration</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              registerForm.reset({
                                ...registerForm.getValues(),
                                deviceId: device.id!
                              });
                              setSelectedDeviceId(device.id!);
                              setOpenRegisterDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Add Register
                          </Button>
                        </div>
                        <div className="border rounded-md p-2 space-y-4">
                          {device.registers && device.registers.map(register => (
                            <div key={register.id} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Register Type</Label>
                                <Select defaultValue={register.type}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="flowRate">Flow Rate</SelectItem>
                                    <SelectItem value="totalFlow">Total Flow</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Address</Label>
                                <Input type="number" value={register.address} onChange={() => {}} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Data Type</Label>
                                <Select defaultValue={register.dataType}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Data Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="int16">INT16</SelectItem>
                                    <SelectItem value="int32">INT32</SelectItem>
                                    <SelectItem value="float32">FLOAT32</SelectItem>
                                    <SelectItem value="float64">FLOAT64</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Multiplier</Label>
                                <Input type="number" value={register.multiplier} onChange={() => {}} />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs">Description</Label>
                                <Input value={register.description || ""} onChange={() => {}} />
                              </div>
                            </div>
                          ))}
                          {(!device.registers || device.registers.length === 0) && (
                            <div className="text-center text-muted-foreground py-4">
                              No registers configured. Click "Add Register" to add one.
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
                
                <CardFooter>
                  <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
                    <span>Flow Meter ID: {device.flowMeterId}</span>
                    <span>Last Updated: {new Date().toLocaleDateString()}</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* Dialog for adding new flow meter */}
          <Dialog open={openFlowMeterDialog} onOpenChange={setOpenFlowMeterDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Flow Meter</DialogTitle>
                <DialogDescription>
                  Configure the settings for the new flow meter device
                </DialogDescription>
              </DialogHeader>
              
              <Form {...flowMeterForm}>
                <form onSubmit={flowMeterForm.handleSubmit(addNewFlowMeter)} className="space-y-4">
                  <FormField
                    control={flowMeterForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={flowMeterForm.control}
                      name="ipAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IP Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={flowMeterForm.control}
                      name="port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={flowMeterForm.control}
                      name="slaveId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slave ID</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={flowMeterForm.control}
                      name="protocol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Protocol</FormLabel>
                          <Select 
                            defaultValue={field.value} 
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Protocol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tcp">TCP</SelectItem>
                              <SelectItem value="rtu">RTU</SelectItem>
                              <SelectItem value="rtuovertcp">RTU over TCP</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={flowMeterForm.control}
                      name="pollRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Poll Rate (ms)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={flowMeterForm.control}
                      name="flowMeterId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flow Meter ID</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit">Add Flow Meter</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Dialog for adding new register */}
          <Dialog open={openRegisterDialog} onOpenChange={setOpenRegisterDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Register</DialogTitle>
                <DialogDescription>
                  Configure the new register for the selected device
                </DialogDescription>
              </DialogHeader>
              
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(addNewRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Register Type</FormLabel>
                        <Select 
                          defaultValue={field.value} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flowRate">Flow Rate</SelectItem>
                            <SelectItem value="totalFlow">Total Flow</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Register Address</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="dataType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Type</FormLabel>
                          <Select 
                            defaultValue={field.value} 
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Data Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="int16">INT16</SelectItem>
                              <SelectItem value="int32">INT32</SelectItem>
                              <SelectItem value="float32">FLOAT32</SelectItem>
                              <SelectItem value="float64">FLOAT64</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="multiplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Multiplier</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={registerForm.control}
                    name="deviceId"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit">Add Register</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure global system parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Logging Interval (minutes)</Label>
                  <Input type="number" defaultValue={15} />
                </div>
                <div className="space-y-2">
                  <Label>Data Retention Period (days)</Label>
                  <Input type="number" defaultValue={90} />
                </div>
                <div className="space-y-2">
                  <Label>Alarm Notification Email</Label>
                  <Input type="email" defaultValue="admin@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Backup Schedule</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue placeholder="Backup Schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch id="auto-update" defaultChecked />
                  <Label htmlFor="auto-update">Enable Automatic Updates</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => {
                toast({
                  title: "System Settings Saved",
                  description: "Your system settings have been updated"
                });
              }}>
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfigurationPage;
