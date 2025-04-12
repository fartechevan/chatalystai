
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ChevronRight, Settings } from "lucide-react";
import { useState } from "react";
import type { Integration } from "../types";

interface IntegrationCardProps {
  integration: Integration;
  onConnect: (integration: Integration) => void;
}

export function IntegrationCard({ integration, onConnect }: IntegrationCardProps) {
  // Use connectionStatus to determine if connected
  const isConnected = integration.connectionStatus === 'open';
  // Use the original status field for availability
  const isAvailable = integration.status === "available";

  return (
    <Card className="overflow-hidden">
      {/* Re-added responsive padding p-4 md:p-6 */}
      <CardContent className="p-4 md:p-6 pb-0"> 
        <div className="flex justify-between items-start">
          <div>
            {integration.icon_url ? (
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <img
                  src={integration.icon_url}
                  alt={integration.name}
                  className="h-8 w-8"
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Settings className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
            )}
            <h3 className="text-base font-semibold mt-4">{integration.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {integration.description || "No description available."}
            </p>
          </div>
          {/* Show green dot if connectionStatus is 'open' */}
          {isConnected && (
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          )}
        </div>
      </CardContent>
      {/* Re-added responsive padding p-4 md:p-6 */}
      <CardFooter className="flex justify-end p-4 md:p-6"> 
        <Button
          variant={isConnected ? "outline" : "default"}
          size="sm"
          disabled={!isAvailable}
          onClick={() => onConnect(integration)}
        >
          {isConnected ? "Manage" : "Connect"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
