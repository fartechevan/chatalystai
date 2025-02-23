
import { useState } from "react";
import { ContactList } from "./ContactList";
import { CompanyList } from "./CompanyList";
import { LeadsList } from "./LeadsList";
import { ContactDetails } from "./ContactDetails";
import { Button } from "@/components/ui/button";
import { ListChecks, UsersIcon, Building2, Users2, Image, Package, Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function ListsView() {
  const [selectedTab, setSelectedTab] = useState("contacts");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const listItems = [
    { id: "contacts", label: "Contacts", icon: UsersIcon },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "leads", label: "Leads", icon: Target },
    { id: "all", label: "All Contacts and Companies", icon: Users2 },
    { id: "media", label: "Media", icon: Image },
    { id: "products", label: "Products", icon: Package },
  ];

  return (
    <div className="h-screen w-full flex flex-col relative -mt-8 -mx-8">
      <div className="flex-1 flex min-h-0">
        <div className="w-64 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Lists</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {listItems.map((item) => (
                <Button
                  key={item.id}
                  variant={selectedTab === item.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 h-10",
                    selectedTab === item.id && "bg-muted font-medium"
                  )}
                  onClick={() => setSelectedTab(item.id)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            {selectedTab === "contacts" && (
              <ContactList onSelectContact={setSelectedContactId} />
            )}
            {selectedTab === "companies" && <CompanyList />}
            {selectedTab === "leads" && <LeadsList />}
          </div>
          {selectedContactId && (
            <div className="w-96 border-l">
              <ContactDetails contactId={selectedContactId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
