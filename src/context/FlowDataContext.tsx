
import React, { createContext, useContext, useState, useEffect } from "react";
import { generateMockFlowMeters, updateMockFlowMeter, generateHistoricalData } from "@/lib/mockDataService";
import { FlowMeter as FlowMeterType } from "@/types";

export type FlowMeter = FlowMeterType;

export type DeviceConfiguration = {
  id?: number;
  name?: string;
  ipAddress?: string;
  port?: number;
  slaveId?: number;
  protocol?: "tcp" | "rtu" | "rtuovertcp";
  enabled?: boolean;
  pollRate?: number;
  flowMeterId?: number;
  registers?: {
    id?: number;
    type?: "flowRate" | "totalFlow";
    description?: string;
    address?: number;
    dataType?: "int16" | "int32" | "float32" | "float64";
    multiplier?: number;
  }[];
};

export type FlowTrendData = {
  timestamp: string;
  flowRate: number;
  totalFlow: number;
};

export type FlowDataContextProps = {
  flowMeters: FlowMeter[];
  trendData: FlowTrendData[];
  connectedIds: number[];
  isLoading: boolean;
  selectedFlowMeterId: number | null;
  setSelectedFlowMeterId: (id: number | null) => void;
  refreshData: () => void;
  fetchTrendData: (meterId: number, startTime: string, endTime: string) => Promise<FlowTrendData[]>;
  connectFlowMeter: (id: number) => void;
  disconnectFlowMeter: (id: number) => void;
  connectAll: () => void;
  disconnectAll: () => void;
};

const FlowDataContext = createContext<FlowDataContextProps>({
  flowMeters: [],
  trendData: [],
  connectedIds: [],
  isLoading: true,
  selectedFlowMeterId: null,
  setSelectedFlowMeterId: () => {},
  refreshData: () => {},
  fetchTrendData: async () => [],
  connectFlowMeter: () => {},
  disconnectFlowMeter: () => {},
  connectAll: () => {},
  disconnectAll: () => {},
});

export function useFlowData() {
  return useContext(FlowDataContext);
}

export const FlowDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flowMeters, setFlowMeters] = useState<FlowMeter[]>([]);
  const [trendData, setTrendData] = useState<FlowTrendData[]>([]);
  const [connectedIds, setConnectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFlowMeterId, setSelectedFlowMeterId] = useState<number | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Use the generateMockFlowMeters function instead of fetchMockFlowMeters
      const data = generateMockFlowMeters();
      setFlowMeters(data);
    } catch (error) {
      console.error("Error fetching flow meter data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrendData = async (meterId: number, startTime: string, endTime: string): Promise<FlowTrendData[]> => {
    try {
      // Generate trend data based on historical data
      const flowMeter = flowMeters.find(fm => fm.id === meterId);
      if (!flowMeter) return [];

      // Convert historical data to trend data format
      const history = generateHistoricalData(24); // Get 24 hours of data
      
      const trendData: FlowTrendData[] = history.map(point => ({
        timestamp: point.timestamp.toISOString(),
        flowRate: point.value,
        totalFlow: flowMeter.totalFlow * (Math.random() * 0.1 + 0.95) // Simulated total flow
      }));
      
      setTrendData(trendData);
      return trendData;
    } catch (error) {
      console.error("Error fetching trend data:", error);
      return [];
    }
  };

  const connectFlowMeter = (id: number) => {
    setConnectedIds(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  const disconnectFlowMeter = (id: number) => {
    setConnectedIds(prev => prev.filter(mId => mId !== id));
  };

  const connectAll = () => {
    const allIds = flowMeters.map(meter => meter.id);
    setConnectedIds(allIds);
  };

  const disconnectAll = () => {
    setConnectedIds([]);
  };

  useEffect(() => {
    refreshData();
    // Mock connected devices
    setConnectedIds([1]);
  }, []);

  return (
    <FlowDataContext.Provider
      value={{
        flowMeters,
        trendData,
        connectedIds,
        isLoading,
        selectedFlowMeterId,
        setSelectedFlowMeterId,
        refreshData,
        fetchTrendData,
        connectFlowMeter,
        disconnectFlowMeter,
        connectAll,
        disconnectAll,
      }}
    >
      {children}
    </FlowDataContext.Provider>
  );
};
