
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="p-8">
      <Skeleton className="h-[40px] w-[300px] mb-6" />
      <div className="flex gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1">
            <Skeleton className="h-[200px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
