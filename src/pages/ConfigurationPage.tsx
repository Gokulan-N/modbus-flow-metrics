
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
  Unlink 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFlowData, DeviceConfiguration } from "@/context/FlowDataContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

const ConfigurationPage: React.FC = () => {
  const [configurations, setConfigurations] = useState<DeviceConfiguration[]>(mockDeviceConfigurations);
  const [expandedDevices, setExpandedDevices] = useState<number[]>([]);
  const { toast } = useToast();
  const { connectFlowMeter, disconnectFlowMeter, connectedIds, connectAll, disconnectAll } = useFlowData();
  
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
                        <h4 className="font-medium mb-2">Register Configuration</h4>
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
                            </div>
                          ))}
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
