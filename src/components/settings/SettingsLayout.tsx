
import { useState } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsContent } from "./SettingsContent";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";

export function SettingsLayout() {
  const [selectedSection, setSelectedSection] = useState("integrations");
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -mt-8">
        <SettingsSidebar 
          selectedSection={selectedSection}
          onSectionChange={setSelectedSection}
        />
        <div className="flex-1 overflow-auto p-4">
          <SettingsContent section={selectedSection} />
        </div>
      </div>
    );
  }
  
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
