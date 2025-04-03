import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useFlowData } from "@/context/FlowDataContext";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlarmConfig } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2 } from "lucide-react";

const mockAlarms: AlarmConfig[] = [
  {
    id: 1,
    flowMeterId: 1,
    name: "High Flow Rate Alert",
    highLimit: 75,
    deadband: 2,
    enabled: true,
    severity: "medium",
    notifyViaEmail: true,
    emailRecipients: ["operator@example.com"]
  },
  {
    id: 2,
    flowMeterId: 2,
    name: "Critical Low Flow",
    lowLimit: 10,
    deadband: 1,
    enabled: true,
    severity: "critical",
    notifyViaEmail: true,
    emailRecipients: ["alerts@example.com", "manager@example.com"]
  },
  {
    id: 3,
    flowMeterId: 1,
    name: "Preventive Maintenance Notice",
    highLimit: 90,
    deadband: 5,
    enabled: false,
    severity: "low",
    notifyViaEmail: false
  }
];

const alarmFormSchema = z.object({
  flowMeterId: z.string().min(1, "Flow meter is required"),
  name: z.string().min(3, "Alarm name must be at least 3 characters"),
  highLimit: z.string().optional(),
  lowLimit: z.string().optional(),
  deadband: z.string().default("1"),
  enabled: z.boolean().default(true),
  severity: z.enum(["low", "medium", "high", "critical"]),
  notifyViaEmail: z.boolean().default(false),
  emailRecipients: z.string().optional()
});

const AlarmsPage: React.FC = () => {
  const { flowMeters, autoConnectModbus } = useFlowData();
  const [alarms, setAlarms] = useState<AlarmConfig[]>(mockAlarms);
  const [open, setOpen] = useState(false);
  
  React.useEffect(() => {
    const isClientUser = true;
    if (isClientUser) {
      autoConnectModbus(true);
    }
  }, [autoConnectModbus]);
  
  const form = useForm<z.infer<typeof alarmFormSchema>>({
    resolver: zodResolver(alarmFormSchema),
    defaultValues: {
      name: "",
      highLimit: "",
      lowLimit: "",
      deadband: "1",
      enabled: true,
      severity: "medium",
      notifyViaEmail: false,
      emailRecipients: ""
    },
  });
  
  const onSubmit = (values: z.infer<typeof alarmFormSchema>) => {
    const newAlarm: AlarmConfig = {
      id: alarms.length + 1,
      flowMeterId: parseInt(values.flowMeterId),
      name: values.name,
      highLimit: values.highLimit ? parseFloat(values.highLimit) : undefined,
      lowLimit: values.lowLimit ? parseFloat(values.lowLimit) : undefined,
      deadband: parseFloat(values.deadband || "1"),
      enabled: values.enabled,
      severity: values.severity,
      notifyViaEmail: values.notifyViaEmail,
      emailRecipients: values.emailRecipients ? values.emailRecipients.split(",").map(email => email.trim()) : []
    };
    
    setAlarms([...alarms, newAlarm]);
    setOpen(false);
    form.reset();
  };
  
  const deleteAlarm = (id: number) => {
    setAlarms(alarms.filter(alarm => alarm.id !== id));
  };
  
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "low":
        return <Badge variant="outline">Low</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "high":
        return <Badge variant="default">High</Badge>;
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };
  
  const getFlowMeterName = (id: number) => {
    const meter = flowMeters.find(fm => fm.id === id);
    return meter ? meter.name : `Flow Meter ${id}`;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Alarm Configuration</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Alarm
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Alarm</DialogTitle>
              <DialogDescription>
                Configure alarm thresholds and notification settings
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="flowMeterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flow Meter</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select flow meter" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flowMeters.map(meter => (
                            <SelectItem key={meter.id} value={meter.id.toString()}>
                              {meter.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alarm Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., High Flow Alert" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="highLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>High Limit</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lowLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Limit</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="deadband"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadband</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Prevents alarm from oscillating near threshold
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enabled</FormLabel>
                        <FormDescription>
                          Activate this alarm
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyViaEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Email Notifications</FormLabel>
                        <FormDescription>
                          Send email when alarm triggers
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("notifyViaEmail") && (
                  <FormField
                    control={form.control}
                    name="emailRecipients"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Recipients</FormLabel>
                        <FormControl>
                          <Input placeholder="email1@example.com, email2@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of email addresses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <DialogFooter>
                  <Button type="submit">Save Alarm</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Configured Alarms</CardTitle>
          <CardDescription>
            Manage alarm thresholds and notification settings for flow meters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>List of configured alarms</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Flow Meter</TableHead>
                <TableHead>Thresholds</TableHead>
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
                    {alarm.highLimit && <div>High: {alarm.highLimit}</div>}
                    {alarm.lowLimit && <div>Low: {alarm.lowLimit}</div>}
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
                      <div>
                        <Badge variant="secondary">Email</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {alarm.emailRecipients?.join(", ")}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline">None</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteAlarm(alarm.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {alarms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No alarms configured. Click "Add Alarm" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Available REST API endpoints for alarm management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">GET /api/alarms</h3>
              <p className="text-sm text-muted-foreground">
                Retrieve all configured alarms
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">POST /api/alarms</h3>
              <p className="text-sm text-muted-foreground">
                Create a new alarm configuration
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">GET /api/alarms/:id</h3>
              <p className="text-sm text-muted-foreground">
                Get a specific alarm by ID
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">PUT /api/alarms/:id</h3>
              <p className="text-sm text-muted-foreground">
                Update an existing alarm
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">DELETE /api/alarms/:id</h3>
              <p className="text-sm text-muted-foreground">
                Delete an alarm configuration
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">GET /api/flow-meters/:id/alarms</h3>
              <p className="text-sm text-muted-foreground">
                Get all alarms for a specific flow meter
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlarmsPage;
