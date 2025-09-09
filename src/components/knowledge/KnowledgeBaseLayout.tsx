
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DocumentList } from "./DocumentList";
// ImportDocumentForm removed
import { ChunksList } from "./ChunksList";
// CreateDocumentDialog removed
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
// PlusCircle, Upload, FilePlus removed
// DropdownMenu components removed
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChunkForm } from "./ChunkForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

interface Document {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  file_type: string;
  file_path: string;
}

export function KnowledgeBaseLayout() {
  // showImportForm and showCreateDialog state removed
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDocumentSelected, setIsDocumentSelected] = useState(false);
  const [isChunkFormOpen, setIsChunkFormOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // handleImportSuccess removed
  // handleCreateSuccess removed
  // handleShowImportForm removed

  const handleSelectDocument = async (documentId: string | null) => {
    setSelectedDocumentId(documentId);
    setIsDocumentSelected(!!documentId); // Update the state

    if (documentId) {
      // Fetch the selected document
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching document",
          description: error.message,
        });
        setSelectedDocument(null);
      } else {
        setSelectedDocument(data as Document);
      }
    } else {
      setSelectedDocument(null);
    }
  };

  const handleAddChunk = () => {
    setIsChunkFormOpen(true);
  };

  const handleChunkFormClose = () => {
    setIsChunkFormOpen(false);
    // Invalidate the query to refresh the chunks list
    queryClient.invalidateQueries({ queryKey: ['knowledge-chunks', selectedDocumentId] });
  };

  const { refetch } = useQuery({
    queryKey: ['knowledge-chunks', selectedDocumentId],
    queryFn: async () => {
      if (!selectedDocumentId) return [];
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .eq('document_id', selectedDocumentId);
      if (error) {
        console.error(error);
        return [];
      }
      return data;
    },
    enabled: !!selectedDocumentId,
  });

  const handleBackToDocuments = () => {
    setSelectedDocumentId(null);
    setSelectedDocument(null);
    setIsDocumentSelected(false);
  };

  return (
    <div className="container mx-auto p-4">
      {/* The div that held the title and add document button is removed */}
      {/* ImportDocumentForm rendering removed */}
      {/* CreateDocumentDialog rendering removed */}

      {isDocumentSelected ? (
        // Chunks view - full page
        <div className="w-full">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToDocuments}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Documents
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {selectedDocument?.title || 'Document Chunks'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage and edit document chunks
              </p>
            </div>
            <Button onClick={handleAddChunk}>Add Chunk</Button>
          </div>
          <ChunksList documentId={selectedDocumentId} />
        </div>
      ) : (
        // Documents list view - full page
        <div className="w-full">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">
              Select a document to view and manage its chunks
            </p>
          </div>
          <DocumentList
            onSelectDocument={handleSelectDocument}
            selectedDocumentId={selectedDocumentId}
          />
        </div>
      )}

      <Dialog open={isChunkFormOpen} onOpenChange={setIsChunkFormOpen}>
        <ChunkForm
          documentId={selectedDocumentId || ""}
          onClose={() => {
            handleChunkFormClose();
            setIsChunkFormOpen(false);
          }}
          refetch={refetch}
        />
      </Dialog>
    </div>
  );
}
