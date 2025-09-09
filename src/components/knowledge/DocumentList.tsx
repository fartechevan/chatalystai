
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // selectedDocumentId is passed as a prop, no need to manage it here directly for the table selection state
  // The table itself will manage its internal row selection state.
  // We might use selectedDocumentId to externally control or reflect selection if needed.

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          setIsAuthenticated(false);
          setCurrentUserId(null);
          return;
        }
        
        setIsAuthenticated(!!user);
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setCurrentUserId(null);
      }
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
      // Check if user is authenticated
      if (!currentUserId) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in to delete documents.",
        });
        return;
      }

      // Find the document to verify ownership
      const document = documents.find(doc => doc.id === id);
      if (!document) {
        toast({
          variant: "destructive",
          title: "Document not found",
          description: "The document you're trying to delete could not be found.",
        });
        return;
      }

      // Verify document ownership by fetching it with user_id check
      const { data: ownershipCheck, error: ownershipError } = await supabase
        .from('knowledge_documents')
        .select('id, user_id')
        .eq('id', id)
        .eq('user_id', currentUserId)
        .single();

      if (ownershipError || !ownershipCheck) {
        toast({
          variant: "destructive",
          title: "Permission denied",
          description: "You don't have permission to delete this document. You can only delete documents you created.",
        });
        return;
      }
      
      // First delete the file from storage if it exists
      if (document.file_path) {
        const { error: storageError } = await supabase
          .storage
          .from('documents')
          .remove([document.file_path]);
        
        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
          // Don't fail the entire operation if storage deletion fails
          toast({
            variant: "default",
            title: "Warning",
            description: "Document will be deleted, but the associated file could not be removed from storage.",
          });
        }
      }
      
      // Then delete the document record
      const { error: deleteError } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId); // Double-check ownership in the delete query
      
      if (deleteError) {
        // Log the full error details for debugging
        console.error('Supabase delete error details:', {
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          documentId: id,
          userId: currentUserId
        });
        
        // Provide specific error messages based on the error type
        let errorMessage = "Failed to delete the document.";
        
        if (deleteError.code === 'PGRST116') {
          errorMessage = "Document not found or you don't have permission to delete it.";
        } else if (deleteError.code === '42501') {
          errorMessage = "Permission denied. You can only delete documents you created.";
        } else if (deleteError.message.includes('violates row-level security')) {
          errorMessage = "You don't have permission to delete this document. This may be because the document has no owner assigned.";
        } else if (deleteError.message.includes('new row violates row-level security')) {
          errorMessage = "Row-level security policy violation. Please contact support if this persists.";
        }
        
        // Include the original error code and message for debugging
        errorMessage += ` (Error: ${deleteError.code || 'Unknown'} - ${deleteError.message})`;
        
        throw new Error(errorMessage);
      }
      
      // Clear selection if the deleted document was selected
      if (selectedDocumentId === id) {
        onSelectDocument(null);
      }
      
      // Refresh the document list
      refetch();
      
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
    } catch (error) {
      console.error('Document deletion error:', error);
      
      let errorMessage = "An unexpected error occurred while deleting the document.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error objects
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.error_description) {
          errorMessage = supabaseError.error_description;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error deleting document",
        description: errorMessage,
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
