
import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  TooltipProps
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { FlowMeter } from "@/types";

interface ZoomableChartProps {
  data: FlowMeter;
}

export const ZoomableChart: React.FC<ZoomableChartProps> = ({ data }) => {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(data.historyData.length - 1);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<number | null>(null);
  const [selectEnd, setSelectEnd] = useState<number | null>(null);

  const chartData = data.historyData
    .slice(leftIndex, rightIndex + 1)
    .map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
      formattedTime: format(point.timestamp, "HH:mm:ss"),
      formattedDate: format(point.timestamp, "MMM dd"),
    }));

  const handleZoomIn = () => {
    if (selectStart !== null && selectEnd !== null) {
      const newLeftIndex = leftIndex + Math.floor(selectStart * (rightIndex - leftIndex) / 100);
      const newRightIndex = leftIndex + Math.ceil(selectEnd * (rightIndex - leftIndex) / 100);
      
      if (newRightIndex - newLeftIndex >= 2) { // Ensure we don't zoom in too much
        setLeftIndex(newLeftIndex);
        setRightIndex(newRightIndex);
      }
      
      // Reset selection
      setSelectStart(null);
      setSelectEnd(null);
    }
  };

  const handleZoomOut = () => {
    const range = rightIndex - leftIndex;
    const newLeftIndex = Math.max(0, leftIndex - Math.floor(range / 2));
    const newRightIndex = Math.min(data.historyData.length - 1, rightIndex + Math.floor(range / 2));
    
    setLeftIndex(newLeftIndex);
    setRightIndex(newRightIndex);
    
    // Reset selection
    setSelectStart(null);
    setSelectEnd(null);
  };

  const handleReset = () => {
    setLeftIndex(0);
    setRightIndex(data.historyData.length - 1);
    setSelectStart(null);
    setSelectEnd(null);
  };

  const handleMouseDown = (e: any) => {
    setIsSelecting(true);
    setSelectStart(e?.activeLabel ? 
      chartData.findIndex(d => d.formattedTime === e.activeLabel) / chartData.length * 100 : 0);
  };

  const handleMouseMove = (e: any) => {
    if (isSelecting && selectStart !== null && e?.activeLabel) {
      const currentPosition = chartData.findIndex(d => d.formattedTime === e.activeLabel) / chartData.length * 100;
      setSelectEnd(currentPosition);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    if (selectStart !== null && selectEnd !== null) {
      // Ensure start is less than end
      if (selectStart > selectEnd) {
        const temp = selectStart;
        setSelectStart(selectEnd);
        setSelectEnd(temp);
      }
      
      // If the selection is too small, ignore it
      if (Math.abs(selectEnd - selectStart) < 5) {
        setSelectStart(null);
        setSelectEnd(null);
      }
    }
  };
  
  const handleSliderChange = (values: number[]) => {
    if (values.length === 2) {
      const [start, end] = values;
      const dataLength = data.historyData.length;
      
      setLeftIndex(Math.floor(start / 100 * dataLength));
      setRightIndex(Math.floor(end / 100 * dataLength));
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">{data.name} Trend</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomIn}
            disabled={selectStart === null || selectEnd === null}
          >
            <ZoomIn className="h-4 w-4 mr-1" />
            Zoom In
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-4 w-4 mr-1" />
            Zoom Out
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>
      
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="formattedTime" 
              allowDataOverflow
              label={{ value: 'Time', position: 'insideBottomRight', offset: -10 }}
            />
            <YAxis 
              allowDataOverflow
              domain={['auto', 'auto']}
              label={{ value: data.unit, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const dataPoint = payload[0].payload;
                  return (
                    <div className="bg-background border border-border p-2 rounded-md shadow-md">
                      <p className="text-sm font-medium">{format(new Date(dataPoint.timestamp), "MMM dd, yyyy HH:mm:ss")}</p>
                      <p className="text-sm">{`Value: ${payload[0].value.toFixed(2)} ${data.unit}`}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              dot={{ r: 2 }}
            />
            {selectStart !== null && selectEnd !== null && (
              <ReferenceArea
                x1={chartData[Math.floor(selectStart / 100 * chartData.length)]?.formattedTime}
                x2={chartData[Math.floor(selectEnd / 100 * chartData.length)]?.formattedTime}
                strokeOpacity={0.3}
                fill="#8884d8"
                fillOpacity={0.3}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 px-2">
        <Label>Time Range</Label>
        <Slider 
          defaultValue={[0, 100]} 
          max={100} 
          step={1}
          value={[
            leftIndex / data.historyData.length * 100,
            rightIndex / data.historyData.length * 100
          ]}
          onValueChange={handleSliderChange}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>
            {chartData[0]?.formattedDate} {chartData[0]?.formattedTime}
          </span>
          <span>
            {chartData[chartData.length - 1]?.formattedDate} {chartData[chartData.length - 1]?.formattedTime}
          </span>
        </div>
      </div>
    </Card>
  );
};
