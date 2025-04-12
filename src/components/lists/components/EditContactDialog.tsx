import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client'; // Corrected import path

// Define the type for the contact prop
interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  // Add other relevant fields if necessary
}

interface EditContactDialogProps {
  contact: Contact;
  onContactUpdated: () => void; // Callback to refresh data after update
  children: React.ReactNode; // To wrap the trigger element (e.g., an Edit button)
}

export function EditContactDialog({ contact, onContactUpdated, children }: EditContactDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email ?? '');
  const [phone, setPhone] = useState(contact.phone ?? '');
  const [company, setCompany] = useState(contact.company ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Update state if the contact prop changes (e.g., selecting a different contact)
  useEffect(() => {
    setName(contact.name);
    setEmail(contact.email ?? '');
    setPhone(contact.phone ?? '');
    setCompany(contact.company ?? '');
  }, [contact]);

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const updatePayload: { id: string; name?: string; email?: string; phone?: string; company?: string } = { id: contact.id };
    if (name !== contact.name) updatePayload.name = name;
    // Only include email if it's changed and not empty, or if it was previously set and is now empty
    if (email !== (contact.email ?? '')) updatePayload.email = email || null;
    if (phone !== (contact.phone ?? '')) updatePayload.phone = phone || null;
    if (company !== (contact.company ?? '')) updatePayload.company = company || null;


     // Check if any field has actually changed
    if (Object.keys(updatePayload).length <= 1) {
        toast({
            title: "No Changes Detected",
            description: "You haven't made any changes to the contact.",
            variant: "default",
        });
        setIsLoading(false);
        setIsOpen(false); // Optionally close dialog if no changes
        return;
    }


    try {
      const { data, error } = await supabase.functions.invoke('edit-customer-contact', {
        body: updatePayload,
      });

      if (error) throw error;

      console.log('Contact updated:', data);
      toast({
        title: "Contact Updated",
        description: `${name} has been updated successfully.`,
      });
      onContactUpdated(); // Refresh the contact list/details
      setIsOpen(false); // Close the dialog on success
    } catch (error) {
      console.error("Error updating contact:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Error Updating Contact",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update the details for {contact.name}. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleEditContact}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">
                Company
              </Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
