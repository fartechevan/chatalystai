
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, Link as LinkIcon, Check, Trash2, Phone, Mail, Building } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadDetailsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function LeadDetailsPanel({ isExpanded, onToggle }: LeadDetailsPanelProps) {
  return (
    <div className={cn(
      "border-r bg-background transition-all duration-300 flex flex-col",
      isExpanded ? "w-[320px]" : "w-10"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className={cn("font-medium text-sm truncate", !isExpanded && "hidden")}>
          Lead #162136
        </h3>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-auto flex flex-col">
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="w-full grid grid-cols-4 p-1 rounded-none border-b">
              <TabsTrigger value="main">Main</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="flex-1 overflow-auto p-0">
              <div className="p-4 space-y-6">
                {/* Pipeline Section */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Pipeline</label>
                  <div className="text-sm">Incoming leads (9 days)</div>
                </div>

                {/* Sale Section */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Sale</label>
                  <div className="text-sm">0 RM</div>
                </div>

                {/* Contact Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">60192698338</div>
                      <div className="text-xs text-muted-foreground">WhatsApp Line</div>
                    </div>
                  </div>
                </div>

                {/* Company Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm">Company</label>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">+60 19-269 8358</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Work email</span>
                    </div>
                  </div>
                </div>

                {/* Add Contact/Company Buttons */}
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add contact
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add company
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="statistics" className="flex-1 p-4">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Statistics will appear here</p>
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="flex-1 p-4">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Media files will appear here</p>
              </div>
            </TabsContent>
            
            <TabsContent value="setup" className="flex-1 p-4">
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Setup options will appear here</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bottom Actions */}
          <div className="mt-auto border-t p-4">
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button variant="outline" size="icon" className="shrink-0">
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
