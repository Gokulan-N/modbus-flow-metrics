
import React, { useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

// Define a safer toFixed function that works with different value types
const safeToFixed = (value: any, digits: number): string => {
  if (typeof value === 'number') {
    return value.toFixed(digits);
  } else if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) ? num.toFixed(digits) : value;
  }
  return String(value);
};

type DataPoint = {
  name: string;
  [key: string]: any;
};

interface ZoomableChartProps {
  data: DataPoint[];
  title: string;
  description?: string;
  lineDataKey: string;
  barDataKey?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  lineColor?: string;
  barColor?: string;
  tagProperty?: string;
  displayNameProperty?: string;
}

const ZoomableChart: React.FC<ZoomableChartProps> = ({
  data,
  title,
  description,
  lineDataKey,
  barDataKey,
  yAxisLabel,
  xAxisLabel,
  lineColor = "#8884d8",
  barColor = "#82ca9d",
  tagProperty,
  displayNameProperty
}) => {
  const [left, setLeft] = useState<string | number | undefined>(undefined);
  const [right, setRight] = useState<string | number | undefined>(undefined);
  const [refAreaLeft, setRefAreaLeft] = useState<string | number | undefined>(undefined);
  const [refAreaRight, setRefAreaRight] = useState<string | number | undefined>(undefined);
  const [zoomedData, setZoomedData] = useState<DataPoint[]>(data);
  const [zoomLevel, setZoomLevel] = useState(0);
  
  // Group data by tag if tagProperty is provided
  const uniqueTags = tagProperty ? 
    [...new Set(data.map(item => item[tagProperty]))] : 
    [];
  
  // Effect to update zoomed data when data changes
  React.useEffect(() => {
    setZoomedData(data);
  }, [data]);
  
  const getAxisYDomain = useCallback((from: number, to: number, offset: number) => {
    // Get all values to determine min and max
    const values: number[] = [];
    
    for (let i = from; i <= to; i++) {
      if (data[i]) {
        if (lineDataKey && data[i][lineDataKey] !== undefined) {
          const val = Number(data[i][lineDataKey]);
          if (!isNaN(val)) values.push(val);
        }
        if (barDataKey && data[i][barDataKey] !== undefined) {
          const val = Number(data[i][barDataKey]);
          if (!isNaN(val)) values.push(val);
        }
      }
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return [
      min - (min * offset), 
      max + (max * offset)
    ];
  }, [data, lineDataKey, barDataKey]);
  
  const zoomIn = useCallback(() => {
    if (!refAreaLeft || !refAreaRight) return;
    
    let leftIndex = data.findIndex(d => d.name === refAreaLeft);
    let rightIndex = data.findIndex(d => d.name === refAreaRight);
    
    // Ensure left is before right
    if (leftIndex > rightIndex) {
      [leftIndex, rightIndex] = [rightIndex, leftIndex];
      setRefAreaLeft(refAreaRight);
      setRefAreaRight(refAreaLeft);
    }
    
    // At least 2 points required for zoom
    if (rightIndex - leftIndex < 1) {
      setRefAreaLeft(undefined);
      setRefAreaRight(undefined);
      return;
    }
    
    // Get Y domain
    const [bottom, top] = getAxisYDomain(leftIndex, rightIndex, 0.05);
    
    // Update zoomed data
    setZoomedData(data.slice(leftIndex, rightIndex + 1));
    setLeft(refAreaLeft);
    setRight(refAreaRight);
    setZoomLevel(prev => prev + 1);
    setRefAreaLeft(undefined);
    setRefAreaRight(undefined);
  }, [refAreaLeft, refAreaRight, data, getAxisYDomain]);
  
  const zoomOut = useCallback(() => {
    if (zoomLevel > 0) {
      setZoomedData(data);
      setLeft(undefined);
      setRight(undefined);
      setZoomLevel(0);
    }
  }, [data, zoomLevel]);
  
  const resetZoom = useCallback(() => {
    setZoomedData(data);
    setLeft(undefined);
    setRight(undefined);
    setZoomLevel(0);
    setRefAreaLeft(undefined);
    setRefAreaRight(undefined);
  }, [data]);
  
  const handleMouseDown = useCallback((e: any) => {
    // Only start zoom if not already zoomed
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
    }
  }, []);
  
  const handleMouseMove = useCallback((e: any) => {
    // Update right reference area only if left is set
    if (refAreaLeft && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  }, [refAreaLeft]);
  
  const handleMouseUp = useCallback(() => {
    // Trigger zoom if both reference areas are set
    if (refAreaLeft && refAreaRight) {
      zoomIn();
    }
  }, [refAreaLeft, refAreaRight, zoomIn]);
  
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`tooltip-${index}`} style={{ color: entry.color }}>
              {displayNameProperty && entry.payload[displayNameProperty] 
                ? entry.payload[displayNameProperty] 
                : entry.name}: {typeof entry.value === 'number' ? safeToFixed(entry.value, 2) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  }, [displayNameProperty]);
  
  // Determine if we need to render multiple lines for different tags
  const renderLines = () => {
    if (!tagProperty || uniqueTags.length <= 1) {
      return (
        <Line 
          type="monotone" 
          dataKey={lineDataKey} 
          stroke={lineColor} 
          dot={false}
          activeDot={{ r: 8 }}
        />
      );
    }
    
    // Use different colors for each tag
    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", "#00C49F"];
    
    return uniqueTags.map((tag, index) => {
      const color = colors[index % colors.length];
      const filteredData = data.filter(d => d[tagProperty] === tag);
      const displayName = displayNameProperty && filteredData[0] ? 
        filteredData[0][displayNameProperty] : 
        tag;
      
      return (
        <Line 
          key={`line-${tag}`}
          type="monotone" 
          dataKey={lineDataKey} 
          stroke={color}
          dot={false}
          activeDot={{ r: 8 }}
          name={displayName}
          data={zoomedData.filter(d => d[tagProperty] === tag)}
        />
      );
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomIn} 
              disabled={!refAreaLeft || !refAreaRight}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomOut} 
              disabled={zoomLevel === 0}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetZoom}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ value: xAxisLabel, position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis 
                label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {barDataKey && (
                <Bar dataKey={barDataKey} fill={barColor} />
              )}
              
              {tagProperty && uniqueTags.length > 1 ? 
                renderLines() : 
                <Line 
                  type="monotone" 
                  dataKey={lineDataKey} 
                  stroke={lineColor} 
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              }
              
              {refAreaLeft && refAreaRight && (
                <ReferenceArea 
                  x1={refAreaLeft} 
                  x2={refAreaRight} 
                  strokeOpacity={0.3}
                  fill="#8884d8" 
                  fillOpacity={0.3} 
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {zoomLevel > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-2">
            Showing zoomed data {left} to {right}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ZoomableChart;
