
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ImportDocumentForm } from "./ImportDocumentForm";
import { CreateDocumentDialog } from "./CreateDocumentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ChunkForm } from "./ChunkForm";
import { DocumentSelection } from "./DocumentSelection";
import { DocumentDetails } from "./DocumentDetails";

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

  const handleSelectDocument = async (documentId: string | null) => {
    setSelectedDocumentId(documentId);
    setIsDocumentSelected(!!documentId);

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

  const handleChunkFormClose = () => {
    setIsChunkFormOpen(false);
  };

  return (
    <div className="container mx-auto p-4">
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
              <DocumentSelection 
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={handleSelectDocument}
                setShowImportForm={setShowImportForm}
                setShowCreateDialog={setShowCreateDialog}
              />
            </div>

            <DocumentDetails 
              documentId={selectedDocumentId as string}
              setIsChunkFormOpen={setIsChunkFormOpen}
            />
          </>
        ) : (
          <DocumentSelection 
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={handleSelectDocument}
            setShowImportForm={setShowImportForm}
            setShowCreateDialog={setShowCreateDialog}
          />
        )}
      </div>

      <Dialog open={isChunkFormOpen} onOpenChange={setIsChunkFormOpen}>
        <ChunkForm
          documentId={selectedDocumentId || ""}
          onClose={handleChunkFormClose}
        />
      </Dialog>
    </div>
  );
}
