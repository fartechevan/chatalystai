
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, File, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  file_type: string;
  file_path: string;
}

interface DocumentListProps {
  onSelectDocument: (id: string | null) => void;
  selectedDocumentId: string | null;
}

export function DocumentList({ onSelectDocument, selectedDocumentId }: DocumentListProps) {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };

    checkAuth();
  }, []);

  const { data: documents = [], isLoading, refetch } = useQuery({
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
      const url = supabase.storage.from('documents').getPublicUrl(document.file_path).data.publicUrl;
      window.open(url, '_blank');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center">
        <p>Please sign in to view your documents.</p>
      </div>
    );
  }

  if (isLoading) {
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

  if (documents.length === 0) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center">
        <p>No documents found. Import a document to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {documents.map((doc) => (
        <div 
          key={doc.id}
          className={`flex items-center justify-between p-4 cursor-pointer transition-colors border rounded-md ${
            selectedDocumentId === doc.id ? 'border-primary' : 'border-muted'
          }`}
          onClick={() => onSelectDocument(doc.id)}
        >
          <div className="flex items-start gap-2">
            {doc.file_type === 'pdf' ? (
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            ) : (
              <File className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-base truncate font-medium">{doc.title}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}</span>
                {doc.file_type && (
                  <Badge variant="outline" className="text-xs">
                    {doc.file_type.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {doc.file_type === 'pdf' && doc.file_path && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewOriginalPdf(doc);
                }}
                title="View original PDF"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDocument(doc.id);
              }}
              title="Delete document"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
