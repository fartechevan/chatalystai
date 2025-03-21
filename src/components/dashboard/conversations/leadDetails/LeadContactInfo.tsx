
import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Customer, Lead } from "../types";

interface LeadContactInfoProps {
  customer: Customer | null;
  lead: Lead | null;
}

export function LeadContactInfo({ customer, lead }: LeadContactInfoProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  
  // Get the most appropriate name to display
  const displayName = customer?.name || lead?.name || 'Contact';
  const displayEmail = customer?.email || lead?.contact_email || '';
  const displayPhone = customer?.phone_number || lead?.contact_phone || '';
  
  // Get initial for avatar
  const getInitial = () => {
    if (displayName) return displayName[0].toUpperCase();
    return 'C';
  };

  // Load company data from customer when component mounts or when customer/lead changes
  useEffect(() => {
    if (customer) {
      setCompanyName(customer.company_name || "");
      setCompanyAddress(customer.company_address || "");
    } else if (lead?.customer_id) {
      // If there's a lead with a customer ID but no customer object yet,
      // fetch the customer data to get company information
      const fetchCustomerData = async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('company_name, company_address')
          .eq('id', lead.customer_id)
          .single();
          
        if (data && !error) {
          setCompanyName(data.company_name || "");
          setCompanyAddress(data.company_address || "");
        }
      };
      
      fetchCustomerData();
    }
  }, [customer, lead]);

  const handleSave = async () => {
    if (!customer?.id && !lead?.id) {
      toast({ 
        title: "Error", 
        description: "No customer or lead found to update", 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Create an array to store all update operations
      const updateOperations = [];

      if (customer?.id) {
        // Add customer update operation - these fields exist in the customers table
        updateOperations.push(
          supabase
            .from('customers')
            .update({
              company_name: companyName,
              company_address: companyAddress
            })
            .eq('id', customer.id)
        );
      } else if (lead?.customer_id) {
        // If we have a lead with a customer ID but no customer object,
        // update the customer record directly
        updateOperations.push(
          supabase
            .from('customers')
            .update({
              company_name: companyName,
              company_address: companyAddress
            })
            .eq('id', lead.customer_id)
        );
      }

      // Execute all update operations concurrently
      const results = await Promise.all(updateOperations);

      // Check for errors in any of the operations
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      toast({
        title: "Success",
        description: "Company info updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating company info:", error);
      toast({
        title: "Error",
        description: "Failed to update company information",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border-t border-b py-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80" />
          <AvatarFallback>{getInitial()}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="font-medium">{displayName}</div>
        </div>
      </div>
      
      <div className="pl-12 space-y-3">
        {/* Contact Information */}
        {(displayEmail || displayPhone) && (
          <div className="space-y-2">
            {displayPhone && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Phone:</span>
                <p className="text-sm">{displayPhone}</p>
              </div>
            )}
            
            {displayEmail && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Email:</span>
                <p className="text-sm">{displayEmail}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Company Information - Editable */}
        {isEditing ? (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-address">Company Address</Label>
              <Input 
                id="company-address"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Enter company address"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
              >
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Company:</span>
              <p className="text-sm">{companyName || "Not specified"}</p>
            </div>
            
            {companyAddress && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Address:</span>
                <p className="text-sm">{companyAddress}</p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
            >
              Edit Company Info
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
