
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Lead } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onLeadUpdated: () => void;
}

export function EditLeadDialog({ 
  open, 
  onOpenChange, 
  lead, 
  onLeadUpdated 
}: EditLeadDialogProps) {
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    value: '',
    companyName: '',
    companyAddress: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    if (lead && open) {
      setEditFormData({
        name: lead.name || '',
        value: lead.value ? String(lead.value) : '',
        companyName: lead.company_name || '',
        companyAddress: lead.company_address || '',
        contactName: lead.contact_first_name || '',
        contactEmail: lead.contact_email || '',
        contactPhone: lead.contact_phone || '',
      });
      
      setIsEditingCompany(!!lead.company_name);
      setIsEditingContact(!!lead.contact_first_name);
    }
  }, [lead, open]);

  const handleSubmitEditForm = async () => {
    if (!lead) return;
    
    try {
      const updates: any = {
        name: editFormData.name || lead.name,
      };
      
      if (editFormData.value) {
        updates.value = parseFloat(editFormData.value);
      }
      
      if (isEditingCompany) {
        updates.company_name = editFormData.companyName;
        updates.company_address = editFormData.companyAddress;
      }
      
      if (isEditingContact) {
        updates.contact_first_name = editFormData.contactName;
        updates.contact_email = editFormData.contactEmail;
        updates.contact_phone = editFormData.contactPhone;
      }
      
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', lead.id);
      
      if (error) throw error;
      
      toast.success('Lead updated successfully');
      onOpenChange(false);
      onLeadUpdated();
      
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="leadName">Lead Name</Label>
            <Input 
              id="leadName"
              value={editFormData.name}
              onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
              placeholder="Enter lead name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="leadValue">Value (RM)</Label>
            <Input 
              id="leadValue"
              type="number"
              value={editFormData.value}
              onChange={(e) => setEditFormData({...editFormData, value: e.target.value})}
              placeholder="Enter lead value"
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <h3 className="text-sm font-medium">Company Information</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditingCompany(!isEditingCompany)}
            >
              {isEditingCompany ? 'Hide' : 'Edit'}
            </Button>
          </div>
          
          {isEditingCompany && (
            <div className="space-y-4 pl-2 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName"
                  value={editFormData.companyName}
                  onChange={(e) => setEditFormData({...editFormData, companyName: e.target.value})}
                  placeholder="Enter company name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Textarea 
                  id="companyAddress"
                  value={editFormData.companyAddress}
                  onChange={(e) => setEditFormData({...editFormData, companyAddress: e.target.value})}
                  placeholder="Enter company address"
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <h3 className="text-sm font-medium">Contact Information</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditingContact(!isEditingContact)}
            >
              {isEditingContact ? 'Hide' : 'Edit'}
            </Button>
          </div>
          
          {isEditingContact && (
            <div className="space-y-4 pl-2 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input 
                  id="contactName"
                  value={editFormData.contactName}
                  onChange={(e) => setEditFormData({...editFormData, contactName: e.target.value})}
                  placeholder="Enter contact name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input 
                  id="contactEmail"
                  type="email"
                  value={editFormData.contactEmail}
                  onChange={(e) => setEditFormData({...editFormData, contactEmail: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input 
                  id="contactPhone"
                  value={editFormData.contactPhone}
                  onChange={(e) => setEditFormData({...editFormData, contactPhone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmitEditForm}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
