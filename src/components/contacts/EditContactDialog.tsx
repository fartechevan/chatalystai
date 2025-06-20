"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { ContactEntry } from './list/columns'; // Assuming ContactEntry is the right type

// Define the schema for form validation using Zod
const contactFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  phone_number: z.string().min(1, { message: "Phone number is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  company_name: z.string().optional(),
  company_address: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Callback after successful update
  contactData: ContactEntry | null; // Contact to edit
}

export const EditContactDialog: React.FC<EditContactDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  contactData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    // Default values will be set by useEffect when contactData changes
  });

  useEffect(() => {
    if (contactData) {
      form.reset({
        name: contactData.name || '',
        phone_number: contactData.phone_number || '',
        email: contactData.email || '',
        company_name: contactData.company_name || '',
        company_address: '', // Assuming company_address is not in ContactEntry, add if needed
      });
    } else {
      form.reset({ // Reset to empty if no contact data (e.g. dialog closed then reopened without data)
        name: '',
        phone_number: '',
        email: '',
        company_name: '',
        company_address: '',
      });
    }
  }, [contactData, form]);

  const onSubmit = async (formData: ContactFormData) => {
    if (!contactData) return; // Should not happen if dialog is open with a contact

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          phone_number: formData.phone_number,
          email: formData.email || null,
          company_name: formData.company_name || null,
          company_address: formData.company_address || null,
          updated_at: new Date().toISOString(), // Explicitly set updated_at
        })
        .match({ id: contactData.id });

      if (error) throw error;

      toast({
        title: 'Contact Updated',
        description: `${formData.name} has been successfully updated.`,
      });
      onSuccess(); 
      onOpenChange(false); 
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error updating contact',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contactData) return null; // Don't render if no contact data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update the details for {contactData.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" {...form.register('name')} disabled={isSubmitting} />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-phone_number">Phone Number</Label>
            <Input id="edit-phone_number" {...form.register('phone_number')} disabled={isSubmitting} />
            {form.formState.errors.phone_number && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone_number.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-email">Email (Optional)</Label>
            <Input id="edit-email" type="email" {...form.register('email')} disabled={isSubmitting} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-company_name">Company Name (Optional)</Label>
            <Input id="edit-company_name" {...form.register('company_name')} disabled={isSubmitting} />
          </div>
          <div>
            <Label htmlFor="edit-company_address">Company Address (Optional)</Label>
            <Input id="edit-company_address" {...form.register('company_address')} disabled={isSubmitting} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
