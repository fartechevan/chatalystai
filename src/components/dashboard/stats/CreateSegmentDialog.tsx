import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateSegmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (segmentName: string) => void;
  isLoading?: boolean;
}

export function CreateSegmentDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateSegmentDialogProps) {
  const [segmentName, setSegmentName] = useState('');

  const handleSubmit = () => {
    if (segmentName.trim()) {
      onSubmit(segmentName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Segment</DialogTitle>
          <DialogDescription>
            Enter a name for your new segment. This segment will include participants from the currently listed conversations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="segment-name" className="text-right">
              Segment Name
            </Label>
            <Input
              id="segment-name"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., High Intent Customers"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading || !segmentName.trim()}>
            {isLoading ? "Creating..." : "Create Segment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
