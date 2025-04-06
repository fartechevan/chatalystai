
import { useState } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsContent } from "./SettingsContent";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export function SettingsLayout() {
  const [selectedSection, setSelectedSection] = useState("integrations");
  
  return (
    <div className="flex h-screen -mt-8 -mx-8">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
          <SettingsSidebar 
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={80}>
          <div className="flex-1 overflow-auto h-full">
            <SettingsContent section={selectedSection} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
