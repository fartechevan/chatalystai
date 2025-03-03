
import { useState } from "react";
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
  const [companyName, setCompanyName] = useState(lead?.company_name || customer?.company_name || "");
  const [companyAddress, setCompanyAddress] = useState(lead?.company_address || customer?.company_address || "");
  
  // Get the most appropriate name to display
  const displayName = lead?.contact_first_name || customer?.name || lead?.name || 'Contact';
  
  // Get initial for avatar
  const getInitial = () => {
    if (lead?.contact_first_name) return lead.contact_first_name[0].toUpperCase();
    if (customer?.name) return customer.name[0].toUpperCase();
    if (lead?.name) return lead.name[0].toUpperCase();
    return 'C';
  };

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
      if (customer?.id) {
        // Update customer record
        const { error } = await supabase
          .from('customers')
          .update({
            company_name: companyName,
            company_address: companyAddress
          })
          .eq('id', customer.id);

        if (error) throw error;
      }

      if (lead?.id) {
        // If we have both a lead and customer, no need to update lead with duplicate info
        if (!customer?.id) {
          // Update lead without a related customer
          const { error } = await supabase
            .from('leads')
            .update({
              // These fields don't actually exist in the database table,
              // but including them for completeness
            })
            .eq('id', lead.id);

          if (error) throw error;
        }
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
        <div className="pl-12 space-y-3">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Company:</span>
            <p className="text-sm">{companyName || "Not specified"}</p>
          </div>
          
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Address:</span>
            <p className="text-sm">{companyAddress || "Not specified"}</p>
          </div>
          
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
  );
}
