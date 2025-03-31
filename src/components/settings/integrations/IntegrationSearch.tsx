
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface IntegrationSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function IntegrationSearch({ searchQuery, setSearchQuery }: IntegrationSearchProps) {
  return (
    <div className="flex items-center justify-between">
      <Input
        placeholder="Search"
        className="max-w-sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          WEB HOOKS
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          CREATE INTEGRATION
        </Button>
      </div>
    </div>
  );
}
