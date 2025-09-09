import React from 'react';
import { CalendarIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";

interface DateRangeFilterProps {
  selectedRange: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangeFilter({ selectedRange, onRangeChange, className }: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(selectedRange);

  React.useEffect(() => {
    setTempRange(selectedRange);
  }, [selectedRange]);

  const handleApply = () => {
    onRangeChange(tempRange);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempRange(selectedRange);
    setOpen(false);
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className="w-full md:w-auto justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedRange?.from ? (
              selectedRange.to ? (
                <>
                  {format(selectedRange.from, "LLL dd, y")} -{" "}
                  {format(selectedRange.to, "LLL dd, y")}
                </>
              ) : (
                format(selectedRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
          />
          <div className="p-2 flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
