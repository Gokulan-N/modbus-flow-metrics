
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCcw, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LogFile {
  name: string;
  path: string;
  size: string;
  modified: string;
}

interface LogContent {
  name: string;
  content: string;
}

const LogsViewer: React.FC = () => {
  const { toast } = useToast();
  const [selectedLog, setSelectedLog] = useState<string>("");

  // Fetch log files list
  const {
    data: logFiles,
    isLoading: isLoadingFiles,
    refetch: refetchLogFiles,
  } = useQuery({
    queryKey: ['logFiles'],
    queryFn: async () => {
      const response = await fetch('/api/system/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch log files');
      }
      const data = await response.json();
      return data.logs as LogFile[];
    }
  });

  // Fetch selected log content
  const {
    data: logContent,
    isLoading: isLoadingContent,
    refetch: refetchLogContent,
  } = useQuery({
    queryKey: ['logContent', selectedLog],
    queryFn: async () => {
      if (!selectedLog) return { name: "", content: "" };
      
      const response = await fetch(`/api/system/logs/${selectedLog}`);
      if (!response.ok) {
        throw new Error('Failed to fetch log content');
      }
      const data = await response.json();
      return data as LogContent;
    },
    enabled: !!selectedLog
  });

  // Set first log as default when logs are loaded
  useEffect(() => {
    if (logFiles && logFiles.length > 0 && !selectedLog) {
      setSelectedLog(logFiles[0].name);
    }
  }, [logFiles, selectedLog]);

  // Handle refresh button click
  const handleRefresh = () => {
    if (selectedLog) {
      refetchLogContent();
    }
    refetchLogFiles();
    
    toast({
      title: "Logs Refreshed",
      description: "The log files have been refreshed.",
    });
  };

  // Handle download button click
  const handleDownload = () => {
    if (!logContent?.content) return;
    
    const element = document.createElement("a");
    const file = new Blob([logContent.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = selectedLog;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Log Downloaded",
      description: `File ${selectedLog} has been downloaded.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>System Logs</CardTitle>
            <CardDescription>View and download system log files</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isLoadingFiles || isLoadingContent}
            >
              {isLoadingFiles || isLoadingContent ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownload}
              disabled={!selectedLog || !logContent?.content}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Select Log File</h4>
              {isLoadingFiles ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading logs...
                </div>
              ) : logFiles && logFiles.length > 0 ? (
                <Select value={selectedLog} onValueChange={setSelectedLog}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a log file" />
                  </SelectTrigger>
                  <SelectContent>
                    {logFiles.map((log) => (
                      <SelectItem key={log.name} value={log.name}>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="flex-1 truncate">{log.name}</span>
                          <span className="text-xs text-muted-foreground">{log.size}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">No log files found</p>
              )}
              
              {selectedLog && logFiles && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>Size: {logFiles.find(l => l.name === selectedLog)?.size}</p>
                  <p>Last Modified: {new Date(logFiles.find(l => l.name === selectedLog)?.modified || "").toLocaleString()}</p>
                </div>
              )}
            </div>
            
            <div className="md:col-span-3 border rounded-md h-[500px]">
              {isLoadingContent ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading log content...
                </div>
              ) : logContent?.content ? (
                <ScrollArea className="h-[500px] p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {logContent.content}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a log file to view its content
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsViewer;
