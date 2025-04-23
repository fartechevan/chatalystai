
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DashboardSidebarMenuProps {
  selectedPanel: "getting-started" | "analytics";
  onSelect: (panel: "getting-started" | "analytics") => void;
}

export function DashboardSidebarMenu({ selectedPanel, onSelect }: DashboardSidebarMenuProps) {
  return (
    <div className="flex flex-col h-full border-r bg-white">
      <div className="pt-4 flex-1 flex flex-col gap-1">
        <Button
          className={cn(
            "w-full justify-start px-6 py-3 text-lg",
            selectedPanel === "getting-started"
              ? "bg-blue-100 font-semibold text-blue-700"
              : "bg-transparent text-gray-700 hover:bg-muted"
          )}
          variant="ghost"
          onClick={() => onSelect("getting-started")}
        >
          Getting Started
        </Button>
        <Button
          className={cn(
            "w-full justify-start px-6 py-3 text-lg",
            selectedPanel === "analytics"
              ? "bg-blue-100 font-semibold text-blue-700"
              : "bg-transparent text-gray-700 hover:bg-muted"
          )}
          variant="ghost"
          onClick={() => onSelect("analytics")}
        >
          Analytics
        </Button>
      </div>
      {/* Optionally, a placeholder footer or logo space could fit here */}
    </div>
  );
}
