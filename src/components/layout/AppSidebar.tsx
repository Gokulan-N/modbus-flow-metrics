
import React from "react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent,
  SidebarGroupLabel, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar";
import { BarChart3, Bell, FileText, Settings } from "lucide-react";
import { useFlowData } from "@/context/FlowDataContext";
import { cn } from "@/lib/utils";
import { NavLink, useLocation } from "react-router-dom";

export const AppSidebar: React.FC = () => {
  const { connectedIds } = useFlowData();
  const location = useLocation();
  
  const hasActiveConnections = connectedIds.length > 0;
  
  // Define navigation items with paths
  const navItems = [
    { icon: BarChart3, label: "Dashboard", path: "/" },
    { icon: BarChart3, label: "Trends", path: "/trends" },
    { icon: Bell, label: "Alarms", path: "/alarms" },
    { icon: FileText, label: "Reports", path: "/reports" },
    { icon: Settings, label: "Configuration", path: "/configuration" }
  ];

  return (
    <Sidebar
      style={{
        "--sidebar-width": "14rem",
        "--sidebar-width-icon": "3rem",
      } as React.CSSProperties}
    >
      <SidebarHeader className="flex items-center h-16 px-4">
        <div className="flex items-center">
          <div className="flex items-center h-8 w-8 overflow-hidden rounded-md bg-primary mr-2">
            <span className="font-bold text-white text-lg w-full text-center">F</span>
          </div>
          <div className="ml-2 font-semibold text-lg">FlexiFlow</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.path} 
                      className={({ isActive }) => cn(
                        "flex items-center gap-2 w-full",
                        isActive ? "text-primary" : ""
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                  hasActiveConnections ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-sm">
                  {hasActiveConnections ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
