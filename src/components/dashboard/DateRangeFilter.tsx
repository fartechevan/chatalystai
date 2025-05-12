
import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangeFilterProps {
  selectedRange: string;
  onRangeChange: (value: string) => void;
}

export function DateRangeFilter({ selectedRange, onRangeChange }: DateRangeFilterProps) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-2"> {/* Removed mt-6 mb-2 */}
      <div className="flex items-center gap-2"> {/* Removed text-white/70 */}
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Date Range:</span>
      </div>
      <Select
        value={selectedRange}
        onValueChange={onRangeChange}
      >
        {/* Removed bg-slate-800/50 border-slate-700/50 text-white */}
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
