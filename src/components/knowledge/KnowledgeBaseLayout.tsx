
import { useState } from "react";
import { DocumentList } from "./DocumentList";
import { ImportDocumentForm } from "./ImportDocumentForm";
import { ChunksList } from "./ChunksList";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export function KnowledgeBaseLayout() {
  const [showImportForm, setShowImportForm] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleImportSuccess = () => {
    setShowImportForm(false);
    toast({
      title: "Document imported",
      description: "Your document has been successfully imported.",
    });
  };

  // Ensure this handler explicitly sets showImportForm to true
  const handleShowImportForm = () => {
    setShowImportForm(true);
    console.log("Import form visibility set to:", true);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <Button 
          onClick={handleShowImportForm}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Import Document
        </Button>
      </div>
      
      {showImportForm && (
        <div className="mb-8">
          <ImportDocumentForm 
            onCancel={() => setShowImportForm(false)} 
            onSuccess={handleImportSuccess}
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Documents</h2>
          <DocumentList 
            onSelectDocument={setSelectedDocumentId}
            selectedDocumentId={selectedDocumentId}
          />
        </div>
        
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Document Chunks</h2>
          <ChunksList documentId={selectedDocumentId} />
        </div>
      </div>
    </div>
  );
}
