
import { Button } from "@/components/ui/button";
import type { Integration } from "../types";

interface IntegrationCardProps {
  integration: Integration;
  onConnect: (integration: Integration) => void;
}

export function IntegrationCard({ integration, onConnect }: IntegrationCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="aspect-video rounded-md bg-gradient-to-br from-blue-50 to-blue-100 mb-4 flex items-center justify-center">
        <img
          src={integration.icon_url}
          alt={integration.name}
          className="object-contain"
        />
      </div>
      <h3 className="font-medium mb-2">{integration.name}</h3>
      {integration.description && (
        <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
      )}
      {integration.status === 'coming_soon' ? (
        <Button
          variant="outline"
          className="w-full"
          disabled
        >
          Coming Soon
        </Button>
      ) : (
        <Button
          variant={integration.is_connected ? "secondary" : "outline"}
          className="w-full"
          onClick={() => onConnect(integration)}
        >
          {integration.is_connected ? "Connected" : "Connect"}
        </Button>
      )}
    </div>
  );
}
