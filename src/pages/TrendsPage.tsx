
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFlowData } from "@/context/FlowDataContext";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  Legend,
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { FlowMeterGrid } from "@/components/dashboard/FlowMeterGrid";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

const TrendsPage: React.FC = () => {
  const { flowMeters, selectedFlowMeterId, setSelectedFlowMeterId } = useFlowData();
  const [timeRange, setTimeRange] = useState<string>("6h");
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse meterId from URL if present
  useEffect(() => {
    const meterIdParam = searchParams.get("meterId");
    if (meterIdParam) {
      const meterId = parseInt(meterIdParam, 10);
      if (!isNaN(meterId)) {
        setSelectedFlowMeterId(meterId);
      }
    }
  }, [searchParams, setSelectedFlowMeterId]);
  
  // Update URL when selected meter changes
  useEffect(() => {
    if (selectedFlowMeterId) {
      searchParams.set("meterId", selectedFlowMeterId.toString());
    } else {
      searchParams.delete("meterId");
    }
    setSearchParams(searchParams);
  }, [selectedFlowMeterId, searchParams, setSearchParams]);
  
  // Get the selected flow meter
  const selectedFlowMeter = flowMeters.find(fm => fm.id === selectedFlowMeterId);
  
  // Format data for the chart based on the selected time range
  const getChartData = () => {
    if (!selectedFlowMeter) return [];
    
    let hoursToShow: number;
    switch (timeRange) {
      case "1h": hoursToShow = 1; break;
      case "3h": hoursToShow = 3; break;
      case "6h": hoursToShow = 6; break;
      case "12h": hoursToShow = 12; break;
      case "24h": default: hoursToShow = 24; break;
    }
    
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - hoursToShow * 60 * 60 * 1000);
    
    return selectedFlowMeter.historyData
      .filter(point => point.timestamp >= cutoffTime)
      .map(point => ({
        time: point.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        value: point.value,
      }));
  };
  
  const chartData = getChartData();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Trend Analysis</h2>
        
        {selectedFlowMeter && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time Range:</span>
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="3h">Last 3 Hours</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="12h">Last 12 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {selectedFlowMeter ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedFlowMeter.name} Trend</CardTitle>
            <CardDescription>
              Historical trend data for {selectedFlowMeter.name} ({selectedFlowMeter.unit})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={{ stroke: "hsl(var(--muted))" }}
                    axisLine={{ stroke: "hsl(var(--muted))" }}
                  />
                  <YAxis 
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={{ stroke: "hsl(var(--muted))" }}
                    axisLine={{ stroke: "hsl(var(--muted))" }}
                    label={{ 
                      value: selectedFlowMeter.unit, 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: "hsl(var(--muted-foreground))" }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                    labelStyle={{
                      color: "hsl(var(--card-foreground))"
                    }}
                    itemStyle={{
                      color: "hsl(var(--card-foreground))"
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    name={`Flow Rate (${selectedFlowMeter.unit})`}
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-6">
          <h3 className="text-lg font-medium mb-2">Select a Flow Meter to View Trends</h3>
          <p className="text-muted-foreground mb-8">
            Choose a flow meter from the list below to view detailed trend data
          </p>
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Flow Meters</h3>
        <FlowMeterGrid selectable />
      </div>
    </div>
  );
};

export default TrendsPage;
