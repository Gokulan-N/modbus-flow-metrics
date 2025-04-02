
import React from "react";
import { FlowMeterCard } from "./FlowMeterCard";
import { useFlowData } from "@/context/FlowDataContext";

interface FlowMeterGridProps {
  selectable?: boolean;
}

export const FlowMeterGrid: React.FC<FlowMeterGridProps> = ({ selectable = false }) => {
  const { flowMeters, selectedFlowMeterId, setSelectedFlowMeterId } = useFlowData();
  
  const handleSelect = (id: number) => {
    if (selectable) {
      if (selectedFlowMeterId === id) {
        setSelectedFlowMeterId(null);
      } else {
        setSelectedFlowMeterId(id);
      }
    }
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {flowMeters.map(flowMeter => (
        <FlowMeterCard 
          key={flowMeter.id} 
          flowMeter={flowMeter} 
          isSelected={selectable && selectedFlowMeterId === flowMeter.id}
          onSelect={selectable ? handleSelect : undefined}
        />
      ))}
    </div>
  );
};
