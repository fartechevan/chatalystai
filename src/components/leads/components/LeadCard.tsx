import React, { useState, useEffect } from 'react'; // Import hooks
import { Card } from "@/components/ui/card";
import { Building, User, DollarSign } from "lucide-react";
import type { Lead } from "@/components/dashboard/conversations/types";
import { supabase } from "@/integrations/supabase/client"; // Import supabase

interface LeadCardProps {
  lead: Lead;
  // We might need onClick later if we move the handler here
}

// Helper function (can be moved to utils later)
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '0 RM';
  return `${value.toLocaleString()} RM`;
};

export function LeadCard({ lead }: LeadCardProps) {
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!lead.customer_id) {
        setCustomerName(lead.name || 'Unnamed Lead'); // Use lead name if no customer ID
        setCompanyName(lead.company_name || null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('name, company_name')
          .eq('id', lead.customer_id)
          .maybeSingle();

        if (error) {
          console.error(`Error fetching customer ${lead.customer_id}:`, error);
          setCustomerName(lead.name || 'Error'); // Fallback
        } else if (data) {
          setCustomerName(data.name || lead.name || 'Unnamed Lead'); // Prioritize fetched name
          setCompanyName(data.company_name || lead.company_name || null);
        } else {
          setCustomerName(lead.name || 'Not Found'); // Customer not found
        }
      } catch (err) {
        console.error(`Error fetching customer ${lead.customer_id}:`, err);
        setCustomerName(lead.name || 'Error'); // Fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [lead.customer_id, lead.name, lead.company_name]); // Depend on customer_id and fallbacks

  return (
    <Card className="p-3 hover:bg-accent/50 transition-colors cursor-pointer shadow-sm"> {/* Adjusted hover and shadow */}
      {/* Display fetched customer name or loading/fallback */}
      <div className="font-semibold text-sm truncate">{isLoading ? 'Loading...' : customerName}</div> {/* Ensured consistent font weight and size */}

      <div className="mt-1.5 flex flex-col space-y-1 text-xs text-muted-foreground"> {/* Adjusted spacing and structure for details */}
        {/* Display fetched company name */}
        {companyName && ( 
          <div className="flex items-center">
            <Building className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" /> {/* Slightly larger icon, consistent spacing */}
            <span className="truncate">{companyName}</span>
          </div>
        )}
        
        {/* Display fetched customer name if different from main display - This logic might be redundant if customerName is always set */}
        {/* Consider simplifying if customerName state always reflects the desired display name */}
        {/* For now, keeping original logic but ensuring consistent styling */}
        {customerName && customerName !== (isLoading ? 'Loading...' : customerName) && !companyName && ( // Only show if no company and name is different
          <div className="flex items-center">
            <User className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate">{customerName}</span>
          </div>
        )}
        
        {/* Show placeholder only if loading or no company/customer info */}
        {isLoading && !companyName && !customerName && (
          <span className="italic">Loading details...</span>
        )}
        {!isLoading && !companyName && customerName === (lead.name || 'Unnamed Lead') && ( // Show if no company and customerName is just the fallback lead name
           <span className="italic">No company</span>
        )}
      </div>
      
      <div className="text-sm font-semibold mt-2.5 flex items-center"> {/* Adjusted spacing and weight */}
        <DollarSign className="h-4 w-4 mr-1 text-green-600" /> {/* Slightly larger icon, added color */}
        {formatCurrency(lead.value)}
      </div>
    </Card>
  );
}
