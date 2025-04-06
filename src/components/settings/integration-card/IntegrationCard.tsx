
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
  const isConnected = integration.is_connected;
  const isAvailable = integration.status === "available";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 pb-0">
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
          {isConnected && (
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end p-6">
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
