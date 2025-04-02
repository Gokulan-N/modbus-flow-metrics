
import { FlowMeter, HistoryPoint, ModbusConfig } from "../types";

// Initial mock Modbus configuration
export const defaultModbusConfig: ModbusConfig = {
  connections: [
    {
      id: 1,
      name: "Main Control Room",
      ipAddress: "192.168.1.100",
      port: 502,
      unitId: 1,
    },
    {
      id: 2,
      name: "Field Station 1",
      ipAddress: "192.168.1.101",
      port: 502,
      unitId: 2,
    }
  ],
  flowMeters: Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    name: `Flow Meter ${i + 1}`,
    connectionId: i < 7 ? 1 : 2, // Distribute meters between the two default connections
    registerAddress: 3000 + i * 2,
    registerType: "holding",
    dataType: "float",
    scaleFactor: 1.0,
    unit: i % 2 === 0 ? "m³/h" : "L/min",
  })),
};

// Generate historical data for a flow meter
export const generateHistoricalData = (hours: number = 24): HistoryPoint[] => {
  const now = new Date();
  const data: HistoryPoint[] = [];
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    // Generate a value with some random variation but following a pattern
    // Morning peak, afternoon lull, evening peak pattern
    const hour = timestamp.getHours();
    let baseValue = 50;
    
    if (hour >= 6 && hour < 10) {
      // Morning peak
      baseValue = 80;
    } else if (hour >= 13 && hour < 16) {
      // Afternoon lull
      baseValue = 30;
    } else if (hour >= 18 && hour < 22) {
      // Evening peak
      baseValue = 75;
    }
    
    // Add some randomness (±20%)
    const randomFactor = 0.8 + Math.random() * 0.4;
    const value = baseValue * randomFactor;
    
    data.push({
      timestamp,
      value,
    });
  }
  
  return data;
};

// Generate mock flow meter data
export const generateMockFlowMeters = (count: number = 14, startIndex: number = 0): FlowMeter[] => {
  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i;
    const baseValue = 40 + Math.random() * 60;
    const now = new Date();
    const historyData = generateHistoricalData();
    
    // Determine status based on value
    let status: 'normal' | 'warning' | 'error' = 'normal';
    if (baseValue < 20) {
      status = 'error';
    } else if (baseValue < 30) {
      status = 'warning';
    }
    
    // Calculate initial total flow from history data
    // Sum up all flow values in history multiplied by the time intervals (in hours)
    const initialTotalFlow = historyData.reduce((sum, point, index, array) => {
      if (index === 0) return sum;
      
      // Calculate time difference in hours between current and previous point
      const prevPoint = array[index - 1];
      const hoursDiff = (point.timestamp.getTime() - prevPoint.timestamp.getTime()) / (1000 * 60 * 60);
      
      // Calculate average flow rate between the two points
      const avgFlow = (point.value + prevPoint.value) / 2;
      
      // Add the volume for this time period (flow rate × time)
      return sum + (avgFlow * hoursDiff);
    }, 0);
    
    return {
      id: index + 1,
      name: `Flow Meter ${index + 1}`,
      value: Number(baseValue.toFixed(2)),
      unit: index % 2 === 0 ? "m³/h" : "L/min",
      status,
      lastUpdate: now,
      historyData,
      totalFlow: Number(initialTotalFlow.toFixed(2)),
    };
  });
};

// Generate a single data update with slight variations
export const updateMockFlowMeter = (flowMeter: FlowMeter): FlowMeter => {
  const now = new Date();
  const lastValue = flowMeter.value;
  
  // Create a slight variation from previous value (±5%)
  const variation = (Math.random() - 0.5) * 0.1;
  const newValue = Math.max(0, lastValue * (1 + variation));
  
  // Determine status based on value
  let status: 'normal' | 'warning' | 'error' = 'normal';
  if (newValue < 20) {
    status = 'error';
  } else if (newValue < 30) {
    status = 'warning';
  }
  
  // Add the new data point to history
  const updatedHistory = [...flowMeter.historyData];
  
  // Calculate time since last update in hours
  const lastPointTime = updatedHistory[updatedHistory.length - 1]?.timestamp;
  let hoursSinceLastUpdate = 0;
  let updateTotalFlow = flowMeter.totalFlow;
  
  if (lastPointTime) {
    hoursSinceLastUpdate = (now.getTime() - lastPointTime.getTime()) / (1000 * 60 * 60);
    
    // Calculate the volume of flow since last update (average flow × time)
    const avgFlow = (lastValue + newValue) / 2;
    updateTotalFlow += avgFlow * hoursSinceLastUpdate;
  }
  
  // If we have a point at the same minute, replace it instead of adding
  if (lastPointTime && 
      lastPointTime.getMinutes() === now.getMinutes() && 
      lastPointTime.getHours() === now.getHours()) {
    updatedHistory[updatedHistory.length - 1] = {
      timestamp: now,
      value: newValue,
    };
  } else {
    // Add new point and remove oldest if we have too many
    updatedHistory.push({
      timestamp: now,
      value: newValue,
    });
    
    if (updatedHistory.length > 24 * 60) { // Keep 24 hours of per-minute data
      updatedHistory.shift();
    }
  }
  
  return {
    ...flowMeter,
    value: Number(newValue.toFixed(2)),
    status,
    lastUpdate: now,
    historyData: updatedHistory,
    totalFlow: Number(updateTotalFlow.toFixed(2)),
  };
};
