
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DocumentList } from "./DocumentList";
import { ImportDocumentForm } from "./ImportDocumentForm";
import { ChunksList } from "./ChunksList";
import { CreateDocumentDialog } from "./CreateDocumentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, FilePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [showImportForm, setShowImportForm] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDocumentSelected, setIsDocumentSelected] = useState(false);
  const [isChunkFormOpen, setIsChunkFormOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleImportSuccess = () => {
    setShowImportForm(false);
    toast({
      title: "Document imported",
      description: "Your document has been successfully imported.",
    });
  };

  const handleCreateSuccess = (documentId: string) => {
    setShowCreateDialog(false);
    toast({
      title: "Document created",
      description: "Your document has been created. Now you can add chunks to it.",
    });

    navigate(`/dashboard/knowledge/document/${documentId}/edit`);
  };

  // Ensure this handler explicitly sets showImportForm to true
  const handleShowImportForm = () => {
    setShowImportForm(true);
    console.log("Import form visibility set to:", true);
  };

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Document
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShowImportForm} className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
              <FilePlus className="h-4 w-4 mr-2" />
              Create New Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showImportForm && (
        <div className="mb-8">
          <ImportDocumentForm
            onCancel={() => setShowImportForm(false)}
            onSuccess={handleImportSuccess}
          />
        </div>
      )}

      <CreateDocumentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />

      <div className="flex">
        {isDocumentSelected ? (
          <>
            <div className="w-1/4 pr-4">
              <h2 className="text-xl font-semibold mb-4">Documents</h2>
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
            <h2 className="text-xl font-semibold mb-4">Documents</h2>
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
