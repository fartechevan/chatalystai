import { useState, useEffect } from "react";
import { useLocation, useOutletContext } from "react-router-dom"; // Added useOutletContext
import { SettingsContent } from "./SettingsContent";
import { SettingsSearchProvider } from "@/context/SettingsSearchContext"; // Import the provider
import type { PageHeaderContextType } from "@/components/dashboard/DashboardLayout"; // Import context type
// SettingsSidebar, Sheet, Button, SidebarOpen, cn, useMediaQuery are no longer needed here

export function SettingsLayout() {
  const location = useLocation();
  const { integrationsTab, setIntegrationsTab } = useOutletContext<PageHeaderContextType>();

  const getSectionFromPath = () => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const validSections: Record<string, string> = {
      "billing": "billing",
      "users": "users",
      "access-control": "access",
      "integrations": "integrations",
      "database": "database",
      "profile": "profile",
      "notifications": "notifications",
      "api-keys": "api-keys",
      "general": "general"
    };
    // Handle the case where the path is just /dashboard/settings
    if (lastPart === "settings" && pathParts.includes("dashboard")) {
        return "integrations"; // Or your preferred default section for the base settings path
    }
    if (pathParts.includes("settings") && validSections[lastPart]) {
      return validSections[lastPart];
    }
    return "integrations"; // Default section if no specific match
  };

  const [selectedSection, setSelectedSection] = useState(getSectionFromPath());

  useEffect(() => {
    setSelectedSection(getSectionFromPath());
  }, [location.pathname]);

  return (
    <SettingsSearchProvider> {/* Wrap with the provider */}
      <div className="flex-1 flex flex-col overflow-auto h-full">
        {/* SettingsContent will now take the full space */}
        <SettingsContent 
          section={selectedSection} 
          integrationsTab={integrationsTab} 
          setIntegrationsTab={setIntegrationsTab} 
        />
      </div>
    </SettingsSearchProvider>
  );
}
