
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

  return (
    <div className="container mx-auto p-4">
      {/* The div that held the title and add document button is removed */}
      {/* ImportDocumentForm rendering removed */}
      {/* CreateDocumentDialog rendering removed */}

      <div className="flex pt-0"> {/* Adjusted pt-0 here, or remove if p-4 on parent is enough */}
        {isDocumentSelected ? (
          <>
            <div className="w-1/4 pr-4">
              {/* <h2 className="text-xl font-semibold mb-4">Documents</h2> */}
              <DocumentList
                onSelectDocument={handleSelectDocument}
                selectedDocumentId={selectedDocumentId}
              />
            </div>

            <div className="w-3/4">
              <h2 className="text-xl font-semibold mb-4">Document Chunks</h2>
              <Button className="mb-4" onClick={handleAddChunk}>Add Chunk</Button>
              <ChunksList documentId={selectedDocumentId} />
            </div>
          </>
        ) : (
          <div className="w-full">
            {/* <h2 className="text-xl font-semibold mb-4">Documents</h2> */}
            <DocumentList
              onSelectDocument={handleSelectDocument}
              selectedDocumentId={selectedDocumentId}
            />
          </div>
        )}
      </div>

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
