
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { AlarmConfig } from "@/types";
import { useFlowData } from "@/context/FlowDataContext";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Edit, Trash2, Mail } from "lucide-react";

// Mock alarm data to demonstrate functionality
const mockAlarms: AlarmConfig[] = [
  {
    id: 1,
    flowMeterId: 1,
    name: "High Flow Rate Alarm",
    highLimit: 100,
    deadband: 2,
    enabled: true,
    severity: "high",
    notifyViaEmail: true,
    emailRecipients: ["operator@example.com"]
  },
  {
    id: 2,
    flowMeterId: 2,
    name: "Low Flow Rate Alarm",
    lowLimit: 10,
    deadband: 1,
    enabled: true,
    severity: "medium",
    notifyViaEmail: false,
  },
  {
    id: 3,
    flowMeterId: 3,
    name: "Flow Rate Out of Range",
    highLimit: 150,
    lowLimit: 5,
    deadband: 3,
    enabled: false,
    severity: "critical",
    notifyViaEmail: true,
    emailRecipients: ["manager@example.com", "operator@example.com"]
  }
];

// Define the maximum number of alarms allowed (License limit)
const MAX_ALARMS_ALLOWED = 10;

const AlarmsPage = () => {
  const { flowMeters } = useFlowData();
  const [alarms, setAlarms] = useState<AlarmConfig[]>(mockAlarms);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState<AlarmConfig | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const { toast } = useToast();

  const handleAddAlarm = () => {
    if (alarms.length >= MAX_ALARMS_ALLOWED) {
      toast({
        title: "License Limit Reached",
        description: `You can only create up to ${MAX_ALARMS_ALLOWED} alarms with your current license.`,
        variant: "destructive"
      });
      return;
    }

    setIsAddMode(true);
    setCurrentAlarm({
      id: Math.max(0, ...alarms.map(a => a.id)) + 1,
      flowMeterId: flowMeters[0]?.id || 0,
      name: "New Alarm",
      deadband: 1,
      enabled: true,
      severity: "medium",
      notifyViaEmail: false
    });
    setIsDialogOpen(true);
  };

  const handleEditAlarm = (alarm: AlarmConfig) => {
    setIsAddMode(false);
    setCurrentAlarm({...alarm});
    setIsDialogOpen(true);
  };

  const handleDeleteAlarm = (id: number) => {
    setAlarms(alarms.filter(alarm => alarm.id !== id));
    toast({
      title: "Alarm Deleted",
      description: "The alarm has been successfully removed."
    });
  };

  const handleSaveAlarm = () => {
    if (!currentAlarm) return;

    // Validation
    if (!currentAlarm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Alarm name is required.",
        variant: "destructive"
      });
      return;
    }

    if (isAddMode) {
      setAlarms([...alarms, currentAlarm]);
      toast({
        title: "Alarm Created",
        description: "New alarm has been successfully created."
      });
    } else {
      setAlarms(alarms.map(alarm => alarm.id === currentAlarm.id ? currentAlarm : alarm));
      toast({
        title: "Alarm Updated",
        description: "Alarm has been successfully updated."
      });
    }
    
    setIsDialogOpen(false);
  };

  const getSeverityBadge = (severity: AlarmConfig['severity']) => {
    switch (severity) {
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="bg-purple-700">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getFlowMeterName = (flowMeterId: number) => {
    const flowMeter = flowMeters.find(fm => fm.id === flowMeterId);
    return flowMeter ? flowMeter.name : `Flow Meter ${flowMeterId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Alarms Configuration</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="mr-2">
            {alarms.length}/{MAX_ALARMS_ALLOWED} Alarms
          </Badge>
          <Button 
            onClick={handleAddAlarm}
            disabled={alarms.length >= MAX_ALARMS_ALLOWED}
          >
            Add Alarm
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Alarms</CardTitle>
          <CardDescription>
            Manage all flow meter alarms and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Flow Meter</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notifications</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alarms.map(alarm => (
                  <TableRow key={alarm.id}>
                    <TableCell className="font-medium">{alarm.name}</TableCell>
                    <TableCell>{getFlowMeterName(alarm.flowMeterId)}</TableCell>
                    <TableCell>
                      {alarm.highLimit !== undefined && <div>High: {alarm.highLimit}</div>}
                      {alarm.lowLimit !== undefined && <div>Low: {alarm.lowLimit}</div>}
                      <div className="text-xs text-muted-foreground">Deadband: {alarm.deadband}</div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(alarm.severity)}</TableCell>
                    <TableCell>
                      <Badge variant={alarm.enabled ? "success" : "outline"}>
                        {alarm.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {alarm.notifyViaEmail ? (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-blue-500" />
                          <span className="text-xs">
                            {alarm.emailRecipients?.length || 0} recipients
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No email</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditAlarm(alarm)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteAlarm(alarm.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {alarms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Bell className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                      <p className="text-muted-foreground">No alarms configured yet</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={handleAddAlarm}
                      >
                        Add your first alarm
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alarm Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isAddMode ? "Add New Alarm" : "Edit Alarm"}</DialogTitle>
            <DialogDescription>
              Configure alarm settings for flow meter monitoring
            </DialogDescription>
          </DialogHeader>
          
          {currentAlarm && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Alarm Name</Label>
                  <Input 
                    id="name" 
                    value={currentAlarm.name}
                    onChange={(e) => setCurrentAlarm({...currentAlarm, name: e.target.value})}
                    placeholder="Enter alarm name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flowMeter">Flow Meter</Label>
                  <Select 
                    value={currentAlarm.flowMeterId.toString()}
                    onValueChange={(value) => setCurrentAlarm({...currentAlarm, flowMeterId: Number(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select flow meter" />
                    </SelectTrigger>
                    <SelectContent>
                      {flowMeters.map(fm => (
                        <SelectItem key={fm.id} value={fm.id.toString()}>
                          {fm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="highLimit">High Limit</Label>
                  <Input 
                    id="highLimit" 
                    type="number"
                    value={currentAlarm.highLimit?.toString() || ""}
                    onChange={(e) => setCurrentAlarm({
                      ...currentAlarm, 
                      highLimit: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowLimit">Low Limit</Label>
                  <Input 
                    id="lowLimit" 
                    type="number"
                    value={currentAlarm.lowLimit?.toString() || ""}
                    onChange={(e) => setCurrentAlarm({
                      ...currentAlarm, 
                      lowLimit: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadband">Deadband</Label>
                  <Input 
                    id="deadband" 
                    type="number"
                    value={currentAlarm.deadband}
                    onChange={(e) => setCurrentAlarm({
                      ...currentAlarm, 
                      deadband: Number(e.target.value) || 0
                    })}
                    placeholder="Enter deadband value"
                  />
                  <p className="text-xs text-muted-foreground">
                    Prevents alarm from triggering when value is near the threshold
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select 
                    value={currentAlarm.severity}
                    onValueChange={(value) => setCurrentAlarm({
                      ...currentAlarm, 
                      severity: value as "low" | "medium" | "high" | "critical"
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enabled"
                    checked={currentAlarm.enabled}
                    onCheckedChange={(value) => setCurrentAlarm({...currentAlarm, enabled: value})}
                  />
                  <Label htmlFor="enabled">Alarm Enabled</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="notifyEmail"
                    checked={currentAlarm.notifyViaEmail}
                    onCheckedChange={(value) => setCurrentAlarm({...currentAlarm, notifyViaEmail: value})}
                  />
                  <Label htmlFor="notifyEmail">Email Notifications</Label>
                </div>
              </div>
              
              {currentAlarm.notifyViaEmail && (
                <div className="space-y-2">
                  <Label htmlFor="emails">Email Recipients (comma separated)</Label>
                  <Input 
                    id="emails"
                    value={currentAlarm.emailRecipients?.join(", ") || ""}
                    onChange={(e) => setCurrentAlarm({
                      ...currentAlarm, 
                      emailRecipients: e.target.value.split(",").map(email => email.trim()).filter(email => email)
                    })}
                    placeholder="e.g. operator@example.com, manager@example.com"
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAlarm}>
              {isAddMode ? "Create Alarm" : "Update Alarm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlarmsPage;
