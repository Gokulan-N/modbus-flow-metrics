
import React, { useMemo, useState } from "react";
import { useFlowData } from "@/context/FlowDataContext";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ZoomableChart from "@/components/charts/ZoomableChart";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, subDays, subHours, subWeeks, subMonths } from "date-fns";

type TagType = "flowRate" | "totalFlow" | "consumption";
type TimeRangeType = "last24h" | "last7d" | "last30d" | "custom";

const TrendsPage: React.FC = () => {
  const { flowMeters, selectedFlowMeterId, setSelectedFlowMeterId } = useFlowData();
  const [selectedTag, setSelectedTag] = useState<TagType>("flowRate");
  const [timeRange, setTimeRange] = useState<TimeRangeType>("last24h");
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  
  // Select first flow meter by default if none is selected
  const effectiveSelectedId = selectedFlowMeterId || (flowMeters.length > 0 ? flowMeters[0].id : null);
  
  const selectedFlowMeter = flowMeters.find(fm => fm.id === effectiveSelectedId);
  
  // Handle time range selection
  const handleTimeRangeChange = (value: TimeRangeType) => {
    setTimeRange(value);
    
    const now = new Date();
    let start = now;
    
    switch(value) {
      case "last24h":
        start = subHours(now, 24);
        break;
      case "last7d":
        start = subDays(now, 7);
        break;
      case "last30d":
        start = subMonths(now, 1);
        break;
      case "custom":
        // Don't change the dates for custom
        return;
    }
    
    setStartDate(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEndDate(format(now, "yyyy-MM-dd'T'HH:mm"));
  };
  
  // Filter history data based on selected time range
  const filteredHistoryData = useMemo(() => {
    if (!selectedFlowMeter) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return selectedFlowMeter.historyData.filter(point => 
      point.timestamp >= start && point.timestamp <= end
    );
  }, [selectedFlowMeter, startDate, endDate]);
  
  // Transform history data to include a name property for the chart
  const formattedChartData = useMemo(() => {
    if (!selectedFlowMeter) return [];
    
    if (selectedTag === "flowRate") {
      return filteredHistoryData.map(point => ({
        ...point,
        name: point.timestamp.toLocaleString(), // Use the timestamp as the name property
        value: point.value
      }));
    } else if (selectedTag === "totalFlow") {
      // Use totalFlow value
      return filteredHistoryData.map(point => {
        // For demo, we'll create a synthetic totalFlow that increases over time
        const totalIndex = selectedFlowMeter.historyData.findIndex(p => 
          p.timestamp.getTime() === point.timestamp.getTime()
        );
        const totalFlowValue = selectedFlowMeter.totalFlow * 
          (totalIndex / selectedFlowMeter.historyData.length);
        
        return {
          timestamp: point.timestamp,
          name: point.timestamp.toLocaleString(),
          value: totalFlowValue
        };
      });
    } else {
      // For consumption (delta of totalFlow)
      const result = [];
      let previousTotalFlow = 0;
      
      for (let i = 0; i < filteredHistoryData.length; i++) {
        const point = filteredHistoryData[i];
        // For demo, we'll create a synthetic totalFlow that increases over time
        const totalIndex = selectedFlowMeter.historyData.findIndex(p => 
          p.timestamp.getTime() === point.timestamp.getTime()
        );
        const totalFlowValue = selectedFlowMeter.totalFlow * 
          (totalIndex / selectedFlowMeter.historyData.length);
        
        const consumption = i === 0 ? 0 : totalFlowValue - previousTotalFlow;
        previousTotalFlow = totalFlowValue;
        
        result.push({
          timestamp: point.timestamp,
          name: point.timestamp.toLocaleString(),
          value: consumption
        });
      }
      
      return result;
    }
  }, [selectedFlowMeter, selectedTag, filteredHistoryData]);
  
  // Get unit based on selected tag
  const getUnitForTag = useMemo(() => {
    if (!selectedFlowMeter) return "";
    
    if (selectedTag === "flowRate") {
      return selectedFlowMeter.unit;
    } else {
      // Convert unit for total flow or consumption
      if (selectedFlowMeter.unit === "L/min") {
        return "L";
      } else if (selectedFlowMeter.unit === "m³/h") {
        return "m³";
      }
      return selectedFlowMeter.unit.replace("/h", "").replace("/min", "");
    }
  }, [selectedFlowMeter, selectedTag]);
  
  const handleSelectFlowMeter = (value: string) => {
    setSelectedFlowMeterId(parseInt(value));
  };
  
  const handleSelectTag = (value: string) => {
    setSelectedTag(value as TagType);
  };
  
  // Get chart title based on selected tag
  const getChartTitle = () => {
    if (!selectedFlowMeter) return "";
    
    let tagName = "";
    switch(selectedTag) {
      case "flowRate":
        tagName = "Flow Rate";
        break;
      case "totalFlow":
        tagName = "Total Flow";
        break;
      case "consumption":
        tagName = "Consumption";
        break;
    }
    
    return `${selectedFlowMeter.name} - ${tagName} Trend`;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Flow Meter Trends</h2>
        <div className="flex items-center gap-2">
          <Select
            value={effectiveSelectedId?.toString() || ""}
            onValueChange={handleSelectFlowMeter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select flow meter" />
            </SelectTrigger>
            <SelectContent>
              {flowMeters.map(meter => (
                <SelectItem key={meter.id} value={meter.id.toString()}>
                  {meter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {selectedFlowMeter ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">
                  Current Value:
                  <span className="ml-2 font-bold text-xl">
                    {selectedFlowMeter.value.toFixed(2)} {selectedFlowMeter.unit}
                  </span>
                </CardTitle>
                <Badge variant={
                  selectedFlowMeter.status === 'normal' ? 'success' :
                  selectedFlowMeter.status === 'warning' ? 'secondary' : 'destructive'
                }>
                  {selectedFlowMeter.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Last updated: {selectedFlowMeter.lastUpdate.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">
                  Total Flow:
                  <span className="ml-2 font-bold text-xl">
                    {selectedFlowMeter.totalFlow.toFixed(2)} {getUnitForTag}
                  </span>
                </CardTitle>
                <Badge variant="outline">
                  COMPUTED TAG
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Calculated value based on cumulative flow rates
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Time Range Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RadioGroup 
                  value={timeRange} 
                  onValueChange={(v) => handleTimeRangeChange(v as TimeRangeType)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last24h" id="last24h" />
                    <Label htmlFor="last24h">Last 24 Hours</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last7d" id="last7d" />
                    <Label htmlFor="last7d">Last 7 Days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last30d" id="last30d" />
                    <Label htmlFor="last30d">Last 30 Days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Custom</Label>
                  </div>
                </RadioGroup>
                
                {timeRange === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date & Time</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date & Time</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Tag to Display</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={selectedTag} 
                onValueChange={handleSelectTag}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="flowRate" id="flowRate" />
                  <Label htmlFor="flowRate">Flow Rate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="totalFlow" id="totalFlow" />
                  <Label htmlFor="totalFlow">Total Flow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="consumption" id="consumption" />
                  <Label htmlFor="consumption">Consumption (Delta)</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          
          <ZoomableChart 
            data={formattedChartData} 
            title={getChartTitle()}
            lineDataKey="value"
            xAxisLabel="Time"
            yAxisLabel={getUnitForTag}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="text-xl font-medium mb-2">No Flow Meter Selected</div>
          <p className="text-muted-foreground mb-6">
            Please select a flow meter to view its trend data
          </p>
        </div>
      )}
    </div>
  );
};

export default TrendsPage;
