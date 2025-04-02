
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

type TagType = "flowRate" | "totalFlow";

const TrendsPage: React.FC = () => {
  const { flowMeters, selectedFlowMeterId, setSelectedFlowMeterId } = useFlowData();
  const [selectedTag, setSelectedTag] = useState<TagType>("flowRate");
  
  // Select first flow meter by default if none is selected
  const effectiveSelectedId = selectedFlowMeterId || (flowMeters.length > 0 ? flowMeters[0].id : null);
  
  const selectedFlowMeter = flowMeters.find(fm => fm.id === effectiveSelectedId);
  
  // Transform history data to include a name property for the chart
  const formattedChartData = useMemo(() => {
    if (!selectedFlowMeter) return [];
    
    if (selectedTag === "flowRate") {
      return selectedFlowMeter.historyData.map(point => ({
        ...point,
        name: point.timestamp.toLocaleString(), // Use the timestamp as the name property
        value: point.value
      }));
    } else {
      // For total flow, we need to calculate cumulative values
      // Let's create a synthetic dataset based on totalFlow value
      // We'll distribute the total evenly across the time points
      const dataLength = selectedFlowMeter.historyData.length;
      if (dataLength === 0) return [];
      
      // Get even steps for visualization purposes
      const step = selectedFlowMeter.totalFlow / dataLength;
      
      return selectedFlowMeter.historyData.map((point, index) => ({
        timestamp: point.timestamp,
        name: point.timestamp.toLocaleString(),
        value: step * (index + 1) // Increasing value
      }));
    }
  }, [selectedFlowMeter, selectedTag]);
  
  // Get unit based on selected tag
  const getUnitForTag = useMemo(() => {
    if (!selectedFlowMeter) return "";
    
    if (selectedTag === "flowRate") {
      return selectedFlowMeter.unit;
    } else {
      // Convert unit for total flow
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
    
    return `${selectedFlowMeter.name} - ${selectedTag === "flowRate" ? "Flow Rate" : "Total Flow"} Trend`;
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
