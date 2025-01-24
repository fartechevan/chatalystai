import { ChevronDown, ChevronLeft, Home, Menu, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const menuItems = [
  {
    title: "Main",
    icon: Home,
    path: "/dashboard",
    submenu: [
      { title: "Overview", path: "/dashboard" },
      { title: "Analytics", path: "/dashboard/analytics" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/dashboard/settings",
    submenu: [
      { title: "Profile", path: "/dashboard/settings" },
      { title: "Preferences", path: "/dashboard/settings/preferences" },
    ],
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { toggleSidebar, open } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleMenuItem = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarHeader>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium">Dashboard</span>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={toggleSidebar}
              >
                <ChevronLeft
                  className={`h-4 w-4 transition-transform ${
                    !open ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </div>
          </SidebarHeader>
          <div className="px-2">
            {menuItems.map((item) => (
              <div key={item.title}>
                <SidebarMenuButton
                  onClick={() => toggleMenuItem(item.title)}
                  isActive={location.pathname === item.path}
                  tooltip={item.title}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  {item.submenu && (
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedItems.includes(item.title) ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </SidebarMenuButton>
                {expandedItems.includes(item.title) && (
                  <div className="ml-6 space-y-1 py-1">
                    {item.submenu?.map((subItem) => (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                          location.pathname === subItem.path
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {subItem.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    </>
  );
}