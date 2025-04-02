
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
      const mockData = generateMockFlowMeters();
      setFlowMeters(mockData);
      setIsLoading(false);
    };
    
    initData();
  }, []);
  
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
        isLoading
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
