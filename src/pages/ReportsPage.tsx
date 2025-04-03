
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
import { 
  FileText, 
  Download, 
  FileDown, 
  CalendarClock, 
  Mail, 
  Clock, 
  Edit, 
  Trash2 
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

// Expand the Input component from the previous version
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

// Mock scheduled report type
interface ScheduledReport {
  id: number;
  name: string;
  flowMeterIds: number[];
  frequency: "daily" | "weekly" | "monthly";
  format: "summary" | "hourly" | "raw";
  recipients: string[];
  lastSent?: Date;
  nextSchedule: Date;
  enabled: boolean;
}

// Mock report for demonstration
const mockReports: ScheduledReport[] = [
  {
    id: 1,
    name: "Daily Flow Summary",
    flowMeterIds: [1, 2],
    frequency: "daily",
    format: "summary",
    recipients: ["operations@example.com"],
    lastSent: new Date(Date.now() - 24 * 60 * 60 * 1000),
    nextSchedule: new Date(Date.now() + 24 * 60 * 60 * 1000),
    enabled: true
  },
  {
    id: 2,
    name: "Weekly Consumption Report",
    flowMeterIds: [1, 3],
    frequency: "weekly",
    format: "hourly",
    recipients: ["manager@example.com", "supervisor@example.com"],
    lastSent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextSchedule: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    enabled: true
  }
];

// Mock report data for demonstration
const mockReportData = {
  summary: [
    { period: "Mar 01", startValue: 100250, endValue: 100310, consumption: 60 },
    { period: "Mar 02", startValue: 100310, endValue: 100380, consumption: 70 },
    { period: "Mar 03", startValue: 100380, endValue: 100430, consumption: 50 },
  ],
  hourly: [
    { period: "Mar 01 08:00", startValue: 100250, endValue: 100265, consumption: 15 },
    { period: "Mar 01 09:00", startValue: 100265, endValue: 100278, consumption: 13 },
    { period: "Mar 01 10:00", startValue: 100278, endValue: 100290, consumption: 12 },
    { period: "Mar 01 11:00", startValue: 100290, endValue: 100310, consumption: 20 },
  ],
  raw: [
    { period: "Mar 01 08:05:10", value: 100252, consumption: 2 },
    { period: "Mar 01 08:10:10", value: 100255, consumption: 3 },
    { period: "Mar 01 08:15:10", value: 100258, consumption: 3 },
    { period: "Mar 01 08:20:10", value: 100262, consumption: 4 },
    { period: "Mar 01 08:25:10", value: 100265, consumption: 3 },
  ]
};

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
  const [reportFormat, setReportFormat] = useState<"summary" | "hourly" | "raw">("summary");
  
  // Scheduled reports state
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(mockReports);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [currentScheduledReport, setCurrentScheduledReport] = useState<ScheduledReport | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
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
        description: `Your ${reportFormat} report has been generated successfully`
      });
    }, 2000);
  };
  
  const downloadReport = () => {
    // In a real application, this would download the actual report file
    toast({
      title: "Report Downloaded",
      description: `Flow meter ${reportFormat} report has been downloaded`
    });
  };
  
  // Schedule report dialog handlers
  const openAddScheduleDialog = () => {
    setIsEditMode(false);
    const newId = Math.max(0, ...scheduledReports.map(r => r.id)) + 1;
    setCurrentScheduledReport({
      id: newId,
      name: "New Scheduled Report",
      flowMeterIds: [],
      frequency: "daily",
      format: "summary",
      recipients: [],
      nextSchedule: addDays(new Date(), 1),
      enabled: true
    });
    setIsScheduleDialogOpen(true);
  };
  
  const openEditScheduleDialog = (report: ScheduledReport) => {
    setIsEditMode(true);
    setCurrentScheduledReport({...report});
    setIsScheduleDialogOpen(true);
  };
  
  const handleDeleteScheduledReport = (id: number) => {
    setScheduledReports(scheduledReports.filter(report => report.id !== id));
    toast({
      title: "Scheduled Report Deleted",
      description: "The scheduled report has been removed"
    });
  };
  
  const handleSaveScheduledReport = () => {
    if (!currentScheduledReport) return;
    
    // Validation
    if (!currentScheduledReport.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Report name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (currentScheduledReport.flowMeterIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one flow meter must be selected",
        variant: "destructive"
      });
      return;
    }
    
    if (currentScheduledReport.recipients.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one email recipient is required",
        variant: "destructive"
      });
      return;
    }
    
    if (isEditMode) {
      setScheduledReports(reports => reports.map(report => 
        report.id === currentScheduledReport.id ? currentScheduledReport : report
      ));
      toast({
        title: "Scheduled Report Updated",
        description: "The scheduled report has been updated successfully"
      });
    } else {
      setScheduledReports(prev => [...prev, currentScheduledReport]);
      toast({
        title: "Scheduled Report Created",
        description: "A new scheduled report has been created"
      });
    }
    
    setIsScheduleDialogOpen(false);
  };
  
  // Toggle scheduled report enabled state
  const toggleReportEnabled = (id: number) => {
    setScheduledReports(reports => reports.map(report => 
      report.id === id ? {...report, enabled: !report.enabled} : report
    ));
    
    const report = scheduledReports.find(r => r.id === id);
    if (report) {
      toast({
        title: report.enabled ? "Report Disabled" : "Report Enabled",
        description: `Scheduled report "${report.name}" has been ${report.enabled ? "disabled" : "enabled"}`
      });
    }
  };
  
  // Helper function to get frequency display name
  const getFrequencyDisplay = (frequency: ScheduledReport['frequency']) => {
    switch (frequency) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
    }
  };
  
  // Helper function to get format display name
  const getFormatDisplay = (format: ScheduledReport['format']) => {
    switch (format) {
      case "summary": return "Daily Summary";
      case "hourly": return "Hourly Detail";
      case "raw": return "Raw Data";
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>
      
      <Tabs defaultValue="generate">
        <TabsList className="mb-4">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          {reportGenerated && (
            <TabsTrigger value="preview">Report Preview</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generate Flow Meter Report</CardTitle>
              <CardDescription>Create reports with flow meter data for your selected time period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Report Format</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="formatSummary" 
                      checked={reportFormat === "summary"}
                      onChange={() => setReportFormat("summary")}
                      className="h-4 w-4"
                    />
                    <label htmlFor="formatSummary">Daily Summary</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="formatHourly" 
                      checked={reportFormat === "hourly"}
                      onChange={() => setReportFormat("hourly")}
                      className="h-4 w-4"
                    />
                    <label htmlFor="formatHourly">Hourly Detail</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="formatRaw" 
                      checked={reportFormat === "raw"}
                      onChange={() => setReportFormat("raw")}
                      className="h-4 w-4"
                    />
                    <label htmlFor="formatRaw">Raw Data</label>
                  </div>
                </div>
              </div>
              
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
        </TabsContent>
        
        <TabsContent value="scheduled">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Scheduled Reports</CardTitle>
                <CardDescription>Configure automated report delivery via email</CardDescription>
              </div>
              <Button 
                onClick={openAddScheduleDialog}
                className="flex items-center gap-1"
              >
                <CalendarClock className="h-4 w-4" />
                Schedule New Report
              </Button>
            </CardHeader>
            <CardContent>
              {scheduledReports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Next Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{getFrequencyDisplay(report.frequency)}</TableCell>
                        <TableCell>{getFormatDisplay(report.format)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            <span>{report.recipients.length}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(report.nextSchedule, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.enabled ? "success" : "outline"}>
                            {report.enabled ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => toggleReportEnabled(report.id)}
                            >
                              <Clock className={cn(
                                "h-4 w-4",
                                report.enabled ? "text-green-500" : "text-muted-foreground"
                              )} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditScheduleDialog(report)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteScheduledReport(report.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarClock className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <h4 className="text-base font-medium mb-2">No Scheduled Reports</h4>
                  <p className="text-sm mb-4">Create scheduled reports to automatically receive flow meter data</p>
                  <Button 
                    variant="outline"
                    onClick={openAddScheduleDialog}
                  >
                    Schedule Your First Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {reportGenerated && (
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
                <CardDescription>
                  {reportFormat === "summary" && "Daily consumption summary report"}
                  {reportFormat === "hourly" && "Hourly consumption detailed report"}
                  {reportFormat === "raw" && "Raw data points report"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time Period</TableHead>
                      {reportFormat !== "raw" && <TableHead>Start Value</TableHead>}
                      {reportFormat !== "raw" && <TableHead>End Value</TableHead>}
                      {reportFormat === "raw" && <TableHead>Actual Value</TableHead>}
                      <TableHead>Consumption</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportFormat === "summary" && mockReportData.summary.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.period}</TableCell>
                        <TableCell>{row.startValue.toFixed(2)}</TableCell>
                        <TableCell>{row.endValue.toFixed(2)}</TableCell>
                        <TableCell>{row.consumption.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    
                    {reportFormat === "hourly" && mockReportData.hourly.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.period}</TableCell>
                        <TableCell>{row.startValue.toFixed(2)}</TableCell>
                        <TableCell>{row.endValue.toFixed(2)}</TableCell>
                        <TableCell>{row.consumption.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    
                    {reportFormat === "raw" && mockReportData.raw.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.period}</TableCell>
                        <TableCell>{row.value.toFixed(2)}</TableCell>
                        <TableCell>{row.consumption.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={downloadReport}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Scheduled Report Add/Edit Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Scheduled Report" : "Create Scheduled Report"}</DialogTitle>
            <DialogDescription>
              Configure automated reporting for flow meter data
            </DialogDescription>
          </DialogHeader>
          
          {currentScheduledReport && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name</Label>
                <Input 
                  id="reportName" 
                  value={currentScheduledReport.name}
                  onChange={(e) => setCurrentScheduledReport({
                    ...currentScheduledReport, 
                    name: e.target.value
                  })}
                  placeholder="Enter report name"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Report Frequency</Label>
                  <Select 
                    value={currentScheduledReport.frequency}
                    onValueChange={(value) => setCurrentScheduledReport({
                      ...currentScheduledReport, 
                      frequency: value as "daily" | "weekly" | "monthly"
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="format">Report Format</Label>
                  <Select 
                    value={currentScheduledReport.format}
                    onValueChange={(value) => setCurrentScheduledReport({
                      ...currentScheduledReport, 
                      format: value as "summary" | "hourly" | "raw"
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Daily Summary</SelectItem>
                      <SelectItem value="hourly">Hourly Detail</SelectItem>
                      <SelectItem value="raw">Raw Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Flow Meters to Include</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                  {flowMeters.map(flowMeter => (
                    <div 
                      key={flowMeter.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox 
                        id={`schedule-flowMeter-${flowMeter.id}`} 
                        checked={currentScheduledReport.flowMeterIds.includes(flowMeter.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCurrentScheduledReport({
                              ...currentScheduledReport,
                              flowMeterIds: [...currentScheduledReport.flowMeterIds, flowMeter.id]
                            });
                          } else {
                            setCurrentScheduledReport({
                              ...currentScheduledReport,
                              flowMeterIds: currentScheduledReport.flowMeterIds.filter(id => id !== flowMeter.id)
                            });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`schedule-flowMeter-${flowMeter.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {flowMeter.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipients">Email Recipients (comma separated)</Label>
                <Input 
                  id="recipients"
                  value={currentScheduledReport.recipients.join(", ")}
                  onChange={(e) => setCurrentScheduledReport({
                    ...currentScheduledReport,
                    recipients: e.target.value.split(",").map(email => email.trim()).filter(email => email)
                  })}
                  placeholder="e.g. manager@example.com, supervisor@example.com"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="reportEnabled"
                  checked={currentScheduledReport.enabled}
                  onCheckedChange={(checked) => setCurrentScheduledReport({
                    ...currentScheduledReport,
                    enabled: checked
                  })}
                />
                <Label htmlFor="reportEnabled">Enable Scheduled Report</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveScheduledReport}>
              {isEditMode ? "Update Report" : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsPage;
