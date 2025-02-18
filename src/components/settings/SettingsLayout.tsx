
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsContent } from "./SettingsContent";
import { MoreHorizontal, Plus } from "lucide-react";

export function SettingsLayout() {
  const [selectedSection, setSelectedSection] = useState("users");
  
  return (
    <div className="flex h-screen -mt-8 -mx-8">
      <SettingsSidebar 
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-xl font-semibold">SETTINGS</h1>
            <Input 
              placeholder="Search and filter"
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              ADD USER
            </Button>
          </div>
        </div>
        <SettingsContent section={selectedSection} />
      </div>
    </div>
  );
}
