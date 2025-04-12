import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Corrected import path
import { PlusCircle } from 'lucide-react';

// Validation Schema
const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  phoneNumber: z.string().min(10, { message: 'Valid phone number is required.' })
    // Basic validation - might need refinement based on expected formats
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format.' }), 
});

type FormData = z.infer<typeof formSchema>;

interface AddContactDialogProps {
  onContactAdded?: () => void; // Optional callback after successful addition
}

export function AddContactDialog({ onContactAdded }: AddContactDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
    },
  });

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    let successMessage = ''; // Variable to hold success message

    try {
      // 1. Check if customer already exists with this phone number
      const { data: existingCustomer, error: findError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', values.phoneNumber)
        .maybeSingle();

      if (findError) {
        throw new Error(`Error checking for existing contact: ${findError.message}`);
      }

      // 2. If exists, update the name
      if (existingCustomer) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({ name: values.name })
          .eq('id', existingCustomer.id);

        if (updateError) {
          throw new Error(`Error updating contact: ${updateError.message}`);
        }
        toast({
          title: 'Success',
          description: 'Contact updated successfully.',
        });
      } 
      // 3. If not exists, insert a new customer
      else {
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            name: values.name,
            phone_number: values.phoneNumber,
            // Add other default fields if necessary, e.g., user_id if applicable for RLS
          });

        if (insertError) {
          throw new Error(`Error adding new contact: ${insertError.message}`);
        }
        successMessage = 'Contact added successfully.'; // Set add success message
      }

      // If we reach here, the operation was successful (either add or update)
      toast({
        title: 'Success',
        description: successMessage, // Use the determined success message
      });

      // Reset form, close dialog, and call callback
      form.reset();
      setIsOpen(false);
      onContactAdded?.(); 

    } catch (error: unknown) { 
      console.error('Error adding/updating contact:', error); // Log specific error context
      // Type check before accessing message property
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to add contact: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Enter the details for the new contact. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    {/* Consider using a dedicated phone input component if available */}
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
