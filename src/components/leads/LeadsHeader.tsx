
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings2, Send, Printer, List, FileText, Search } from "lucide-react";
import { AddLeadDialog } from "./AddLeadDialog";
import { supabase } from "@/integrations/supabase/client";
import { PipelineSetupDialog } from "./PipelineSetupDialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface LeadsHeaderProps {
  selectedPipelineId: string;
}

export function LeadsHeader({ selectedPipelineId }: LeadsHeaderProps) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isEditPipelineOpen, setIsEditPipelineOpen] = useState(false);
  const [initialStageId, setInitialStageId] = useState<string | null>(null);

  useEffect(() => {
    // Get the first stage of the pipeline for new leads
    const fetchInitialStage = async () => {
      const { data } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', selectedPipelineId)
        .order('position')
        .limit(1)
        .single();
      
      if (data) {
        setInitialStageId(data.id);
      }
    };

    if (selectedPipelineId) {
      fetchInitialStage();
    }
  }, [selectedPipelineId]);

  return (
    <div className="border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm">
            Active leads
          </Button>
          <Input placeholder="Search leads..." className="w-[300px] pl-8" />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings2 className="h-4 w-4 mr-2" />
                Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsAddLeadOpen(true)}>
                <Send className="h-4 w-4 mr-2 text-blue-500" />
                <span>New broadcast</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditPipelineOpen(true)}>
                <Settings2 className="h-4 w-4 mr-2 text-blue-500" />
                <span>Edit pipeline</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer className="h-4 w-4 mr-2 text-gray-500" />
                <span>Print</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <List className="h-4 w-4 mr-2 text-gray-500" />
                <span>List settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                <span>Import</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                <span>Export</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Search className="h-4 w-4 mr-2 text-gray-500" />
                <span>Find duplicates</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => setIsAddLeadOpen(true)}
            disabled={!initialStageId}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        pipelineStageId={initialStageId}
        onLeadAdded={() => {
          // Dialog will handle the refresh
          setIsAddLeadOpen(false);
        }}
      />

      <PipelineSetupDialog
        isOpen={isEditPipelineOpen}
        onClose={() => setIsEditPipelineOpen(false)}
        onSave={() => {
          // Refresh the pipeline data
          setIsEditPipelineOpen(false);
        }}
        pipelineId={selectedPipelineId}
      />
    </div>
  );
}
