import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@/components/dashboard/conversations/types"; // Import Lead type

interface LeadFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineStageId?: string | null; // Optional for editing, required for adding to a specific stage
  leadToEdit?: Lead | null; // Lead object for editing
  onLeadAdded?: () => void; // Callback after adding
  onLeadUpdated?: () => void; // Callback after updating
}

// Renamed component
export function LeadFormDialog({ 
  isOpen, 
  onClose, 
  pipelineStageId, 
  leadToEdit, 
  onLeadAdded,
  onLeadUpdated 
}: LeadFormDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  // Customer details might need separate handling if editing existing customer vs lead
  const [companyName, setCompanyName] = useState(""); 
  const [contactName, setContactName] = useState(""); // Assuming this maps to customer name for now
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  const isEditing = !!leadToEdit;

  // Populate form if editing
  useEffect(() => {
    if (isEditing && leadToEdit) {
      setName(leadToEdit.name || ""); // Use lead name if available
      setValue(leadToEdit.value?.toString() || "");
      // Populate customer details if available on the lead object (from previous fetch)
      setCompanyName(leadToEdit.company_name || "");
      setContactName(leadToEdit.name || ""); // Assuming lead.name holds customer name here
      setContactEmail(leadToEdit.contact_email || "");
      setContactPhone(leadToEdit.contact_phone || "");
      // Note: Editing pipeline/stage might require a different UI element (e.g., dropdown)
      // For now, we don't fetch pipelineId when editing, as it's less common to change pipeline via this simple form
      setPipelineId(null); 
    } else {
      // Reset form for adding
      setName("");
      setValue("");
      setCompanyName("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
    }
  }, [isOpen, isEditing, leadToEdit]);

  // Fetch pipeline ID only when adding to a specific stage
   useEffect(() => {
    async function getPipelineId() {
      if (!isEditing && pipelineStageId) { // Only fetch if adding
        const { data, error } = await supabase
          .from('pipeline_stages')
          .select('pipeline_id')
          .eq('id', pipelineStageId)
          .single();
        
        if (error) {
          console.error('Error fetching pipeline_id:', error);
          setPipelineId(null); // Ensure pipelineId is null on error
        } else if (data) {
          setPipelineId(data.pipeline_id);
        }
      } else {
         setPipelineId(null); // Not needed or not possible when editing via this form
      }
    }
    getPipelineId();
  }, [pipelineStageId, isEditing]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation (can be enhanced)
    if (!contactName.trim() && !companyName.trim()) {
       toast({ title: "Name or Company Required", description: "Please enter a lead name or company name.", variant: "destructive" });
       return;
    }
    
    // Pipeline ID check only needed when adding
    if (!isEditing && !pipelineId) {
      toast({ title: "Pipeline Error", description: "Could not determine the pipeline for this stage.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const leadDataPayload = {
        // name: name.trim(), // 'name' on leads table might not exist or be used differently
        value: parseFloat(value) || null, // Allow null value
        // We might need to update the associated customer instead of these fields directly on lead
        // company_name: companyName.trim() || null, 
        // contact_first_name: contactName.trim() || null, 
      };

      // --- Customer Handling (Simplified: Assumes updating existing or creating new) ---
      // This is complex: Does editing the form update the customer or just the lead fields?
      // For simplicity, let's assume we might need to update/create a customer record.
      // A more robust solution would involve searching for existing customer by email/phone.
      let customerIdToLink = leadToEdit?.customer_id;
      
      // If editing, potentially update the linked customer
      if (isEditing && customerIdToLink) {
         const { error: customerUpdateError } = await supabase
           .from('customers')
           .update({ 
              name: contactName.trim() || null, 
              company_name: companyName.trim() || null,
              email: contactEmail.trim() || null,
              phone_number: contactPhone.trim() || null,
            })
           .eq('id', customerIdToLink);
         if (customerUpdateError) console.warn("Could not update linked customer:", customerUpdateError.message);
         // Proceed even if customer update fails for now
      } 
      // If adding, or editing a lead *without* a customer_id, try to create/find customer
      else if (!customerIdToLink && (contactEmail.trim() || contactPhone.trim())) {
         // Basic check/create - ideally search first
         const { data: newCustomerData, error: customerInsertError } = await supabase
            .from('customers')
            .insert({
               name: contactName.trim() || null, 
               company_name: companyName.trim() || null,
               email: contactEmail.trim() || null,
               phone_number: contactPhone.trim() || null,
            })
            .select('id')
            .single();
         if (customerInsertError) console.warn("Could not create customer:", customerInsertError.message);
         else customerIdToLink = newCustomerData?.id;
      }
      // --- End Customer Handling ---


      if (isEditing && leadToEdit) {
        // --- Update Existing Lead ---
        const { error: updateError } = await supabase
          .from('leads')
          .update({
             ...leadDataPayload, 
             customer_id: customerIdToLink // Update customer link if changed/created
             // Note: Updating pipeline_stage_id is not handled here, needs separate UI/logic
          })
          .eq('id', leadToEdit.id);

        if (updateError) throw updateError;

        toast({ title: "Lead updated", description: `${contactName || companyName} has been updated.` });
        onLeadUpdated?.(); // Call update callback

      } else {
        // --- Create New Lead ---
        if (!pipelineStageId || !pipelineId) {
           throw new Error("Missing pipeline stage or ID for new lead.");
        }
        
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("User not authenticated");

        const { data: newLeadData, error: leadInsertError } = await supabase
          .from('leads')
          .insert([{
            ...leadDataPayload,
            pipeline_stage_id: pipelineStageId,
            user_id: user.id,
            customer_id: customerIdToLink // Link to new/found customer
          }])
          .select('id')
          .single();

        if (leadInsertError) throw leadInsertError;
        if (!newLeadData) throw new Error("Failed to get new lead ID");

        // Link lead to pipeline stage
        const { data: positionData, error: positionError } = await supabase
          .from('lead_pipeline')
          .select('position')
          .eq('stage_id', pipelineStageId)
          .order('position', { ascending: false })
          .limit(1);
        if (positionError) throw positionError;
        const position = positionData?.[0]?.position !== undefined ? positionData[0].position + 1 : 0;

        const { error: pipelineLinkError } = await supabase
          .from('lead_pipeline')
          .insert({
            lead_id: newLeadData.id,
            stage_id: pipelineStageId,
            pipeline_id: pipelineId,
            position: position
          });
        if (pipelineLinkError) throw pipelineLinkError;

        toast({ title: "Lead created", description: `${contactName || companyName} has been added.` });
        onLeadAdded?.(); // Call add callback
      }

      onClose(); // Close dialog on success

    } catch (error: unknown) {
      console.error('Error saving lead:', error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to save lead: ${message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form state when dialog closes (if not editing)
  // This might be redundant due to the main useEffect, but can be explicit
  useEffect(() => {
    if (!isOpen && !isEditing) {
       setName("");
       setValue("");
       setCompanyName("");
       setContactName("");
       setContactEmail("");
       setContactPhone("");
    }
  }, [isOpen, isEditing]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            {/* Dynamic Title */}
            <DialogTitle>{isEditing ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update the details for this lead." 
                : "Create a new lead. Fill in contact or company details."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {/* Using contactName for the primary name field */}
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactName" className="text-right">
                Contact Name
              </Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="col-span-3"
                placeholder="Contact person's name"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName" className="text-right">
                Company Name
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="col-span-3"
                placeholder="Associated company"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactEmail" className="text-right">
                Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="col-span-3"
                placeholder="Contact's email address"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactPhone" className="text-right">
                Phone
              </Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="col-span-3"
                placeholder="Contact's phone number"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Value (RM)
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01" // Allow decimals
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="col-span-3"
                placeholder="Estimated deal value"
              />
            </div>
            {/* Removed original 'Name' field as it's ambiguous */}
            {/* Removed original 'Company' field (using companyName) */}
            {/* Removed original 'Contact' field (using contactName) */}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {/* Dynamic Button Text */}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Saving..." : "Adding...") : (isEditing ? "Save Changes" : "Add Lead")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
