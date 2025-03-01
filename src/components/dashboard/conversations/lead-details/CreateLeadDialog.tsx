
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CornerDownRight } from "lucide-react";
import type { Conversation } from "../types";
import { createMockLeadFromConversation, createMockLeadAndCustomer } from "../utils/leadUtils";
import { toast } from "sonner";

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedConversation: Conversation | null;
  onLeadCreated: () => void;
}

export function CreateLeadDialog({ 
  open, 
  onOpenChange, 
  selectedConversation, 
  onLeadCreated 
}: CreateLeadDialogProps) {
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const handleCreateLead = async () => {
    if (!selectedConversation) return;
    
    try {
      const lead = await createMockLeadFromConversation(selectedConversation);
      
      if (lead) {
        toast.success('Lead created successfully');
        onOpenChange(false);
        onLeadCreated();
      } else {
        toast.error('Failed to create lead');
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('Failed to create lead');
    }
  };

  const handleCreateCustomerAndLead = async () => {
    if (!selectedConversation || !newCustomerData.name) return;
    
    try {
      const lead = await createMockLeadAndCustomer(
        selectedConversation,
        newCustomerData.name,
        newCustomerData.email || null,
        newCustomerData.phone || null
      );
      
      if (lead) {
        toast.success('Customer and lead created successfully');
        onOpenChange(false);
        onLeadCreated();
      } else {
        toast.error('Failed to create customer and lead');
      }
    } catch (error) {
      console.error('Error creating customer and lead:', error);
      toast.error('Failed to create customer and lead');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lead from Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Quick Create</h3>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleCreateLead}
            >
              <CornerDownRight className="h-4 w-4 mr-2" />
              Create lead from conversation
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Create Customer & Lead</h3>
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input 
                id="customerName"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email (optional)</Label>
              <Input 
                id="customerEmail"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone (optional)</Label>
              <Input 
                id="customerPhone"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateCustomerAndLead}
            disabled={!newCustomerData.name}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
