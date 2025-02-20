
import { useState } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsContent } from "./SettingsContent";

export function SettingsLayout() {
  const [selectedSection, setSelectedSection] = useState("integrations");
  
  return (
    <div className="flex h-screen -mt-8 -mx-8">
      <SettingsSidebar 
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <SettingsContent section={selectedSection} />
        </div>
      </div>
    </div>
  );
}
