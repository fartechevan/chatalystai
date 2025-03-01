
import { Card } from "@/components/ui/card";
import { Building } from "lucide-react";
import type { Lead } from "../types";

interface LeadCompanyInfoCardProps {
  lead: Lead;
}

export function LeadCompanyInfoCard({ lead }: LeadCompanyInfoCardProps) {
  return (
    <Card className="p-4">
      <h4 className="font-medium mb-2">Company Information</h4>
      {lead.company_name ? (
        <div className="space-y-2">
          <div className="flex items-start">
            <Building className="h-4 w-4 mr-2 mt-0.5 opacity-70" />
            <div>
              <div className="font-medium">{lead.company_name}</div>
              {lead.company_address && (
                <div className="text-sm text-muted-foreground">
                  {lead.company_address}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No company information</div>
      )}
    </Card>
  );
}
