
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react"; // Removed ChevronLeft, ChevronRight
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Lead } from "../types";

interface LeadHeaderProps {
  // Removed isExpanded, onToggle
  lead?: Lead | null;
  isLoading: boolean;
}

export function LeadHeader({ lead, isLoading }: LeadHeaderProps) { // Removed isExpanded, onToggle from props
  const getFormattedLeadId = (id?: string | null) => {
    if (!id) return '';
    return id.length > 6 ? id.slice(0, 6) : id;
  };

  return (
    // Removed justify-between as toggle button is gone
    <div className="flex items-center p-4 border-b"> 
      {/* Title always visible now */}
      <h3 className="font-medium text-sm truncate flex items-center gap-2"> 
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            Lead #{getFormattedLeadId(lead?.id)}
            {/* Removed MoreHorizontal icon for now, can be added back if needed for actions */}
          </>
        )}
      </h3>
      {/* Removed Toggle Button */}
    </div>
  );
}
