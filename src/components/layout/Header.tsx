
import React from "react";
import { Button } from "@/components/ui/button";
import { useFlowData } from "@/context/FlowDataContext";
import { Database } from "lucide-react";

export const Header: React.FC = () => {
  const { isConnected, toggleConnection, isLoading } = useFlowData();
  
  return (
    <header className="h-16 border-b border-border/40 px-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold">Modbus TCP Data Logger</h1>
      </div>
      <div>
        <Button
          variant={isConnected ? "destructive" : "default"}
          size="sm"
          onClick={toggleConnection}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          {isLoading ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
        </Button>
      </div>
    </header>
  );
};
