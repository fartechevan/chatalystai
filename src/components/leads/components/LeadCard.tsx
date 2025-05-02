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
    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
      {/* Display fetched customer name or loading/fallback */}
      <div className="font-medium">{isLoading ? 'Loading...' : customerName}</div> 

      <div className="mt-2 flex items-center text-xs text-muted-foreground">
        {/* Display fetched company name */}
        {companyName && ( 
          <div className="flex items-center mr-3">
            <Building className="h-3 w-3 mr-1" />
            <span>{companyName}</span>
          </div>
        )}
        
        {/* Display fetched customer name if different from main display */}
        {customerName && customerName !== (isLoading ? 'Loading...' : customerName) && ( 
          <div className="flex items-center">
            <User className="h-3 w-3 mr-1" />
            <span>{customerName}</span>
          </div>
        )}
        
        {/* Show placeholder only if loading or no info */}
        {(isLoading || (!companyName && !customerName)) && (
          <span>{isLoading ? '...' : 'No additional info'}</span>
        )}
      </div>
      
      <div className="text-sm font-medium mt-2 flex items-center">
        <DollarSign className="h-3.5 w-3.5 mr-1" />
        {formatCurrency(lead.value)}
      </div>
    </Card>
  );
}
