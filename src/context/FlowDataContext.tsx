
import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchMockFlowMeters, fetchMockTrends } from "@/lib/mockDataService";

export type FlowMeter = {
  id: number;
  name: string;
  location: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installDate: string;
  lastCalibration: string;
  status: "active" | "inactive" | "maintenance" | "error";
  flowRate: number;
  totalFlow: number;
  unit: "m3/h" | "L/min" | "gal/min";
  alarms: {
    id: number;
    type: "high" | "low" | "fault";
    value: number;
    status: "active" | "acknowledged" | "resolved";
    timestamp: string;
  }[];
};

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

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMockFlowMeters();
      setFlowMeters(data);
    } catch (error) {
      console.error("Error fetching flow meter data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrendData = async (meterId: number, startTime: string, endTime: string) => {
    try {
      const data = await fetchMockTrends(meterId, startTime, endTime);
      setTrendData(data);
      return data;
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
