
import React from "react";
import { FlowMeterGrid } from "@/components/dashboard/FlowMeterGrid";
import { useFlowData } from "@/context/FlowDataContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Dashboard: React.FC = () => {
  const { connectedIds, isLoading } = useFlowData();
  const navigate = useNavigate();
  
  const hasActiveConnections = connectedIds.length > 0;
  
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
