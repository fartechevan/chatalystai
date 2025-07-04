import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Import RadioGroup
import { Terminal, Trash2, Sparkles, Send, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getAIAgent, createAIAgent, updateAIAgent, deleteAIAgent } from '@/services/aiAgents/agentService';
import { listKnowledgeDocuments, KnowledgeDocument } from '@/services/knowledge/documentService';
// Import the updated integration service and type
import { listIntegrations, ConfiguredIntegration } from '@/services/integrations/integrationService';
import { AIAgent, NewAIAgent, UpdateAIAgent } from '@/types/aiAgents';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client for function invocation
import { useToast } from '@/hooks/use-toast';
import PromptSuggestionDialog from './PromptSuggestionDialog';
import DocumentSelector from '@/components/knowledge/DocumentSelector';
import { ArrowLeft } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils'; // Import cn

// TODO: Import form handling libraries (e.g., react-hook-form, zod) later

interface AgentDetailsPanelProps {
  selectedAgentId: string | null;
  onAgentUpdate: () => void; // Callback after create/update/delete
  onNavigateBack: () => void; // Callback to navigate back to list
}

// Remove DetailSubView type
// type DetailSubView = 'details' | 'test';

const AgentDetailsPanel: React.FC<AgentDetailsPanelProps> = ({ selectedAgentId, onAgentUpdate, onNavigateBack }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [agentName, setAgentName] = useState('');
  const [promptText, setPromptText] = useState('');
  const [keywordTrigger, setKeywordTrigger] = useState<string | null>(''); // Added state
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [activationMode, setActivationMode] = useState<'keyword' | 'always_on'>('keyword'); // Added state for activation mode
  const [agentType, setAgentType] = useState<'chattalyst' | 'CustomAgent'>('chattalyst'); // Updated state for agent type
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(''); // This will store the webhook_url from custom_agent_config
  const [formStage, setFormStage] = useState<'selectType' | 'configureDetails'>('configureDetails'); // Added state for form stage
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  // --- State for Testing ---
  const [testQuery, setTestQuery] = useState('');
  // Replace testResponse/testError with chat history state
  // const [testResponse, setTestResponse] = useState<string | null>(null);
  // const [testError, setTestError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ 
    sender: 'user' | 'agent' | 'error'; 
    message: string;
    image?: string; // Optional image URL
  }[]>([]);

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

  // Placeholder: Fetch available integrations
  const {
    data: availableIntegrations,
    isLoading: isLoadingIntegrations,
    isError: isIntegrationsError,
    error: integrationsError,
  } = useQuery<ConfiguredIntegration[], Error>({ // Use ConfiguredIntegration here
    queryKey: ['integrations'],
    queryFn: listIntegrations,
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
      // Remove onAgentUpdate() call here - let query invalidation handle UI update via useEffect
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
      setKeywordTrigger(selectedAgent.keyword_trigger || '');
      setSelectedDocumentIds(selectedAgent.knowledge_document_ids || []);
      setSelectedIntegrationIds(selectedAgent.integrations_config_ids || []);
      setIsEnabled(selectedAgent.is_enabled ?? true);
      setActivationMode(selectedAgent.activation_mode || 'keyword');
      setAgentType(selectedAgent.agent_type || 'chattalyst'); // DB migration already handled 'n8n' to 'CustomAgent'
      setN8nWebhookUrl(selectedAgent.custom_agent_config?.webhook_url || ''); // Use new field
      // setSelectedReplyInstanceId(selectedAgent.reply_evolution_instance_id || null); // Removed
      setFormStage('configureDetails'); // For existing agents, go straight to details
    } else if (!selectedAgentId) {
      // Reset form for creating
      setAgentName('');
      setPromptText('');
      setKeywordTrigger('');
      setSelectedDocumentIds([]);
      setSelectedIntegrationIds([]);
      setIsEnabled(true);
      setActivationMode('keyword');
      setAgentType('chattalyst'); // Default for new agent
      setN8nWebhookUrl('');
      // setSelectedReplyInstanceId(null); // Removed
      setFormStage('selectType'); // For new agents, start with type selection
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
    // Logging removed

    if (isCreating) {
      // --- Create Agent ---
      if (!agentName.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Agent name is required." });
        return;
      }
      if (agentType === 'chattalyst' && !promptText.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "System prompt is required for Chattalyst agents." });
        return;
      }
      if (agentType === 'CustomAgent' && !n8nWebhookUrl.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Webhook URL is required for Custom Agents." });
        return;
      }

      const agentData: NewAIAgent = {
        name: agentName,
        prompt: agentType === 'chattalyst' ? promptText : '', // Only save prompt for chattalyst
        knowledge_document_ids: agentType === 'chattalyst' && selectedDocumentIds.length > 0 ? selectedDocumentIds : null,
        keyword_trigger: keywordTrigger?.trim() || null,
        integrations_config_ids: selectedIntegrationIds.length > 0 ? selectedIntegrationIds : [],
        is_enabled: isEnabled,
        activation_mode: activationMode,
        agent_type: agentType, // Will be 'chattalyst' or 'CustomAgent'
        custom_agent_config: agentType === 'CustomAgent' ? { webhook_url: n8nWebhookUrl.trim() } : null,
        // reply_evolution_instance_id: selectedReplyInstanceId, // Removed
      };
      createMutation.mutate(agentData);

    } else if (selectedAgentId && selectedAgent) {
      // --- Update Agent ---
      if (!agentName.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Agent name is required." });
        return;
      }
      if (agentType === 'chattalyst' && !promptText.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "System prompt is required for Chattalyst agents." });
        return;
      }
      if (agentType === 'CustomAgent' && !n8nWebhookUrl.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Webhook URL is required for Custom Agents." });
        return;
      }

      const updates: UpdateAIAgent = {
        name: agentName.trim(),
        prompt: agentType === 'chattalyst' ? promptText : '', // Only save prompt for chattalyst
        knowledge_document_ids: agentType === 'chattalyst' && selectedDocumentIds.length > 0 ? selectedDocumentIds : null,
        keyword_trigger: keywordTrigger?.trim() || null,
        integrations_config_ids: selectedIntegrationIds.length > 0 ? selectedIntegrationIds : [],
        is_enabled: isEnabled,
        activation_mode: activationMode,
        agent_type: agentType, // Will be 'chattalyst' or 'CustomAgent'
        custom_agent_config: agentType === 'CustomAgent' ? { webhook_url: n8nWebhookUrl.trim() } : null,
        // reply_evolution_instance_id: selectedReplyInstanceId, // Removed
      };

       // Only send update if something actually changed (optional optimization)
       // Consider comparing keyword_trigger and integration_ids as well
       // const hasChanged = updates.name !== selectedAgent.name ||
       //                    updates.prompt !== selectedAgent.prompt ||
       //                    JSON.stringify(updates.knowledge_document_ids?.sort()) !== JSON.stringify(selectedAgent.knowledge_document_ids?.sort());
       // if (!hasChanged) {
       //   toast({ title: "Info", description: "No changes detected." });
       //   return;
       // }

       // Logging removed
       // console.log("Updating agent", selectedAgentId, "with data:", updates); // Remove this log as well
       
       console.log('[CLIENT DEBUG] Attempting to update agent. ID:', selectedAgentId);
       console.log('[CLIENT DEBUG] Update payload:', JSON.stringify(updates, null, 2)); // Pretty print JSON

       if (!selectedAgentId) {
         toast({ variant: "destructive", title: "Critical Error", description: "Agent ID is missing before update attempt. Please refresh." });
         console.error('[CLIENT DEBUG] CRITICAL: selectedAgentId is null or undefined before mutate call.');
         return;
       }

       updateMutation.mutate({ agentId: selectedAgentId, updates });
    }
  };

  const handleDelete = () => {
    if (selectedAgentId) {
      // TODO: Implement delete mutation
      // Call deleteAIAgent mutation here
      // On success, invalidate queries and call onAgentUpdate()
    }
  };

  // --- Test Agent Mutation ---
  const testAgentMutation = useMutation({
    mutationFn: async ({ agentId, query }: { agentId: string; query: string }) => {
      // TODO: Replace 'query-agent' with the actual Supabase function name when created
      const { data, error } = await supabase.functions.invoke('query-agent', {
        body: { agentId, query },
      });

      if (error) {
        console.error("Error invoking query-agent function:", error);
        throw new Error(error.message || 'Failed to query agent.');
      }
      
      // Return the full data object to handle in onSuccess
      return data;
    },
    onMutate: (variables) => {
      // Add user query to chat history immediately
      setChatHistory(prev => [...prev, { sender: 'user', message: variables.query }]);
      setTestQuery(''); // Clear input field
    },
    onSuccess: (data) => {
      // Check if data has the expected structure
      if (data && typeof data.response === 'string') {
        // Add agent response to chat history with image if available
        setChatHistory(prev => [...prev, { 
          sender: 'agent', 
          message: data.response,
          image: data.selected_image || undefined
        }]);
      } else {
        // Handle unexpected response format
        setChatHistory(prev => [...prev, { 
          sender: 'error', 
          message: 'Invalid response format from agent function.' 
        }]);
      }
    },
    onError: (error) => {
       // Add error message to chat history
      setChatHistory(prev => [...prev, { sender: 'error', message: `Error: ${error.message}` }]);
    },
  });

  const handleTestQuery = () => {
    if (!selectedAgentId) {
      toast({ variant: "destructive", title: "Error", description: "No agent selected." });
      return;
    }
    if (!testQuery.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Test query cannot be empty." });
      return;
    }
    testAgentMutation.mutate({ agentId: selectedAgentId, query: testQuery });
  };


  // --- Render Agent Details Form ---
  const renderAgentDetailsForm = () => (
    <div className="space-y-6"> {/* Increased spacing */}
       {/* Enable/Disable Switch */}
       <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
         <Label htmlFor="agent-enabled" className="flex flex-col space-y-1">
           <span>Agent Status</span>
           <span className="font-normal leading-snug text-muted-foreground">
             Enable or disable this agent globally.
           </span>
         </Label>
         <Switch
           id="agent-enabled"
           checked={isEnabled}
           onCheckedChange={setIsEnabled}
           disabled={isCreating || updateMutation.isPending || isLoadingAgent}
           aria-readonly={isCreating || updateMutation.isPending || isLoadingAgent}
         />
       </div>

       {/* Agent Type Selection (Disabled after creation) - Commented out as per request */}
       {/*
       <div className="space-y-3">
         <Label>Agent Type</Label>
         <RadioGroup
           value={agentType}
           // onValueChange should not be active for existing agents if type is immutable
           // onValueChange={(value: 'chattalyst' | 'CustomAgent') => setAgentType(value)} 
           className="flex space-x-4"
           // Disable this field for existing agents
           disabled={!isCreating || updateMutation.isPending || isLoadingAgent}
         >
           <div className="flex items-center space-x-2">
             <RadioGroupItem value="chattalyst" id="type-chattalyst" />
             <Label htmlFor="type-chattalyst" className="font-normal">Chattalyst Agent</Label>
           </div>
           <div className="flex items-center space-x-2">
             <RadioGroupItem value="CustomAgent" id="type-custom" />
             <Label htmlFor="type-custom" className="font-normal">Custom Agent</Label>
           </div>
         </RadioGroup>
         <p className="text-sm text-muted-foreground">
           The type of agent. This cannot be changed after creation.
         </p>
       </div>
       */}

       {/* Agent Name */}
       <div className="space-y-2">
        <Label htmlFor="agent-name">Agent Name</Label>
        <Input
          id="agent-name"
          value={agentName} // Use value for controlled component
          onChange={(e) => setAgentName(e.target.value)} // Update state on change
          placeholder="e.g., Customer Support Bot"
          disabled={isCreating || updateMutation.isPending || isLoadingAgent}
        />
      </div>

      {agentType === 'chattalyst' && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="agent-prompt">System Prompt</Label>
              <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSuggestDialogOpen(true)}
            disabled={isCreating || updateMutation.isPending || isLoadingAgent}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Suggest
          </Button>
        </div>
        <Textarea
          id="agent-prompt"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Define the agent's role and instructions..."
          rows={6}
          disabled={isCreating || updateMutation.isPending || isLoadingAgent}
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
          disabled={isCreating || updateMutation.isPending || isLoadingAgent}
        />
      </div>
        </>
      )}
      {agentType === 'CustomAgent' && (
        <div className="space-y-2">
          <Label htmlFor="custom-agent-webhook-url">Webhook URL</Label>
          <Input
            id="custom-agent-webhook-url"
            value={n8nWebhookUrl} // State still named n8nWebhookUrl, but represents generic webhook
            onChange={(e) => setN8nWebhookUrl(e.target.value)}
            placeholder="Enter your webhook URL"
            disabled={isCreating || updateMutation.isPending || isLoadingAgent}
          />
          <p className="text-sm text-muted-foreground">
            The webhook URL your custom agent will receive requests at.
          </p>
        </div>
      )}
      
      {/* Activation Mode */}
      <div className="space-y-3">
        <Label>Activation Mode</Label>
        <RadioGroup
          value={activationMode}
          onValueChange={(value: 'keyword' | 'always_on') => setActivationMode(value)}
          className="flex space-x-4"
          disabled={isCreating || updateMutation.isPending || isLoadingAgent}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="keyword" id="mode-keyword" />
            <Label htmlFor="mode-keyword" className="font-normal">Keyword Trigger</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="always_on" id="mode-always" />
            <Label htmlFor="mode-always" className="font-normal">Always On</Label>
          </div>
        </RadioGroup>
        <p className="text-sm text-muted-foreground">
          Choose how the agent activates in connected channels. 'Always On' responds to every message.
        </p>
      </div>

      {/* Keyword Trigger Input (Moved after Activation Mode) */}
      {activationMode === 'keyword' && (
        <div className="space-y-2">
          <Label htmlFor="agent-keyword-trigger">Keyword Trigger</Label>
          <Input
            id="agent-keyword-trigger"
            value={keywordTrigger ?? ''}
            onChange={(e) => setKeywordTrigger(e.target.value)}
            placeholder="e.g., !support"
            disabled={isCreating || updateMutation.isPending || isLoadingAgent}
          />
          <p className="text-sm text-muted-foreground">
            If set, the agent will only respond in connected channels when a message starts with this keyword.
          </p>
        </div>
      )}
      {/* Connected Integrations Selector (Placeholder) */}
      <div className="space-y-2">
         <Label>Connected Integrations</Label>
         {isLoadingIntegrations ? (
           <Skeleton className="h-10 w-full" />
         ) : isIntegrationsError ? (
           <Alert variant="destructive">
             <Terminal className="h-4 w-4" />
             <AlertTitle>Error Loading Integrations</AlertTitle>
             <AlertDescription>{integrationsError?.message}</AlertDescription>
           </Alert>
         ) : availableIntegrations && availableIntegrations.length > 0 ? (
           <div className="space-y-2 rounded-md border p-4">
             {/* Replace with actual multi-select component later */}
             {availableIntegrations.map((integration) => (
               // Use integration.id (integrations_config.id) as the key and value for selection
               <div key={integration.id} className="flex items-center space-x-2">
                 <input
                   type="checkbox"
                   id={`integration-${integration.id}`} // Use config ID for unique ID
                   checked={selectedIntegrationIds.includes(integration.id)} // Check against config ID
                   onChange={(e) => {
                     const id = integration.id; // Use config ID
                     setSelectedIntegrationIds(prev =>
                       e.target.checked ? [...prev, id] : prev.filter(i => i !== id)
                     );
                   }}
                   disabled={isCreating || updateMutation.isPending || isLoadingAgent}
                 />
                 {/* Use config ID for label association */}
                 <Label htmlFor={`integration-${integration.id}`} className="font-normal">
                   {/* Display instance name if available, otherwise base name */}
                   {integration.instance_display_name || integration.name}
                 </Label>
               </div>
             ))}
           </div>
         ) : (
           <p className="text-sm text-muted-foreground">No integrations found or available to connect.</p>
         )}
       </div>
      {/* Reply Evolution Instance Selector Removed */}
    </div>
  );

  // --- Render Create Agent Form ---
   const renderCreateAgentForm = () => (
     <div className="space-y-4">
       <div className="space-y-2">
         <Label htmlFor="agent-name-create">Agent Name</Label>
         <Input
           id="agent-name-create"
           value={agentName}
           onChange={(e) => setAgentName(e.target.value)}
           placeholder="e.g., Customer Support Bot"
           disabled={createMutation.isPending}
         />
       </div>
       {agentType === 'chattalyst' && (
         <>
           <div className="space-y-2">
             <div className="flex justify-between items-center">
               <Label htmlFor="agent-prompt-create">System Prompt</Label>
               <Button
             variant="outline"
             size="sm"
             onClick={() => setIsSuggestDialogOpen(true)}
             disabled={createMutation.isPending}
           >
             <Sparkles className="h-3 w-3 mr-1" />
             Suggest
           </Button>
         </div>
         <Textarea
           id="agent-prompt-create"
           value={promptText}
           onChange={(e) => setPromptText(e.target.value)}
           placeholder="Define the agent's role and instructions..."
           rows={6}
           disabled={createMutation.isPending}
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
         </>
       )}
       {agentType === 'CustomAgent' && (
        <div className="space-y-2">
          <Label htmlFor="custom-agent-webhook-url-create">Webhook URL</Label>
          <Input
            id="custom-agent-webhook-url-create"
            value={n8nWebhookUrl} // State still named n8nWebhookUrl
            onChange={(e) => setN8nWebhookUrl(e.target.value)}
            placeholder="Enter your webhook URL"
            disabled={createMutation.isPending}
          />
          <p className="text-sm text-muted-foreground">
            The webhook URL your custom agent will receive requests at.
          </p>
        </div>
       )}
       {/* Activation Mode - Create */}
        <div className="space-y-3">
           <Label>Activation Mode</Label>
           <RadioGroup
             value={activationMode}
             onValueChange={(value: 'keyword' | 'always_on') => setActivationMode(value)}
             className="flex space-x-4"
             disabled={createMutation.isPending}
           >
             <div className="flex items-center space-x-2">
               <RadioGroupItem value="keyword" id="mode-keyword-create" />
               <Label htmlFor="mode-keyword-create" className="font-normal">Keyword Trigger</Label>
             </div>
             <div className="flex items-center space-x-2">
               <RadioGroupItem value="always_on" id="mode-always-create" />
               <Label htmlFor="mode-always-create" className="font-normal">Always On</Label>
             </div>
           </RadioGroup>
            <p className="text-sm text-muted-foreground">
             Choose how the agent activates in connected channels. 'Always On' responds to every message.
           </p>
         </div>
       {/* Keyword Trigger Input - Create (Moved after Activation Mode) */}
       {activationMode === 'keyword' && (
         <div className="space-y-2">
           <Label htmlFor="agent-keyword-trigger-create">Keyword Trigger (Optional)</Label>
           <Input
             id="agent-keyword-trigger-create"
             value={keywordTrigger ?? ''}
             onChange={(e) => setKeywordTrigger(e.target.value)}
             placeholder="e.g., !support"
             disabled={createMutation.isPending}
           />
           <p className="text-sm text-muted-foreground">
             If set, the agent will only respond in connected channels when a message starts with this keyword. Only applicable if Activation Mode is 'Keyword Trigger'.
           </p>
         </div>
       )}
       {/* Connected Integrations Selector (Placeholder) - Create */}
       <div className="space-y-2">
          <Label>Connected Integrations</Label>
          {isLoadingIntegrations ? (
            <Skeleton className="h-10 w-full" />
          ) : isIntegrationsError ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading Integrations</AlertTitle>
              <AlertDescription>{integrationsError?.message}</AlertDescription>
            </Alert>
          ) : availableIntegrations && availableIntegrations.length > 0 ? (
            <div className="space-y-2 rounded-md border p-4">
              {/* Replace with actual multi-select component later */}
              {availableIntegrations.map((integration) => (
                 // Use integration.id (integrations_config.id) as the key and value for selection
                <div key={integration.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`integration-create-${integration.id}`} // Use config ID for unique ID
                    checked={selectedIntegrationIds.includes(integration.id)} // Check against config ID
                    onChange={(e) => {
                      const id = integration.id; // Use config ID
                      setSelectedIntegrationIds(prev =>
                        e.target.checked ? [...prev, id] : prev.filter(i => i !== id)
                      );
                    }}
                    disabled={createMutation.isPending}
                  />
                   {/* Use config ID for label association */}
                  <Label htmlFor={`integration-create-${integration.id}`} className="font-normal">
                     {/* Display instance name if available, otherwise base name */}
                    {integration.instance_display_name || integration.name}
                  </Label>
                </div>
              ))}
            </div>
         ) : (
           <p className="text-sm text-muted-foreground">No integrations found or available to connect.</p>
         )}
        </div>
       {/* Reply Evolution Instance Selector - Create Removed */}
    </div>
  );


  // --- Render Test Agent Section (Chat Interface) ---
  const renderTestAgentSection = () => (
    <div className="flex flex-col h-full">
      {/* Chat History Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 border rounded-md mb-4 bg-background">
        {chatHistory.map((entry, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col",
              entry.sender === 'user' ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "p-3 rounded-lg max-w-[75%] whitespace-pre-wrap", // Allow wrapping
                entry.sender === 'user' ? 'bg-primary text-primary-foreground' : '',
                entry.sender === 'agent' ? 'bg-muted' : '',
                entry.sender === 'error' ? 'bg-destructive text-destructive-foreground' : ''
              )}
            >
              {entry.message}
            </div>
            
            {/* Display image if available */}
            {entry.image && (
              <div className="mt-2 max-w-[75%]">
                <img 
                  src={entry.image} 
                  alt="Agent response image" 
                  className="rounded-lg border max-w-full h-auto"
                  onError={(e) => {
                    // Handle image loading errors
                    console.error("Failed to load image:", entry.image);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        ))}
        {/* Loading indicator */}
        {testAgentMutation.isPending && (
          <div className="flex justify-start">
             <div className="p-3 rounded-lg bg-muted flex items-center text-sm text-muted-foreground">
               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
               Thinking...
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex items-center space-x-2">
        <Textarea
          id="test-query-input"
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          placeholder="Send a message..."
          rows={2} // Adjust rows as needed
          className="flex-grow resize-none"
          disabled={testAgentMutation.isPending || isLoadingAgent}
          onKeyDown={(e) => {
             // Optional: Send on Enter, Shift+Enter for newline
             if (e.key === 'Enter' && !e.shiftKey) {
               e.preventDefault();
               handleTestQuery();
             }
           }}
        />
        <Button
          onClick={handleTestQuery}
          disabled={testAgentMutation.isPending || createMutation.isPending || updateMutation.isPending || isLoadingAgent || !testQuery.trim()}
          size="icon"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );


  // Determine main content based on state
  // This local 'mainContent' variable is no longer needed as rendering is handled in the return JSX.

  const renderSelectTypeStage = () => (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <Label>Select Agent Type</Label>
        <RadioGroup
          value={agentType}
          onValueChange={(value: 'chattalyst' | 'CustomAgent') => setAgentType(value)}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="chattalyst" id="type-chattalyst-select" />
            <Label htmlFor="type-chattalyst-select" className="font-normal">Chattalyst Agent</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="CustomAgent" id="type-custom-select" />
            <Label htmlFor="type-custom-select" className="font-normal">Custom Agent</Label>
          </div>
        </RadioGroup>
        <p className="text-sm text-muted-foreground">
          Choose the type of agent you want to create.
        </p>
      </div>
      <Button onClick={() => setFormStage('configureDetails')}>Next</Button>
    </div>
  );


  return (
    <Card className="w-full h-full flex flex-col">
      {/* Header with Back Button and Title */}
      <CardHeader className="flex flex-row items-center space-x-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={onNavigateBack} aria-label="Back to list">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <CardTitle className="flex-grow">
          {isCreating ? 
            (formStage === 'selectType' ? 'Select Agent Type' : 'Create New Agent') : 
            (isLoadingAgent ? 'Loading...' : `${selectedAgent?.name ?? ''}`)}
        </CardTitle>
      </CardHeader>

      {/* Main Content Area */}
      <CardContent className="flex-grow overflow-auto p-0">
        {isCreating && formStage === 'selectType' ? (
          renderSelectTypeStage()
        ) : isCreating && formStage === 'configureDetails' ? (
          <div className="p-6">
            {renderCreateAgentForm()}
          </div>
        ) : selectedAgentId && isLoadingAgent ? (
          <div className="p-6 space-y-4"> {/* For loading skeleton */}
            <Skeleton className="h-8 w-1/2" /> <Skeleton className="h-6 w-1/4" /> 
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-6 w-1/4" /> 
            <Skeleton className="h-20 w-full" /> <Skeleton className="h-6 w-1/4" /> 
            <Skeleton className="h-16 w-full" />
          </div>
        ) : selectedAgentId && isFetchError ? (
          <div className="p-6"> {/* For error alert */}
            <Alert variant="destructive" className="m-4">
              <Terminal className="h-4 w-4" /> <AlertTitle>Error Fetching Agent Details</AlertTitle> 
              <AlertDescription>{fetchError?.message || "An unknown error occurred."}</AlertDescription>
            </Alert>
          </div>
        ) : selectedAgent ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-auto p-6">
                {renderAgentDetailsForm()}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-auto p-6">
                {renderTestAgentSection()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : null}
      </CardContent>

      {/* Footer with Save/Delete Buttons */}
      {/* Only show footer if not in 'selectType' stage or if editing */}
      {(!isCreating || formStage === 'configureDetails') && (
        <CardFooter className="border-t pt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || isLoadingAgent || (isCreating && formStage === 'selectType')}
            >
              {createMutation.isPending ? 'Creating...' : (updateMutation.isPending ? 'Saving...' : (isCreating ? 'Create Agent' : 'Save Changes'))}
            </Button>
            {!isCreating && selectedAgentId && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
               // Disable only during mutations/loading
              disabled={/* deleteMutation.isPending || */ updateMutation.isPending || isLoadingAgent}
              aria-label="Delete Agent"
            >
             {/* TODO: Add loading spinner for delete */}
             <Trash2 className="h-4 w-4" />
           </Button>
         )}
      </CardFooter>
      )} {/* Close the conditional rendering for CardFooter */}

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
