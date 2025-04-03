
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
import { Input } from "@/components/ui/input";
import { format, subDays, subHours, subWeeks, subMonths } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TagType = "flowRate" | "totalFlow" | "consumption";
type TimeRangeType = "last24h" | "last7d" | "last30d" | "custom";

const TrendsPage: React.FC = () => {
  const { flowMeters, selectedFlowMeterId, setSelectedFlowMeterId } = useFlowData();
  const [selectedTags, setSelectedTags] = useState<TagType[]>(["flowRate"]);
  const [timeRange, setTimeRange] = useState<TimeRangeType>("last24h");
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  
  const { toast } = useToast();
  
  // Select first flow meter by default if none is selected
  const effectiveSelectedId = selectedFlowMeterId || (flowMeters.length > 0 ? flowMeters[0].id : null);
  
  const selectedFlowMeter = flowMeters.find(fm => fm.id === effectiveSelectedId);
  
  // Handle time range selection
  const handleTimeRangeChange = (value: TimeRangeType) => {
    setTimeRange(value);
    
    const now = new Date();
    let start = now;
    
    switch(value) {
      case "last24h":
        start = subHours(now, 24);
        break;
      case "last7d":
        start = subDays(now, 7);
        break;
      case "last30d":
        start = subMonths(now, 1);
        break;
      case "custom":
        // Don't change the dates for custom
        return;
    }
    
    setStartDate(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEndDate(format(now, "yyyy-MM-dd'T'HH:mm"));
  };
  
  // Handle tag selection toggle
  const toggleTag = (tag: TagType) => {
    if (selectedTags.includes(tag)) {
      // Don't allow removing the last tag
      if (selectedTags.length > 1) {
        setSelectedTags(selectedTags.filter(t => t !== tag));
      }
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // Load trend data
  const loadTrendData = () => {
    if (!selectedFlowMeter) {
      toast({
        title: "No Flow Meter Selected",
        description: "Please select a flow meter to view trend data",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedTags.length === 0) {
      toast({
        title: "No Tags Selected",
        description: "Please select at least one tag to display",
        variant: "destructive"
      });
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast({
        title: "Invalid Date Range",
        description: "Please enter valid start and end dates",
        variant: "destructive"
      });
      return;
    }
    
    if (start >= end) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date",
        variant: "destructive"
      });
      return;
    }
    
    // Filter history data based on selected time range
    const filteredHistoryData = selectedFlowMeter.historyData.filter(point => 
      point.timestamp >= start && point.timestamp <= end
    );
    
    // Format the data for the chart based on selected tags
    const formattedData = [];
    
    for (const tag of selectedTags) {
      if (tag === "flowRate") {
        formattedData.push(
          filteredHistoryData.map(point => ({
            timestamp: point.timestamp,
            name: point.timestamp.toLocaleString(),
            value: point.value,
            tag: "flowRate",
            displayName: "Flow Rate"
          }))
        );
      } else if (tag === "totalFlow") {
        // Use totalFlow value with synthetic values
        formattedData.push(
          filteredHistoryData.map(point => {
            const totalIndex = selectedFlowMeter.historyData.findIndex(p => 
              p.timestamp.getTime() === point.timestamp.getTime()
            );
            const totalFlowValue = selectedFlowMeter.totalFlow * 
              (totalIndex / selectedFlowMeter.historyData.length);
            
            return {
              timestamp: point.timestamp,
              name: point.timestamp.toLocaleString(),
              value: totalFlowValue,
              tag: "totalFlow",
              displayName: "Total Flow"
            };
          })
        );
      } else if (tag === "consumption") {
        // For consumption (delta of totalFlow)
        const result = [];
        let previousTotalFlow = 0;
        
        for (let i = 0; i < filteredHistoryData.length; i++) {
          const point = filteredHistoryData[i];
          // For demo, we'll create a synthetic totalFlow that increases over time
          const totalIndex = selectedFlowMeter.historyData.findIndex(p => 
            p.timestamp.getTime() === point.timestamp.getTime()
          );
          const totalFlowValue = selectedFlowMeter.totalFlow * 
            (totalIndex / selectedFlowMeter.historyData.length);
          
          const consumption = i === 0 ? 0 : totalFlowValue - previousTotalFlow;
          previousTotalFlow = totalFlowValue;
          
          result.push({
            timestamp: point.timestamp,
            name: point.timestamp.toLocaleString(),
            value: consumption,
            tag: "consumption",
            displayName: "Consumption"
          });
        }
        
        formattedData.push(result);
      }
    }
    
    // Flatten the data and set it for the chart
    setChartData(formattedData.flat());
    setIsChartLoaded(true);
    
    toast({
      title: "Trend Data Loaded",
      description: `Showing trend data for ${selectedFlowMeter.name}`
    });
  };
  
  // Get unit based on selected tag
  const getUnitForTag = (tag: TagType) => {
    if (!selectedFlowMeter) return "";
    
    if (tag === "flowRate") {
      return selectedFlowMeter.unit;
    } else {
      // Convert unit for total flow or consumption
      if (selectedFlowMeter.unit === "L/min") {
        return "L";
      } else if (selectedFlowMeter.unit === "m³/h") {
        return "m³";
      }
      return selectedFlowMeter.unit.replace("/h", "").replace("/min", "");
    }
  };
  
  const handleSelectFlowMeter = (value: string) => {
    setSelectedFlowMeterId(parseInt(value));
    setIsChartLoaded(false); // Reset chart when changing flow meter
  };
  
  // Get chart title
  const getChartTitle = () => {
    if (!selectedFlowMeter) return "";
    
    return `${selectedFlowMeter.name} - Trend Data`;
  };
  
  // Get appropriate unit for Y-axis based on selected tags
  const getYAxisLabel = () => {
    if (selectedTags.length === 1) {
      return getUnitForTag(selectedTags[0]);
    }
    
    // If multiple tags are selected, use a general label
    return "Value";
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
            <CardHeader>
              <CardTitle className="text-lg">Time Range Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RadioGroup 
                  value={timeRange} 
                  onValueChange={(v) => handleTimeRangeChange(v as TimeRangeType)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last24h" id="last24h" />
                    <Label htmlFor="last24h">Last 24 Hours</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last7d" id="last7d" />
                    <Label htmlFor="last7d">Last 7 Days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last30d" id="last30d" />
                    <Label htmlFor="last30d">Last 30 Days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Custom</Label>
                  </div>
                </RadioGroup>
                
                {timeRange === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date & Time</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date & Time</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Tags to Display</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="flowRate" 
                      checked={selectedTags.includes("flowRate")}
                      onCheckedChange={() => toggleTag("flowRate")}
                    />
                    <Label htmlFor="flowRate">Flow Rate ({getUnitForTag("flowRate")})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="totalFlow" 
                      checked={selectedTags.includes("totalFlow")}
                      onCheckedChange={() => toggleTag("totalFlow")}
                    />
                    <Label htmlFor="totalFlow">Total Flow ({getUnitForTag("totalFlow")})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="consumption" 
                      checked={selectedTags.includes("consumption")}
                      onCheckedChange={() => toggleTag("consumption")}
                    />
                    <Label htmlFor="consumption">Consumption ({getUnitForTag("consumption")})</Label>
                  </div>
                </div>
                
                <Button 
                  onClick={loadTrendData}
                  className="w-full sm:w-auto mt-4"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Load Trend Data
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {isChartLoaded && chartData.length > 0 ? (
            <ZoomableChart 
              data={chartData} 
              title={getChartTitle()}
              lineDataKey="value"
              xAxisLabel="Time"
              yAxisLabel={getYAxisLabel()}
              tagProperty="tag"
              displayNameProperty="displayName"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-background border rounded-lg">
              <div className="text-xl font-medium mb-2">No Trend Data Loaded</div>
              <p className="text-muted-foreground mb-6">
                Configure your settings above and click "Load Trend Data" to view the chart
              </p>
            </div>
          )}
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
