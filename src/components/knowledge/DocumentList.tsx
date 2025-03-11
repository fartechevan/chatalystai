
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Document {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
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
        .select('id, title, created_at, updated_at')
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
        <Card 
          key={doc.id}
          className={`cursor-pointer transition-colors ${
            selectedDocumentId === doc.id ? 'border-primary' : ''
          }`}
          onClick={() => onSelectDocument(doc.id)}
        >
          <CardHeader className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{doc.title}</CardTitle>
              </div>
            </div>
            <CardDescription>
              Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardFooter className="p-4 pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDocument(doc.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
