
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AddLeadDialog } from "./AddLeadDialog";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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
}

export function LeadsStage({ name, id }: LeadsStageProps) {
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

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row justify-between items-center pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          <span className="text-muted-foreground text-sm">
            {leads.length} leads: {totalValue.toLocaleString()} RM
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsAddLeadOpen(true)}>
          Quick Add
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
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
          </div>
        )}
      </CardContent>
      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        pipelineStageId={id}
        onLeadAdded={loadLeads}
      />
    </Card>
  );
}
