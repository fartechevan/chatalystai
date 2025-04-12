import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "../types/customer";

export function useCustomersData() {
  const [customersData, setCustomersData] = useState<Record<string, Customer>>({});
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  useEffect(() => {
    const loadCustomersData = async () => {
      setIsLoadingCustomers(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*');

        if (error) {
          console.error('Error loading customers:', error);
          setCustomersData({}); // Reset on error
          return;
        }

        // Create a mapping of customer id to customer data
        const customersMap: Record<string, Customer> = {};
        for (const customer of data || []) {
           // Ensure customer conforms to the type
           const typedCustomer: Customer = {
             id: customer.id,
             // created_at: customer.created_at, // Removed - Not in Customer type
             // updated_at: customer.updated_at, // Removed - Not in Customer type
             name: customer.name,
             email: customer.email,
             phone_number: customer.phone_number,
            company_name: customer.company_name,
            company_address: customer.company_address,
            // Add other fields from the Customer type if necessary
          };
          customersMap[typedCustomer.id] = typedCustomer;
        }

        setCustomersData(customersMap);
      } catch (err) {
        console.error('Error in customer data processing:', err);
        setCustomersData({}); // Reset on error
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    loadCustomersData();
  }, []); // Empty dependency array means this runs once on mount

  return { customersData, isLoadingCustomers };
}
