
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Edit, File } from "lucide-react";
import type { Lead } from "../types";

interface LeadBasicInfoCardProps {
  lead: Lead;
  onEdit: () => void;
}

export function LeadBasicInfoCard({ lead, onEdit }: LeadBasicInfoCardProps) {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{lead.name}</h4>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground mb-1">
        <div className="flex items-center">
          <DollarSign className="h-3.5 w-3.5 mr-1 opacity-70" />
          <span>{lead.value ? `${lead.value.toLocaleString()} RM` : 'No value set'}</span>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-2">
        <div className="flex items-center">
          <File className="h-3.5 w-3.5 mr-1 opacity-70" />
          <span>Created {new Date(lead.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  );
}
