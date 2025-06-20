import React, { useState, useEffect } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { SettingsContent } from "./SettingsContent";
import { SettingsSearchProvider } from "@/context/SettingsSearchContext";
import type { PageHeaderContextType } from "@/components/dashboard/DashboardLayout";

export function SettingsLayout() {
  const location = useLocation();
  const outletContext = useOutletContext<PageHeaderContextType | undefined>();
  
  const integrationsTab = outletContext?.integrationsTab;
  const setIntegrationsTab = outletContext?.setIntegrationsTab;
  const setHeaderActions = outletContext?.setHeaderActions; // Get setHeaderActions

  const getSectionFromPath = () => {
    const path = location.pathname.endsWith('/') ? location.pathname.slice(0, -1) : location.pathname;
    const pathParts = path.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    
    // Order matters: specific paths first, then generic 'settings'
    if (path === "/dashboard/settings/users") return "users";
    if (path === "/dashboard/settings/billing") return "billing";
    if (path === "/dashboard/settings/integrations") return "integrations";
    if (path === "/dashboard/settings/access-control") return "access"; // Assuming this was 'access'
    if (path === "/dashboard/settings/database") return "database";
    if (path === "/dashboard/settings/profile") return "profile";
    if (path === "/dashboard/settings/notifications") return "notifications";
    if (path === "/dashboard/settings/api-keys") return "api-keys";
    if (path === "/dashboard/settings/general") return "general";

    // Default for /dashboard/settings or unknown
    if (lastPart === "settings" || path === "/dashboard/settings") {
        return "integrations"; // Default section for base settings path
    }
    // Fallback if a sub-path isn't explicitly listed above but is under settings
    if (pathParts.includes("settings") && pathParts.length > pathParts.indexOf("settings") + 1) {
        return lastPart; // Use the last part as section name
    }

    return "integrations"; // Default section
  };

  const [selectedSection, setSelectedSection] = useState(getSectionFromPath());

  useEffect(() => {
    setSelectedSection(getSectionFromPath());
  }, [location.pathname]);

  return (
    <SettingsSearchProvider>
      <div className="flex-1 flex flex-col overflow-auto h-full">
        <SettingsContent 
          section={selectedSection} 
          integrationsTab={integrationsTab} 
          setIntegrationsTab={setIntegrationsTab}
          setHeaderActions={setHeaderActions} // Pass setHeaderActions down
        />
      </div>
    </SettingsSearchProvider>
  );
}
