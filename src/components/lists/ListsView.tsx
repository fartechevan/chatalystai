
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactList } from "./ContactList";
import { CompanyList } from "./CompanyList";
import { ContactDetails } from "./ContactDetails";

export function ListsView() {
  const [selectedTab, setSelectedTab] = useState("contacts");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  return (
    <div className="h-screen w-full flex flex-col relative -mt-8 -mx-8">
      <div className="flex-1 flex min-h-0">
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="w-full">
                <TabsTrigger value="contacts" className="flex-1">Contacts</TabsTrigger>
                <TabsTrigger value="companies" className="flex-1">Companies</TabsTrigger>
              </TabsList>
              <TabsContent value="contacts">
                <ContactList onSelectContact={setSelectedContactId} />
              </TabsContent>
              <TabsContent value="companies">
                <CompanyList />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        {selectedContactId && (
          <div className="flex-1">
            <ContactDetails contactId={selectedContactId} />
          </div>
        )}
      </div>
    </div>
  );
}
