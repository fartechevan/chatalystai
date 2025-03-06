import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLead } from "@/components/leads/services/leadService";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmptyLeadStateProps {
  conversationId: string;
  onLeadCreated: (leadId: string) => void;
}

export function EmptyLeadState({ conversationId, onLeadCreated }: EmptyLeadStateProps) {
  const [defaultPipelineStageId, setDefaultPipelineStageId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch default pipeline stage
      const { data: defaultPipelineStage, error: pipelineError } = await supabase
        .from('pipeline_stages')
        .select('id')
        .limit(1)
        .single();

      if (pipelineError) {
        console.error("Error fetching default pipeline stage:", pipelineError);
        toast({
          title: "Error",
          description: "Failed to fetch default pipeline stage.",
          variant: "destructive",
        });
        return;
      }

      setDefaultPipelineStageId(defaultPipelineStage?.id || null);

      // Fetch current user
      const { data: session } = await supabase.auth.getSession();
      setUserId(session?.session?.user?.id || null);
    };

    fetchData();
  }, [toast]);

  const handleCreateLead = async () => {
    if (!defaultPipelineStageId || !userId) {
      toast({
        title: "Error",
        description: "Missing default pipeline or user information.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createLead({
        name: name,
        value: 0,
        pipelineStageId: defaultPipelineStageId,
        userId: userId,
        customerInfo: {
          name: name,
          company_name: companyName,
          phone_number: "", // TODO: Get phone number from conversation
        },
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Lead created successfully!",
        });
        onLeadCreated(result.leadId);
      } else {
        toast({
          title: "Error",
          description: `Failed to create lead: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to create lead.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 h-full space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Info className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg">No lead details</h3>
      <p className="text-muted-foreground text-sm max-w-[220px]">
        This conversation is not connected to any lead yet.
      </p>
      <div className="flex flex-col space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      </div>
      <Button variant="default" size="sm" onClick={handleCreateLead}>
        Create new lead
      </Button>
    </div>
  );
}
