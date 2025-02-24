
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AddLeadDialog } from "./AddLeadDialog";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  value: number;
  company_name: string | null;
  contact_first_name: string | null;
}

interface LeadsStageProps {
  name: string;
  id: string;
  index?: number;
}

const stageColors = {
  0: "border-gray-400", // Incoming leads - neutral gray
  1: "border-blue-300", // Contacted - light blue
  2: "border-yellow-200", // Qualified - light yellow
  3: "border-orange-200", // Nurturing - light orange
};

export function LeadsStage({ name, id, index = 0 }: LeadsStageProps) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    const { data, error } = await supabase
      .from('lead_pipeline')
      .select(`
        lead:leads (
          id,
          name,
          value,
          company_name,
          contact_first_name
        )
      `)
      .eq('stage_id', id)
      .order('position');

    if (!error && data) {
      // Transform the nested data structure
      const transformedLeads = data.map(item => item.lead) as Lead[];
      setLeads(transformedLeads);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();

    // Subscribe to realtime changes for both leads and lead_pipeline
    const channel = supabase
      .channel('stage-leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_pipeline',
          filter: `stage_id=eq.${id}`
        },
        () => {
          loadLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <div className="flex-1 min-w-[250px]">
      <div className={cn(
        "border-b-2 pb-2 mb-4",
        stageColors[index as keyof typeof stageColors] || "border-gray-400"
      )}>
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {name}
          </h3>
          <div className="text-sm">
            {leads.length} leads: {leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()} RM
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </>
        ) : (
          <>
            {leads.map((lead) => (
              <Card key={lead.id} className="p-3">
                <div className="font-medium">{lead.name}</div>
                <div className="text-sm text-muted-foreground">
                  {lead.company_name || lead.contact_first_name || 'No additional info'}
                </div>
                <div className="text-sm font-medium mt-1">
                  {lead.value?.toLocaleString()} RM
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        pipelineStageId={id}
        onLeadAdded={loadLeads}
      />
    </div>
  );
}
