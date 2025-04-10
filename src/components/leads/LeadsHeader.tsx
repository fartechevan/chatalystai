
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";

interface LeadsHeaderProps {
  selectedPipelineId: string;  // Add this prop
}

export function LeadsHeader({ selectedPipelineId }: LeadsHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex items-center justify-between px-4 py-4 border-b">
      <Input
        placeholder="Search leads..."
        className="max-w-xs"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          Import
        </Button>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>
    </div>
  );
}
