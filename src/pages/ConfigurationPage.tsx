
import React, { useState } from "react";
import { useFlowData } from "@/context/FlowDataContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlowMeterConfig, ModbusConfig } from "@/types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2 } from "lucide-react";

const ConfigurationPage: React.FC = () => {
  const { modbusConfig, updateModbusConfig, isConnected } = useFlowData();
  const [config, setConfig] = useState<ModbusConfig>({...modbusConfig});
  const { toast } = useToast();
  
  const handleSave = () => {
    // Validate IP address
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(config.ipAddress)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IP address (e.g., 192.168.1.100)",
        variant: "destructive"
      });
      return;
    }
    
    // Validate port
    if (config.port < 1 || config.port > 65535) {
      toast({
        title: "Invalid Port",
        description: "Port number must be between 1 and 65535",
        variant: "destructive"
      });
      return;
    }
    
    // Validate unit ID
    if (config.unitId < 1 || config.unitId > 247) {
      toast({
        title: "Invalid Unit ID",
        description: "Unit ID must be between 1 and 247",
        variant: "destructive"
      });
      return;
    }
    
    // Validate flow meters
    if (config.flowMeters.length === 0) {
      toast({
        title: "No Flow Meters",
        description: "You must configure at least one flow meter",
        variant: "destructive"
      });
      return;
    }
    
    updateModbusConfig(config);
    toast({
      title: "Configuration Saved",
      description: "Modbus configuration has been updated successfully"
    });
  };
  
  const handleAddFlowMeter = () => {
    const newId = Math.max(0, ...config.flowMeters.map(fm => fm.id)) + 1;
    
    const newFlowMeter: FlowMeterConfig = {
      id: newId,
      name: `Flow Meter ${newId}`,
      registerAddress: 3000,
      registerType: "holding",
      dataType: "float",
      scaleFactor: 1.0,
      unit: "m³/h"
    };
    
    setConfig({
      ...config,
      flowMeters: [...config.flowMeters, newFlowMeter]
    });
  };
  
  const handleRemoveFlowMeter = (id: number) => {
    setConfig({
      ...config,
      flowMeters: config.flowMeters.filter(fm => fm.id !== id)
    });
  };
  
  const handleFlowMeterChange = (index: number, field: keyof FlowMeterConfig, value: any) => {
    const updatedFlowMeters = [...config.flowMeters];
    updatedFlowMeters[index] = {
      ...updatedFlowMeters[index],
      [field]: value
    };
    
    setConfig({
      ...config,
      flowMeters: updatedFlowMeters
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-6">Modbus Configuration</h2>
        
        {isConnected && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-md p-4 mb-6">
            <p className="text-yellow-300">
              Warning: Changing configuration settings while connected will disconnect from the Modbus server.
            </p>
          </div>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Modbus TCP Connection</CardTitle>
            <CardDescription>Configure the connection to your Modbus TCP server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  value={config.ipAddress}
                  onChange={(e) => setConfig({...config, ipAddress: e.target.value})}
                  placeholder="e.g. 192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig({...config, port: parseInt(e.target.value) || 502})}
                  placeholder="502"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitId">Unit ID</Label>
                <Input
                  id="unitId"
                  type="number"
                  value={config.unitId}
                  onChange={(e) => setConfig({...config, unitId: parseInt(e.target.value) || 1})}
                  placeholder="1"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave}>Save Connection Settings</Button>
          </CardFooter>
        </Card>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Flow Meter Configuration</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddFlowMeter}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            Add Flow Meter
          </Button>
        </div>
        
        {config.flowMeters.map((flowMeter, index) => (
          <Card key={flowMeter.id} className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  Flow Meter #{flowMeter.id}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFlowMeter(flowMeter.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${flowMeter.id}`}>Name</Label>
                  <Input
                    id={`name-${flowMeter.id}`}
                    value={flowMeter.name}
                    onChange={(e) => handleFlowMeterChange(index, "name", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`address-${flowMeter.id}`}>Register Address</Label>
                  <Input
                    id={`address-${flowMeter.id}`}
                    type="number"
                    value={flowMeter.registerAddress}
                    onChange={(e) => handleFlowMeterChange(
                      index, 
                      "registerAddress", 
                      parseInt(e.target.value) || 0
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`type-${flowMeter.id}`}>Register Type</Label>
                  <Select
                    value={flowMeter.registerType}
                    onValueChange={(value) => handleFlowMeterChange(
                      index, 
                      "registerType", 
                      value as "holding" | "input"
                    )}
                  >
                    <SelectTrigger id={`type-${flowMeter.id}`}>
                      <SelectValue placeholder="Select register type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="holding">Holding Register</SelectItem>
                      <SelectItem value="input">Input Register</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`dataType-${flowMeter.id}`}>Data Type</Label>
                  <Select
                    value={flowMeter.dataType}
                    onValueChange={(value) => handleFlowMeterChange(
                      index, 
                      "dataType", 
                      value as "float" | "int16" | "int32" | "uint16" | "uint32"
                    )}
                  >
                    <SelectTrigger id={`dataType-${flowMeter.id}`}>
                      <SelectValue placeholder="Select data type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="float">Float (32-bit)</SelectItem>
                      <SelectItem value="int16">Int16 (16-bit)</SelectItem>
                      <SelectItem value="int32">Int32 (32-bit)</SelectItem>
                      <SelectItem value="uint16">Uint16 (16-bit)</SelectItem>
                      <SelectItem value="uint32">Uint32 (32-bit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`scale-${flowMeter.id}`}>Scale Factor</Label>
                  <Input
                    id={`scale-${flowMeter.id}`}
                    type="number"
                    step="0.01"
                    value={flowMeter.scaleFactor}
                    onChange={(e) => handleFlowMeterChange(
                      index, 
                      "scaleFactor", 
                      parseFloat(e.target.value) || 1.0
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`unit-${flowMeter.id}`}>Unit</Label>
                  <Input
                    id={`unit-${flowMeter.id}`}
                    value={flowMeter.unit}
                    onChange={(e) => handleFlowMeterChange(index, "unit", e.target.value)}
                    placeholder="e.g. m³/h"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {config.flowMeters.length === 0 && (
          <div className="text-center p-6 border border-dashed border-border rounded-md">
            <p className="text-muted-foreground mb-4">No flow meters configured</p>
            <Button onClick={handleAddFlowMeter} variant="outline">
              Add Your First Flow Meter
            </Button>
          </div>
        )}
        
        <div className="mt-4">
          <Button onClick={handleSave}>Save All Configuration</Button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;
