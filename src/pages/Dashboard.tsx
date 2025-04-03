
import React from "react";
import { FlowMeterGrid } from "@/components/dashboard/FlowMeterGrid";
import { useFlowData } from "@/context/FlowDataContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfDay } from "date-fns";
import { TrendingUp } from "lucide-react";

const Dashboard: React.FC = () => {
  const { connectedIds, isLoading, flowMeters } = useFlowData();
  const navigate = useNavigate();
  
  const hasActiveConnections = connectedIds.length > 0;
  
  // Calculate today's consumption for each flow meter
  const getTodayConsumption = (flowMeterId: number) => {
    const flowMeter = flowMeters.find(fm => fm.id === flowMeterId);
    if (!flowMeter) return 0;
    
    const today = startOfDay(new Date());
    
    // For this demo, just return a portion of the total flow as today's consumption
    return flowMeter.totalFlow * 0.15 * (1 + Math.random() * 0.2);
  };
  
  // Format the consumption unit based on the flow meter unit
  const getConsumptionUnit = (unit: string) => {
    if (unit === "L/min") return "L";
    if (unit === "m³/h") return "m³";
    return unit.replace("/h", "").replace("/min", "");
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Flow Meters Dashboard</h2>
        <div className="flex gap-2 items-center">
          <Badge 
            variant={hasActiveConnections ? "success" : "destructive"}
            className="mr-2"
          >
            {hasActiveConnections ? "Connected" : "Disconnected"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => navigate("/trends")}
          >
            View Trends
          </Button>
        </div>
      </div>
      
      {/* Today's Consumption Overview */}
      {hasActiveConnections && !isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {flowMeters.map(flowMeter => {
            const consumption = getTodayConsumption(flowMeter.id);
            return (
              <Card key={`consumption-${flowMeter.id}`} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{flowMeter.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold">
                        {consumption.toFixed(1)} {getConsumptionUnit(flowMeter.unit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Consumption Today ({format(new Date(), "MMM d")})
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {!hasActiveConnections && !isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="text-xl font-medium mb-2">Not Connected to Modbus Server</div>
          <p className="text-muted-foreground mb-6">
            Please use the Configuration page to connect to Modbus server
          </p>
          <Button
            onClick={() => navigate("/configuration")}
            size="lg"
          >
            Go to Configuration
          </Button>
        </div>
      ) : (
        <FlowMeterGrid />
      )}
    </div>
  );
};

export default Dashboard;
