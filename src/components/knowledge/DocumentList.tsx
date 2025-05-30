
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"; // Keep Card for loading state
import { Button } from "@/components/ui/button"; // Keep for potential future use or if actions need it directly
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
// import { supabase } from "@/integrations/supabase/client"; // Removed duplicate import

// Imports for the new DataTable structure
import { DocumentDataTable } from "./list/DocumentDataTable";
import { DocumentTableToolbar } from "./list/DocumentTableToolbar";
import { getDocumentColumns, Document } from "./list/columns"; // Document type comes from columns.tsx

interface DocumentListProps {
  onSelectDocument: (id: string | null) => void;
  selectedDocumentId: string | null; // Keep this to highlight selected row or for other logic
}

export function DocumentList({ onSelectDocument, selectedDocumentId }: DocumentListProps) {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // selectedDocumentId is passed as a prop, no need to manage it here directly for the table selection state
  // The table itself will manage its internal row selection state.
  // We might use selectedDocumentId to externally control or reflect selection if needed.

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };

    checkAuth();
  }, []);

  const { data: documents = [], isLoading, refetch } = useQuery<Document[]>({ // Specify Document[] type
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('id, title, created_at, updated_at, file_type, file_path')
        .order('updated_at', { ascending: false });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching documents",
          description: error.message,
        });
        return [];
      }
      
      return data as Document[];
    },
    enabled: isAuthenticated,
  });

  const handleDeleteDocument = async (id: string) => {
    try {
      // First check if there's a file to delete
      const document = documents.find(doc => doc.id === id);
      
      if (document?.file_path) {
        // Delete file from storage if it exists
        const { error: storageError } = await supabase
          .storage
          .from('documents')
          .remove([document.file_path]);
        
        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
        }
      }
      
      // Then delete the document
      const { error } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      if (selectedDocumentId === id) {
        onSelectDocument(null);
      }
      
      refetch();
      
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error deleting document",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const handleViewOriginalPdf = (document: Document) => {
    if (document.file_path) {
      const { data } = supabase.storage.from('documents').getPublicUrl(document.file_path);
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      } else {
        toast({
          variant: "destructive",
          title: "Error getting public URL",
          description: "Could not retrieve the public URL for the document.",
        });
      }
    }
  };

  const columns = getDocumentColumns({
    onDelete: handleDeleteDocument,
    onViewOriginal: handleViewOriginalPdf,
    onSelectDocument: onSelectDocument, // Pass the onSelectDocument prop for row click
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center">
        <p>Please sign in to view your documents.</p>
      </div>
    );
  }

  if (isLoading) {
    // You can use a more sophisticated skeleton loader for tables if available
    // For now, using a simple card skeleton
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-muted/50">
            <CardHeader className="p-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardFooter className="p-4 pt-0">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  // Note: The DocumentDataTable itself handles the "No documents found" case.
  // We can remove the explicit check here if the DataTable's "No results" message is sufficient.
  // if (documents.length === 0 && !isLoading) {
  //   return (
  //     <div className="bg-muted p-4 rounded-lg text-center">
  //       <p>No documents found. Import a document to get started.</p>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-4">
      {/* The DocumentTableToolbar can be added here if needed in the future */}
      {/* <DocumentTableToolbar table={table} /> */}
      <DocumentDataTable
        columns={columns}
        data={documents}
        onRowClick={(row) => onSelectDocument(row.id)} // This makes the row clickable
      />
    </div>
  );
}
