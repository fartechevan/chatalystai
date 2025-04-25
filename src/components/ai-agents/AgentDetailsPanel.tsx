import React, { useEffect, useState } from 'react'; // Import useState
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Trash2, Sparkles } from 'lucide-react';
import { getAIAgent, createAIAgent, updateAIAgent, deleteAIAgent } from '@/services/aiAgents/agentService';
import { listKnowledgeDocuments, KnowledgeDocument } from '@/services/knowledge/documentService'; // Import document service and type
import { AIAgent, NewAIAgent, UpdateAIAgent } from '@/types/aiAgents';
import { useToast } from '@/hooks/use-toast';
import PromptSuggestionDialog from './PromptSuggestionDialog';
import DocumentSelector from '@/components/knowledge/DocumentSelector'; // Import the selector
// TODO: Import form handling libraries (e.g., react-hook-form, zod) later

interface AgentDetailsPanelProps {
  selectedAgentId: string | null;
  onAgentUpdate: () => void; // Callback after create/update/delete
}

const AgentDetailsPanel: React.FC<AgentDetailsPanelProps> = ({ selectedAgentId, onAgentUpdate }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [agentName, setAgentName] = useState('');
  const [promptText, setPromptText] = useState('');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]); // State for selected docs
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);

  // --- Data Fetching ---
  // Fetch available knowledge documents
  const {
    data: availableDocuments,
    isLoading: isLoadingDocuments,
    isError: isDocumentsError,
    error: documentsError,
  } = useQuery<KnowledgeDocument[], Error>({
    queryKey: ['knowledgeDocuments'],
    queryFn: listKnowledgeDocuments,
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createAIAgent,
    onSuccess: (newAgent) => {
      queryClient.invalidateQueries({ queryKey: ['aiAgents'] }); // Refresh list
      toast({ title: "Success", description: `Agent "${newAgent.name}" created.` });
      onAgentUpdate(); // Reset selection/form
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to create agent: ${error.message}` });
     },
   });

  const updateMutation = useMutation({
    mutationFn: ({ agentId, updates }: { agentId: string; updates: UpdateAIAgent }) =>
      updateAIAgent(agentId, updates),
    onSuccess: (updatedAgent) => {
      queryClient.invalidateQueries({ queryKey: ['aiAgents'] }); // Refresh list
      queryClient.invalidateQueries({ queryKey: ['aiAgent', updatedAgent.id] }); // Refresh details view
      toast({ title: "Success", description: `Agent "${updatedAgent.name}" updated.` });
      onAgentUpdate(); // Reset selection/form (or maybe just refetch?)
    },
    onError: (error, variables) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update agent ${variables.agentId}: ${error.message}`,
      });
    },
  });

   // TODO: Add deleteMutation later

   // --- Queries ---
  const {
    data: selectedAgent,
    isLoading: isLoadingAgent,
    isError: isFetchError,
    error: fetchError,
  } = useQuery<AIAgent | null, Error>({
    queryKey: ['aiAgent', selectedAgentId], // Query key includes the ID
    queryFn: () => selectedAgentId ? getAIAgent(selectedAgentId) : null,
    enabled: !!selectedAgentId, // Only run query if an ID is selected
  });

  // Effect to update form state when selected agent changes or when creating new
  useEffect(() => {
    if (selectedAgentId && selectedAgent) {
      // Populate form for editing
      setAgentName(selectedAgent.name || '');
      setPromptText(selectedAgent.prompt || '');
      setSelectedDocumentIds(selectedAgent.knowledge_document_ids || []); // Set selected docs
    } else if (!selectedAgentId) {
      // Reset form for creating
      setAgentName('');
      setPromptText('');
      setSelectedDocumentIds([]); // Reset selected docs
    }
  }, [selectedAgentId, selectedAgent]);


  // --- Event Handlers ---
  const handleApplySuggestion = (suggestion: string) => {
    setPromptText(suggestion);
    // Optionally trigger form validation if using react-hook-form
  };


  // TODO: Add useMutation hooks for create, update, delete later
  // TODO: Add react-hook-form setup later

  const isCreating = selectedAgentId === null;

  // Determine content based on state
  let content;
  if (selectedAgentId && isLoadingAgent) {
    content = (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  } else if (selectedAgentId && isFetchError) {
    content = (
      <Alert variant="destructive" className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Agent Details</AlertTitle>
        <AlertDescription>
          {fetchError?.message || "An unknown error occurred."}
        </AlertDescription>
      </Alert>
    );
  } else if (selectedAgent) {
    // Display/Edit form for existing agent (Placeholder for now)
    // TODO: Populate form fields with selectedAgent data
    content = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-name">Agent Name</Label>
          <Input id="agent-name" defaultValue={selectedAgent.name} placeholder="e.g., Customer Support Bot" />
        </div>
        <div className="space-y-2">
           <div className="flex justify-between items-center">
             <Label htmlFor="agent-prompt">System Prompt</Label>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setIsSuggestDialogOpen(true)} // Open the dialog
             >
               <Sparkles className="h-3 w-3 mr-1" />
               Suggest
             </Button>
           </div>
          <Textarea
            id="agent-prompt"
            value={promptText} // Controlled component
            onChange={(e) => setPromptText(e.target.value)} // Update state on change
            placeholder="Define the agent's role and instructions..."
            rows={6}
          />
        </div>
         <div className="space-y-2">
           <Label>Knowledge Documents</Label>
           <DocumentSelector
             availableDocuments={availableDocuments}
             selectedDocumentIds={selectedDocumentIds}
             onSelectionChange={setSelectedDocumentIds}
             isLoading={isLoadingDocuments}
             isError={isDocumentsError}
              error={documentsError}
              disabled={updateMutation.isPending || isLoadingAgent} // Disable during update/load
            />
          </div>
      </div>
    );
  } else {
     // Create form (current placeholder)
     content = (
       <div className="space-y-4">
         {/* Create Form */}
         <div className="space-y-2">
           <Label htmlFor="agent-name-create">Agent Name</Label>
           <Input
             id="agent-name-create"
             value={agentName}
             onChange={(e) => setAgentName(e.target.value)}
             placeholder="e.g., Customer Support Bot"
             disabled={createMutation.isPending} // Disable while creating
           />
         </div>
         <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="agent-prompt-create">System Prompt</Label>
              <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setIsSuggestDialogOpen(true)} // Open the dialog
               >
                 <Sparkles className="h-3 w-3 mr-1" />
                Suggest
              </Button>
            </div>
           <Textarea
             id="agent-prompt-create"
             value={promptText} // Controlled component
             onChange={(e) => setPromptText(e.target.value)} // Update state on change
             placeholder="Define the agent's role and instructions..."
             rows={6}
             disabled={createMutation.isPending} // Disable while creating
           />
         </div>
         <div className="space-y-2">
           <Label>Knowledge Documents</Label>
            <DocumentSelector
             availableDocuments={availableDocuments}
             selectedDocumentIds={selectedDocumentIds}
             onSelectionChange={setSelectedDocumentIds}
             isLoading={isLoadingDocuments}
             isError={isDocumentsError}
             error={documentsError}
             disabled={createMutation.isPending}
           />
         </div>
       </div>
     );
  }


  // TODO: Implement handleSave and handleDelete using mutations
  const handleSave = () => {
    if (isCreating) {
      // --- Create Agent ---
      if (!agentName.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Agent name is required." });
        return;
      }
      if (!promptText.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "System prompt is required." });
        return;
      }

      const newAgentData: NewAIAgent = {
        name: agentName,
        prompt: promptText,
        knowledge_document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : null, // Add selected IDs or null
      };
      console.log("Creating agent with data:", newAgentData);
      createMutation.mutate(newAgentData);

    } else if (selectedAgentId && selectedAgent) {
       // --- Update Agent ---
       // Basic validation (can be enhanced with zod/react-hook-form)
       const currentName = (document.getElementById('agent-name') as HTMLInputElement)?.value || selectedAgent.name; // Get current value if uncontrolled
       if (!currentName.trim()) {
         toast({ variant: "destructive", title: "Validation Error", description: "Agent name is required." });
         return;
       }
        if (!promptText.trim()) {
         toast({ variant: "destructive", title: "Validation Error", description: "System prompt is required." });
         return;
       }

       const updates: UpdateAIAgent = {
         name: currentName, // Assuming name might be uncontrolled for edit for now
         prompt: promptText,
         knowledge_document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : null,
       };

       // Only send update if something actually changed (optional optimization)
       // const hasChanged = updates.name !== selectedAgent.name ||
       //                    updates.prompt !== selectedAgent.prompt ||
       //                    JSON.stringify(updates.knowledge_document_ids?.sort()) !== JSON.stringify(selectedAgent.knowledge_document_ids?.sort());
       // if (!hasChanged) {
       //   toast({ title: "Info", description: "No changes detected." });
       //   return;
       // }

       console.log("Updating agent", selectedAgentId, "with data:", updates);
       updateMutation.mutate({ agentId: selectedAgentId, updates });
     }
   };

  const handleDelete = () => {
     if (selectedAgentId) {
       console.log("Delete clicked for:", selectedAgentId);
       // Call deleteAIAgent mutation here
       // On success, invalidate queries and call onAgentUpdate()
     }
  };


  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>{isCreating ? 'Create New Agent' : (isLoadingAgent ? 'Loading...' : `Edit Agent: ${selectedAgent?.name ?? ''}`)}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        {content}
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || isLoadingAgent} // Disable during mutations or loading
          >
            {createMutation.isPending ? 'Creating...' : (updateMutation.isPending ? 'Saving...' : (isCreating ? 'Create Agent' : 'Save Changes'))}
          </Button>
          {!isCreating && selectedAgentId && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={/* deleteMutation.isPending || */ updateMutation.isPending || isLoadingAgent} // Disable during mutations or loading
              aria-label="Delete Agent"
            >
             {/* TODO: Add loading spinner for delete */}
             <Trash2 className="h-4 w-4" />
           </Button>
         )}
      </CardFooter>

       {/* Render the Dialog */}
       <PromptSuggestionDialog
         isOpen={isSuggestDialogOpen}
         onOpenChange={setIsSuggestDialogOpen}
         originalPrompt={promptText}
         onApplySuggestion={handleApplySuggestion}
       />
    </Card>
  );
};

export default AgentDetailsPanel;
