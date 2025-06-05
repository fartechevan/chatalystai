"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label'; // Keep Label for consistent styling
import type { ContactEntry } from './list/columns';

interface ViewContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactData: ContactEntry | null;
}

export const ViewContactDialog: React.FC<ViewContactDialogProps> = ({
  open,
  onOpenChange,
  contactData,
}) => {
  if (!contactData) {
    return null;
  }

  // Helper to display data or N/A
  const displayValue = (value: string | null | undefined) => value || 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>View Contact</DialogTitle>
          <DialogDescription>
            Details for {contactData.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="view-name">Name</Label>
            <p id="view-name" className="text-sm mt-1 p-2 border rounded-md bg-gray-50">
              {displayValue(contactData.name)}
            </p>
          </div>
          <div>
            <Label htmlFor="view-phone_number">Phone Number</Label>
            <p id="view-phone_number" className="text-sm mt-1 p-2 border rounded-md bg-gray-50">
              {displayValue(contactData.phone_number)}
            </p>
          </div>
          <div>
            <Label htmlFor="view-email">Email</Label>
            <p id="view-email" className="text-sm mt-1 p-2 border rounded-md bg-gray-50">
              {displayValue(contactData.email)}
            </p>
          </div>
          <div>
            <Label htmlFor="view-company_name">Company Name</Label>
            <p id="view-company_name" className="text-sm mt-1 p-2 border rounded-md bg-gray-50">
              {displayValue(contactData.company_name)}
            </p>
          </div>
          {/* 
          If company_address were part of ContactEntry:
          <div>
            <Label htmlFor="view-company_address">Company Address</Label>
            <p id="view-company_address" className="text-sm mt-1 p-2 border rounded-md bg-gray-50">
              {displayValue(contactData.company_address)}
            </p>
          </div> 
          */}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
