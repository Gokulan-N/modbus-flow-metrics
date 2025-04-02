
import React, { useState } from "react";
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
import { ZoomableChart } from "@/components/charts/ZoomableChart";
import { Badge } from "@/components/ui/badge";

const TrendsPage: React.FC = () => {
  const { flowMeters, selectedFlowMeterId, setSelectedFlowMeterId } = useFlowData();
  
  // Select first flow meter by default if none is selected
  const effectiveSelectedId = selectedFlowMeterId || (flowMeters.length > 0 ? flowMeters[0].id : null);
  
  const selectedFlowMeter = flowMeters.find(fm => fm.id === effectiveSelectedId);
  
  const handleSelectFlowMeter = (value: string) => {
    setSelectedFlowMeterId(parseInt(value));
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
          
          <ZoomableChart data={selectedFlowMeter} />
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
