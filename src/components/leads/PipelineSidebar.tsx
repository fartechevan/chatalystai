
import { Plus, GripVertical, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Pipeline = {
  id: string;
  name: string;
  is_default: boolean;
};

interface PipelineSidebarProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  onPipelineSelect: (id: string) => void;
  isCollapsed: boolean;
  onCollapse: () => void;
}

export function PipelineSidebar({
  pipelines,
  selectedPipelineId,
  onPipelineSelect,
  isCollapsed,
  onCollapse,
}: PipelineSidebarProps) {
  return (
    <div className={`border-r bg-muted/30 transition-all duration-300 relative flex flex-col ${isCollapsed ? "w-0" : "w-64"}`}>
      <div className="p-4 space-y-2">
        {pipelines.map((pipeline) => (
          <button
            key={pipeline.id}
            onClick={() => onPipelineSelect(pipeline.id)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm truncate ${
              selectedPipelineId === pipeline.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <GripVertical className="h-4 w-4" />
            <span>{pipeline.name}</span>
          </button>
        ))}
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Plus className="h-4 w-4 mr-2" />
          Add pipeline
        </Button>
      </div>
      
      <button
        onClick={onCollapse}
        className={`absolute -right-3 top-3 p-1 rounded-full bg-background border shadow-sm hover:bg-accent transition-transform ${
          isCollapsed ? "rotate-180" : ""
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
}
