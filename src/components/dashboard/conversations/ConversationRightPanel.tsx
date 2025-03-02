
import { useState } from "react";
import { PanelRightOpen, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { ConversationUserDetails } from "./ConversationUserDetails";
import { ConversationSummary } from "./ConversationSummary";
import { ConversationParticipants } from "./ConversationParticipants";
import type { Conversation } from "./types";

interface ConversationRightPanelProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationRightPanel({
  conversation,
  isOpen,
  onClose,
}: ConversationRightPanelProps) {
  const [activeTab, setActiveTab] = useState("contact");
  const [showParticipants, setShowParticipants] = useState(false);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[350px] sm:w-[450px] p-0">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Details</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowParticipants(true)}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b">
                  <TabsList className="flex w-full">
                    <TabsTrigger 
                      value="contact" 
                      className={`flex-1 py-3 ${activeTab === 'contact' ? 'border-b-2 border-primary font-medium' : ''}`}
                    >
                      Contact
                    </TabsTrigger>
                    <TabsTrigger 
                      value="summary" 
                      className={`flex-1 py-3 ${activeTab === 'summary' ? 'border-b-2 border-primary font-medium' : ''}`}
                    >
                      Summary
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="contact" className="mt-0">
                  <ConversationUserDetails conversation={conversation} />
                </TabsContent>
                
                <TabsContent value="summary" className="mt-0">
                  <ConversationSummary conversation={conversation} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConversationParticipants
        conversation={conversation}
        open={showParticipants}
        onOpenChange={setShowParticipants}
      />
      
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="fixed right-4 top-20 z-10"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
