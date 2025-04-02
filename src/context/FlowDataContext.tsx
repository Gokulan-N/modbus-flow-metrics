
import React, { createContext, useContext, useEffect, useState } from "react";
import { FlowMeter, ModbusConfig } from "../types";
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
  isConnected: boolean;
  toggleConnection: () => void;
  selectedFlowMeterId: number | null;
  setSelectedFlowMeterId: (id: number | null) => void;
  isLoading: boolean;
}

const FlowDataContext = createContext<FlowDataContextProps | undefined>(undefined);

export const FlowDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flowMeters, setFlowMeters] = useState<FlowMeter[]>([]);
  const [modbusConfig, setModbusConfig] = useState<ModbusConfig>(defaultModbusConfig);
  const [isConnected, setIsConnected] = useState(false);
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
  
  // Set up polling for data updates when connected
  useEffect(() => {
    let interval: number | undefined;
    
    if (isConnected) {
      interval = window.setInterval(() => {
        setFlowMeters(prev => 
          prev.map(flowMeter => updateMockFlowMeter(flowMeter))
        );
      }, 5000); // Update every 5 seconds
      
      toast({
        title: "Modbus Connected",
        description: `Connected to ${modbusConfig.ipAddress}:${modbusConfig.port}`,
      });
    } else if (interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, modbusConfig, toast]);
  
  const toggleConnection = () => {
    if (!isConnected) {
      // Simulate connection delay
      setIsLoading(true);
      setTimeout(() => {
        setIsConnected(true);
        setIsLoading(false);
      }, 1500);
    } else {
      setIsConnected(false);
      toast({
        title: "Modbus Disconnected",
        description: "Connection to Modbus server has been closed",
      });
    }
  };
  
  const updateModbusConfig = (config: ModbusConfig) => {
    setModbusConfig(config);
    
    // If connected, disconnect first
    if (isConnected) {
      setIsConnected(false);
      toast({
        title: "Configuration Updated",
        description: "Modbus connection closed due to configuration change",
      });
    }
  };
  
  return (
    <FlowDataContext.Provider
      value={{
        flowMeters,
        modbusConfig,
        updateModbusConfig,
        isConnected,
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
