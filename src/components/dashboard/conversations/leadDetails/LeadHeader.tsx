
import { useState } from "react";
// Button removed as it's no longer used for a close button here
// import { Button } from "@/components/ui/button"; 
import { MoreHorizontal } from "lucide-react"; // XIcon removed
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Lead } from "../types";

interface LeadHeaderProps {
  lead?: Lead | null;
  isLoading: boolean;
  // onClose prop removed
}

export function LeadHeader({ lead, isLoading }: LeadHeaderProps) { // onClose removed from destructuring
  const getFormattedLeadId = (id?: string | null) => {
    if (!id) return '';
    return id.length > 6 ? id.slice(0, 6) : id;
  };

  return (
    <div className="flex items-center p-4 border-b"> {/* Removed justify-between as close button is gone */}
      <h3 className="font-medium text-sm truncate flex items-center gap-2"> 
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            Lead #{getFormattedLeadId(lead?.id)}
          </>
        )}
      </h3>
      {/* Close button removed */}
    </div>
  );
}
