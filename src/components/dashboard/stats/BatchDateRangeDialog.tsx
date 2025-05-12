import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRange } from "react-day-picker";
import { toast } from '@/hooks/use-toast';

interface BatchDateRangeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (startDate: Date, endDate: Date) => Promise<void>;
  isCreatingBatch: boolean;
}

export const BatchDateRangeDialog: React.FC<BatchDateRangeDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isCreatingBatch,
}) => {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

  const handleSubmit = async () => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      toast({
        title: "Please select a date range.",
        variant: "destructive",
      });
      return;
    }
    await onSubmit(selectedDateRange.from, selectedDateRange.to);
    // Optionally reset date range after submission if dialog stays open or for next time
    // setSelectedDateRange(undefined); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Date Range for Batch Analysis</DialogTitle>
          <DialogDescription>
            Choose the start and end dates for the conversations you want to analyze.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
            <Calendar
              mode="range"
              selected={selectedDateRange}
              onSelect={setSelectedDateRange}
              numberOfMonths={1} // Show 1 month for simplicity in dialog
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreatingBatch}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreatingBatch || !selectedDateRange?.from || !selectedDateRange?.to}>
            {isCreatingBatch ? "Starting Batch..." : "Start Batch Analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
