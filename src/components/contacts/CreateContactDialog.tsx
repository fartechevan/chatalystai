"use client";

import React, { useState } from 'react';
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
  DialogTrigger, // We might not use DialogTrigger if opened programmatically
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query'; // To invalidate queries

// Define the schema for form validation using Zod
const contactFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  phone_number: z.string().min(1, { message: "Phone number is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), // Optional but valid email
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  // metadata could be added here if needed, perhaps as a JSON string input
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Callback after successful creation
}

export const CreateContactDialog: React.FC<CreateContactDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient(); // For query invalidation

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      phone_number: '',
      email: '',
      company_name: '',
      company_address: '',
    },
  });

  const onSubmit = async (formData: ContactFormData) => {
    setIsSubmitting(true);
    try {
      // We are inserting into the 'customers' table
      const { error } = await supabase.from('customers').insert([
        {
          name: formData.name,
          phone_number: formData.phone_number,
          email: formData.email || null, // Ensure empty string becomes null
          company_name: formData.company_name || null,
          company_address: formData.company_address || null,
          // team_id: currentTeamId, // TODO: Get current team_id if required by RLS for insert
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Contact Created',
        description: `${formData.name} has been successfully added.`,
      });
      form.reset();
      onSuccess(); // Call success callback (e.g., to refetch list, close dialog)
      onOpenChange(false); // Close dialog
      // Invalidate queries related to customers/contacts to refresh lists
      queryClient.invalidateQueries({ queryKey: ['customers'] }); // Adjust queryKey if needed

    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error creating contact',
        description: errorMessage,
        // description: error.message || 'An unexpected error occurred.', // Removed duplicate
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new contact (customer).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register('name')} disabled={isSubmitting} />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input id="phone_number" {...form.register('phone_number')} disabled={isSubmitting} />
            {form.formState.errors.phone_number && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone_number.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email (Optional)</Label>
            <Input id="email" type="email" {...form.register('email')} disabled={isSubmitting} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="company_name">Company Name (Optional)</Label>
            <Input id="company_name" {...form.register('company_name')} disabled={isSubmitting} />
          </div>
          <div>
            <Label htmlFor="company_address">Company Address (Optional)</Label>
            <Input id="company_address" {...form.register('company_address')} disabled={isSubmitting} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
