
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Lead } from "../types";

interface LeadHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
  lead?: Lead | null;
  isLoading: boolean;
}

export function LeadHeader({ isExpanded, onToggle, lead, isLoading }: LeadHeaderProps) {
  const getFormattedLeadId = (id?: string | null) => {
    if (!id) return '163674';
    return id.length > 6 ? id.slice(0, 6) : id;
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className={cn("font-medium text-sm truncate flex items-center gap-2", !isExpanded && "hidden")}>
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            Lead #{getFormattedLeadId(lead?.id)}
            <MoreHorizontal className="h-4 w-4 ml-auto text-muted-foreground" />
          </>
        )}
      </h3>
      <Button variant="ghost" size="icon" onClick={onToggle} className={isExpanded ? "ml-auto" : ""}>
        {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}
