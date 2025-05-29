
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ChevronRight, Settings } from "lucide-react";
import { useState } from "react";
import type { Integration } from "../types";

interface IntegrationCardProps {
  integration: Integration & { connectedInstances?: number }; // connectedInstances is now part of Integration type from IntegrationsView
  onConnect: (integration: Integration) => void;
  connectedCount?: number; // Number of active connections for this integration
  limit?: number | string; // Max number of connections allowed, or 'Unlimited' or 'N/A'
  disabled?: boolean; // Explicitly disable the card's connect/manage button
}

export function IntegrationCard({ 
  integration, 
  onConnect,
  connectedCount,
  limit,
  disabled: explicitDisabled 
}: IntegrationCardProps) {
  // Use connectionStatus to determine if connected (any instance)
  const isConnected = integration.connectionStatus === 'open';
  // Use the original status field for availability of the integration itself
  const isAvailable = integration.status === "available";

  // Determine overall disabled state
  const isDisabled = explicitDisabled || !isAvailable;

  // const limitText = limit !== undefined && limit !== null ? `(${connectedCount ?? integration.connectedInstances ?? 0}/${limit})` : ''; // Removed limitText

  return (
    <Card className={`overflow-hidden ${isDisabled ? "opacity-70" : ""}`}>
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
            <h3 className="text-base font-semibold mt-4">
              {integration.name} 
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {integration.description || "No description available."}
            </p>
          </div>
          {/* Show green dot if connectionStatus is 'open' (any instance connected) */}
          {isConnected && (integration.connectedInstances ?? 0) > 0 && (
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          )}
        </div>
      </CardContent>
      {/* Re-added responsive padding p-4 md:p-6 */}
      <CardFooter className="flex justify-end p-4 md:p-6"> 
        <Button
          variant={isConnected && (integration.connectedInstances ?? 0) > 0 ? "outline" : "default"}
          size="sm"
          disabled={isDisabled}
          onClick={() => onConnect(integration)}
        >
          {isConnected && (integration.connectedInstances ?? 0) > 0 ? "Manage" : "Connect"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
