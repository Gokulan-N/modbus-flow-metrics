
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFlowData } from "@/context/FlowDataContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, FileDown } from "lucide-react";
import { format } from "date-fns";

const ReportsPage: React.FC = () => {
  const { flowMeters } = useFlowData();
  const [selectedFlowMeterIds, setSelectedFlowMeterIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>(
    format(new Date(Date.now() - 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const { toast } = useToast();
  
  const toggleFlowMeter = (id: number) => {
    if (selectedFlowMeterIds.includes(id)) {
      setSelectedFlowMeterIds(selectedFlowMeterIds.filter(fmId => fmId !== id));
    } else {
      setSelectedFlowMeterIds([...selectedFlowMeterIds, id]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedFlowMeterIds.length === flowMeters.length) {
      setSelectedFlowMeterIds([]);
    } else {
      setSelectedFlowMeterIds(flowMeters.map(fm => fm.id));
    }
  };
  
  const generateReport = () => {
    if (selectedFlowMeterIds.length === 0) {
      toast({
        title: "No Flow Meters Selected",
        description: "Please select at least one flow meter for the report",
        variant: "destructive"
      });
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast({
        title: "Invalid Date Range",
        description: "Please select a valid start and end date",
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
    
    // Simulate report generation
    setGeneratingReport(true);
    
    setTimeout(() => {
      setGeneratingReport(false);
      setReportGenerated(true);
      toast({
        title: "Report Generated",
        description: "Your report has been generated successfully"
      });
    }, 2000);
  };
  
  const downloadReport = () => {
    // In a real application, this would download the actual report file
    toast({
      title: "Report Downloaded",
      description: "Flow meter data report has been downloaded"
    });
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate Flow Meter Report</CardTitle>
          <CardDescription>Create reports with flow meter data for your selected time period</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-medium">Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium">Select Flow Meters</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedFlowMeterIds.length === flowMeters.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {flowMeters.map(flowMeter => (
                <div 
                  key={flowMeter.id}
                  className={cn(
                    "flex items-center space-x-2 border rounded-md p-2",
                    selectedFlowMeterIds.includes(flowMeter.id) ? "border-primary" : "border-border"
                  )}
                >
                  <Checkbox 
                    id={`flowMeter-${flowMeter.id}`} 
                    checked={selectedFlowMeterIds.includes(flowMeter.id)}
                    onCheckedChange={() => toggleFlowMeter(flowMeter.id)}
                  />
                  <Label
                    htmlFor={`flowMeter-${flowMeter.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {flowMeter.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedFlowMeterIds.length} flow meters selected
          </span>
          <div className="flex gap-2">
            {reportGenerated && (
              <Button 
                variant="outline"
                onClick={downloadReport}
                className="flex items-center gap-1"
              >
                <FileDown className="h-4 w-4" />
                Download Report
              </Button>
            )}
            <Button 
              onClick={generateReport}
              disabled={generatingReport}
              className="flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              {generatingReport ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* This would normally show a list of previous reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Access your previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          {reportGenerated ? (
            <div className="border rounded-md divide-y">
              <div className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">Flow Meter Report</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(startDate), "PPP")} to {format(new Date(endDate), "PPP")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedFlowMeterIds.length} flow meters
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={downloadReport}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h4 className="text-base font-medium mb-2">No Reports Yet</h4>
              <p className="text-sm">Generate your first report to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Add missing component from the implementation above
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export default ReportsPage;
