
import React, { createContext, useContext, useEffect, useState } from "react";
import { FlowMeter, ModbusConfig, ModbusConnection } from "../types";
import { 
  defaultModbusConfig, 
  generateMockFlowMeters, 
  updateMockFlowMeter 
} from "../lib/mockDataService";
import { useToast } from "@/hooks/use-toast";

interface FlowDataContextProps {
  flowMeters: FlowMeter[];
  modbusConfig: ModbusConfig;
  updateModbusConfig: (config: ModbusConfig) => void;
  connectedIds: number[]; // IDs of connected Modbus connections
  toggleConnection: (connectionId?: number) => void; // Toggle specific connection
  selectedFlowMeterId: number | null;
  setSelectedFlowMeterId: (id: number | null) => void;
  isLoading: boolean;
  autoConnectModbus: (isClient?: boolean) => void;
}

const FlowDataContext = createContext<FlowDataContextProps | undefined>(undefined);

export const FlowDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flowMeters, setFlowMeters] = useState<FlowMeter[]>([]);
  const [modbusConfig, setModbusConfig] = useState<ModbusConfig>(defaultModbusConfig);
  const [connectedIds, setConnectedIds] = useState<number[]>([]); // Track connected IDs
  const [selectedFlowMeterId, setSelectedFlowMeterId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Initialize flow meters with mock data
  useEffect(() => {
    const initData = () => {
      setIsLoading(true);
      const mockData = generateMockFlowMeters(modbusConfig.flowMeters.length);
      setFlowMeters(mockData);
      setIsLoading(false);
    };
    
    initData();
  }, []);
  
  // Update flow meters when config changes (e.g. when adding new flow meters)
  useEffect(() => {
    // Check if the number of configured flow meters changed
    if (flowMeters.length !== modbusConfig.flowMeters.length) {
      // Generate or update flow meters based on configuration
      setFlowMeters(prev => {
        // Keep existing flow meters
        const existing = prev.filter(fm => 
          modbusConfig.flowMeters.some(config => config.id === fm.id)
        );
        
        // Add new flow meters
        const newFlowMeterIds = modbusConfig.flowMeters
          .filter(config => !prev.some(fm => fm.id === config.id))
          .map(config => config.id);
        
        const newFlowMeters = generateMockFlowMeters(newFlowMeterIds.length, existing.length);
        
        // Update IDs to match configuration
        newFlowMeterIds.forEach((id, index) => {
          if (newFlowMeters[index]) {
            newFlowMeters[index].id = id;
            
            // Also update name to match config
            const configItem = modbusConfig.flowMeters.find(fm => fm.id === id);
            if (configItem) {
              newFlowMeters[index].name = configItem.name;
              newFlowMeters[index].unit = configItem.unit;
            }
          }
        });
        
        return [...existing, ...newFlowMeters];
      });
    } else {
      // Update properties of existing flow meters
      setFlowMeters(prev => prev.map(flowMeter => {
        const configItem = modbusConfig.flowMeters.find(fm => fm.id === flowMeter.id);
        if (configItem) {
          return {
            ...flowMeter,
            name: configItem.name,
            unit: configItem.unit
          };
        }
        return flowMeter;
      }));
    }
  }, [modbusConfig]);
  
  // Set up polling for data updates when any connection is active
  useEffect(() => {
    let interval: number | undefined;
    
    if (connectedIds.length > 0) {
      interval = window.setInterval(() => {
        setFlowMeters(prev => 
          prev.map(flowMeter => {
            // Only update flow meters that belong to connected Modbus instances
            const flowMeterConfig = modbusConfig.flowMeters.find(fm => fm.id === flowMeter.id);
            if (flowMeterConfig && connectedIds.includes(flowMeterConfig.connectionId)) {
              return updateMockFlowMeter(flowMeter);
            }
            return flowMeter;
          })
        );
      }, 5000); // Update every 5 seconds
    } else if (interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [connectedIds, modbusConfig]);
  
  // Function to automatically connect Modbus for client users
  const autoConnectModbus = (isClient = false) => {
    if (isClient && connectedIds.length === 0) {
      // Connect all for clients
      setIsLoading(true);
      setTimeout(() => {
        const allIds = modbusConfig.connections.map(conn => conn.id);
        setConnectedIds(allIds);
        toast({
          title: "Auto-Connected to Modbus",
          description: `Connected to ${modbusConfig.connections.length} Modbus servers for continuous monitoring`,
        });
        setIsLoading(false);
      }, 1500);
    }
  };
  
  const toggleConnection = (connectionId?: number) => {
    setIsLoading(true);
    
    // If no ID provided, toggle all connections
    if (connectionId === undefined) {
      // If any are connected, disconnect all
      if (connectedIds.length > 0) {
        setConnectedIds([]);
        toast({
          title: "All Modbus Disconnected",
          description: "All connections to Modbus servers have been closed",
        });
      } else {
        // Connect all
        setTimeout(() => {
          const allIds = modbusConfig.connections.map(conn => conn.id);
          setConnectedIds(allIds);
          toast({
            title: "All Modbus Connected",
            description: `Connected to ${modbusConfig.connections.length} Modbus servers`,
          });
          setIsLoading(false);
        }, 1500);
        return;
      }
    } else {
      // Toggle specific connection
      setTimeout(() => {
        if (connectedIds.includes(connectionId)) {
          // Disconnect
          setConnectedIds(prev => prev.filter(id => id !== connectionId));
          
          const connection = modbusConfig.connections.find(c => c.id === connectionId);
          if (connection) {
            toast({
              title: "Modbus Disconnected",
              description: `Disconnected from ${connection.name} (${connection.ipAddress}:${connection.port})`,
            });
          }
        } else {
          // Connect
          setConnectedIds(prev => [...prev, connectionId]);
          
          const connection = modbusConfig.connections.find(c => c.id === connectionId);
          if (connection) {
            toast({
              title: "Modbus Connected",
              description: `Connected to ${connection.name} (${connection.ipAddress}:${connection.port})`,
            });
          }
        }
      }, 1500);
    }
    
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };
  
  const updateModbusConfig = (config: ModbusConfig) => {
    setModbusConfig(config);
    
    // If any connections are active, disconnect them
    if (connectedIds.length > 0) {
      setConnectedIds([]);
      toast({
        title: "Configuration Updated",
        description: "All Modbus connections closed due to configuration change",
      });
    } else {
      toast({
        title: "Configuration Updated",
        description: "Modbus configuration has been updated",
      });
    }
  };
  
  return (
    <FlowDataContext.Provider
      value={{
        flowMeters,
        modbusConfig,
        updateModbusConfig,
        connectedIds,
        toggleConnection,
        selectedFlowMeterId,
        setSelectedFlowMeterId,
        isLoading,
        autoConnectModbus
      }}
    >
      {children}
    </FlowDataContext.Provider>
  );
};

export const useFlowData = () => {
  const context = useContext(FlowDataContext);
  if (context === undefined) {
    throw new Error("useFlowData must be used within a FlowDataProvider");
  }
  return context;
};
