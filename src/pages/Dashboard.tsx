
import React from "react";
import { FlowMeterGrid } from "@/components/dashboard/FlowMeterGrid";
import { useFlowData } from "@/context/FlowDataContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { isConnected, toggleConnection, isLoading } = useFlowData();
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Flow Meters Dashboard</h2>
        <div className="flex gap-2">
          {!isConnected && (
            <Button
              onClick={toggleConnection}
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Connect to Modbus"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/trends")}
          >
            View Trends
          </Button>
        </div>
      </div>
      
      {!isConnected && !isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="text-xl font-medium mb-2">Not Connected to Modbus Server</div>
          <p className="text-muted-foreground mb-6">
            Connect to the Modbus server to view real-time flow meter data
          </p>
          <Button
            onClick={toggleConnection}
            size="lg"
          >
            Connect Now
          </Button>
        </div>
      ) : (
        <FlowMeterGrid />
      )}
    </div>
  );
};

export default Dashboard;
