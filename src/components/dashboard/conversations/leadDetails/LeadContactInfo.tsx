
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
  isLoadingCustomer: boolean; // Add loading prop
}

export function LeadContactInfo({ customer, lead, isLoadingCustomer }: LeadContactInfoProps) { // Add to destructuring
  // console.log("[Render LeadContactInfo] Props:", { customer, lead, isLoadingCustomer }); // Remove log
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  // Remove internal state for companyName and companyAddress
  // We will use the customer prop directly and manage edits temporarily
  const [editedCompanyName, setEditedCompanyName] = useState<string | null>(null);
  const [editedCompanyAddress, setEditedCompanyAddress] = useState<string | null>(null);
  
  // Get the most appropriate name to display
  const displayName = customer?.name || lead?.name || 'Contact';
  const displayEmail = customer?.email || lead?.contact_email || '';
  const displayPhone = customer?.phone_number || lead?.contact_phone || '';
  
  // Get initial for avatar
  const getInitial = () => {
    if (displayName) return displayName[0].toUpperCase();
    return 'C';
  };

  // Reset edited state when editing is cancelled or customer changes
  useEffect(() => {
    if (!isEditing) {
      setEditedCompanyName(null);
      setEditedCompanyAddress(null);
    } else {
      // Initialize edit state when editing starts
      setEditedCompanyName(customer?.company_name || "");
      setEditedCompanyAddress(customer?.company_address || "");
    }
  }, [isEditing, customer]);


  const handleSave = async () => {
    // Use edited values for saving
    const finalCompanyName = editedCompanyName ?? customer?.company_name ?? "";
    const finalCompanyAddress = editedCompanyAddress ?? customer?.company_address ?? "";

    // Need customer ID to save
    if (!customer?.id) { 
      toast({ 
        title: "Error", 
        description: "Customer ID not found, cannot update company info", 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Update the customer record directly using customer.id
      const { error } = await supabase
        .from('customers')
        .update({
          company_name: finalCompanyName,
          company_address: finalCompanyAddress
        })
        .eq('id', customer.id);

      if (error) throw error;

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
          {/* Removed hardcoded AvatarImage */}
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
                value={editedCompanyName ?? ""} // Use edited state
                onChange={(e) => setEditedCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-address">Company Address</Label>
              <Input 
                id="company-address"
                value={editedCompanyAddress ?? ""} // Use edited state
                onChange={(e) => setEditedCompanyAddress(e.target.value)}
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
            {/* Company Name Display */}
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Company:</span>
              {isLoadingCustomer ? (
                <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1"></div>
              ) : customer ? ( // Check if customer exists *after* loading
                <p className="text-sm">{customer.company_name || "Not specified"}</p> 
              ) : (
                 <p className="text-sm italic text-muted-foreground">No customer data</p> // Explicitly handle null customer
              )}
            </div>
            
            {/* Company Address Display */}
            {isLoadingCustomer ? (
              // Show pulse only if address might exist (or we don't know yet)
              customer?.company_address !== undefined && <div className="h-4 w-40 bg-muted animate-pulse rounded mt-1"></div>
            ) : customer && customer.company_address ? ( // Check customer exists *and* has address
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Address:</span>
                <p className="text-sm">{customer.company_address}</p>
              </div>
            ) : null} 
            
            {/* Edit Button Logic */}
            {isLoadingCustomer ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded mt-1"></div> // Placeholder for button
            ) : customer ? (
              // Only allow editing if customer object exists and not loading
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
              >
                Edit Company Info
              </Button>
            ) : (
              // Show message if customer is null after loading
              !isEditing && <p className="text-xs text-muted-foreground mt-1 italic">Customer data not available to edit.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
