import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerClose,
} from "@/components/ui/drawer";
import { ConversationParticipants } from "./ConversationParticipants";
import { LeadDetailsPanel } from "./LeadDetailsPanel";
import type { Conversation } from "./types";
import { getCustomerName, getCustomerEmail, getFirstInitial } from "./utils/participantUtils";

interface ConversationRightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

export function ConversationRightPanel({ isOpen, onClose, conversation }: ConversationRightPanelProps) {
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toggleParticipants = () => {
    setIsParticipantsOpen(!isParticipantsOpen);
  };

  const toggleDetails = () => {
    setIsDetailsOpen(!isDetailsOpen);
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} className="md:hidden">
        <DrawerContent>
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Conversation Details</h3>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="details" className="flex-1 flex flex-col">
              <TabsList className="flex-shrink-0">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="flex-1 p-4">
                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getFirstInitial(conversation)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="font-medium">{getCustomerName(conversation)}</div>
                        <div className="text-sm text-muted-foreground">
                          {getCustomerEmail(conversation)}
                        </div>
                      </div>
                    </div>

                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger>
                          <div className="flex items-center justify-between w-full">
                            <div>
                              Tags
                              <Badge variant="secondary" className="ml-2">
                                3
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          Make sure to close all open windows by clicking the
                          close icon.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>Is it accessible?</AccordionTrigger>
                        <AccordionContent>
                          Yes. It adheres to the WAI-ARIA design pattern.
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="participants" className="flex-1 p-4">
                <ConversationParticipants
                  isOpen={isParticipantsOpen}
                  onOpenChange={setIsParticipantsOpen}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>

      <LeadDetailsPanel
        isExpanded={isDetailsOpen}
        onToggle={toggleDetails}
        selectedConversation={conversation}
      />
    </>
  );
}
