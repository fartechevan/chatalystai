
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";

const messengers = [
  {
    id: "whatsapp-cloud",
    name: "WhatsApp Cloud API",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: false,
  },
  {
    id: "whatsapp-lite",
    name: "WhatsApp Lite",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: true,
  },
  {
    id: "apple-messages",
    name: "Apple Messages for Business",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: false,
  },
  {
    id: "viber",
    name: "Viber",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: false,
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: false,
  },
  {
    id: "wechat",
    name: "WeChat",
    icon: "/lovable-uploads/a66609b5-787d-4a5c-bf28-09958af767d8.png",
    installed: false,
  }
];

const tabs = ["All", "Inbox", "Automations", "Lead sources", "Installed"];

export function IntegrationsView() {
  const [activeTab, setActiveTab] = useState("All");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Input 
          placeholder="Search" 
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            WEB HOOKS
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            CREATE INTEGRATION
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "Installed" && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {tab}
              </div>
            )}
            {tab !== "Installed" && tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Messengers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {messengers.map((messenger) => (
            <div
              key={messenger.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="aspect-video rounded-md bg-gradient-to-br from-blue-50 to-blue-100 mb-4 flex items-center justify-center">
                <img
                  src={messenger.icon}
                  alt={messenger.name}
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h3 className="font-medium mb-4">{messenger.name}</h3>
              <Button
                variant={messenger.installed ? "secondary" : "outline"}
                className="w-full"
              >
                {messenger.installed ? "Installed" : "+ Install"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
