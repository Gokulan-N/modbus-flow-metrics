
import React from "react";
import { NavLink } from "react-router-dom";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent,
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu,
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { FileText, BarChart3, Settings, Database } from "lucide-react";
import { useFlowData } from "@/context/FlowDataContext";
import { cn } from "@/lib/utils";

export const AppSidebar: React.FC = () => {
  const { isConnected } = useFlowData();
  
  return (
    <Sidebar>
      <SidebarHeader className="flex items-center h-16 px-6">
        <SidebarTrigger />
        <div className="ml-2 font-semibold text-xl">ModbusLogger</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    className={({ isActive }) => 
                      cn("flex items-center gap-2", isActive ? "text-sidebar-primary" : "")
                    }
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/trends"
                    className={({ isActive }) => 
                      cn("flex items-center gap-2", isActive ? "text-sidebar-primary" : "")
                    }
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>Trends</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/reports"
                    className={({ isActive }) => 
                      cn("flex items-center gap-2", isActive ? "text-sidebar-primary" : "")
                    }
                  >
                    <FileText className="h-5 w-5" />
                    <span>Reports</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/configuration"
                    className={({ isActive }) => 
                      cn("flex items-center gap-2", isActive ? "text-sidebar-primary" : "")
                    }
                  >
                    <Settings className="h-5 w-5" />
                    <span>Configuration</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Connection Status</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-sm">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
