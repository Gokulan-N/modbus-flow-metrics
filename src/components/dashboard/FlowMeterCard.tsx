
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowMeter } from "@/types";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface FlowMeterCardProps {
  flowMeter: FlowMeter;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
}

export const FlowMeterCard: React.FC<FlowMeterCardProps> = ({ 
  flowMeter, 
  isSelected = false,
  onSelect
}) => {
  const navigate = useNavigate();
  
  // Format data for the chart (last 12 points only for mini chart)
  const chartData = flowMeter.historyData
    .slice(-12)
    .map(point => ({
      time: point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: point.value
    }));
  
  // Get min and max values for chart domain with 10% padding
  const values = flowMeter.historyData.map(point => point.value);
  const minValue = Math.max(0, Math.min(...values) * 0.9);
  const maxValue = Math.max(...values) * 1.1;
  
  // Handle click on the card
  const handleClick = () => {
    if (onSelect) {
      onSelect(flowMeter.id);
    } else {
      navigate(`/trends?meterId=${flowMeter.id}`);
    }
  };
  
  // Get unit for total flow (converting if needed)
  const getTotalFlowUnit = () => {
    // If the flow rate is in L/min, total flow will be in L
    // If the flow rate is in m³/h, total flow will be in m³
    if (flowMeter.unit === "L/min") {
      return "L";
    } else if (flowMeter.unit === "m³/h") {
      return "m³";
    }
    return flowMeter.unit.replace("/h", "").replace("/min", "");
  };
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer",
        isSelected && "ring-2 ring-primary",
        flowMeter.status === "error" && "border-red-500",
        flowMeter.status === "warning" && "border-yellow-500"
      )}
      onClick={handleClick}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium">{flowMeter.name}</CardTitle>
          <div 
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              flowMeter.status === "normal" && "bg-green-500",
              flowMeter.status === "warning" && "bg-yellow-500",
              flowMeter.status === "error" && "bg-red-500"
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 pt-0">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">{flowMeter.value.toFixed(1)}</span>
            <span className="ml-1 text-sm text-muted-foreground">{flowMeter.unit}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total Flow: <span className="font-medium">{flowMeter.totalFlow.toFixed(1)}</span> {getTotalFlowUnit()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Last update: {flowMeter.lastUpdate.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${flowMeter.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                hide={true}
              />
              <YAxis 
                domain={[minValue, maxValue]} 
                hide={true}
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
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${flowMeter.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
