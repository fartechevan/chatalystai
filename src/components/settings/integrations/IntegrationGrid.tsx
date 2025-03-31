
import { Integration } from "../types";
import { IntegrationCard } from "../integration-card/IntegrationCard";

interface IntegrationGridProps {
  integrations: Integration[];
  isLoading: boolean;
  onIntegrationClick: (integration: Integration) => void;
}

export function IntegrationGrid({ 
  integrations, 
  isLoading, 
  onIntegrationClick 
}: IntegrationGridProps) {
  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading integrations...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          integration={integration}
          onConnect={onIntegrationClick}
        />
      ))}
    </div>
  );
}
