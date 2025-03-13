
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateEmbedding } from "@/lib/embeddings";

interface ChunkResult {
  id: string;
  content: string;
  similarity: number;
  document_title: string;
}

export function RetrievalTest() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ChunkResult[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: documents } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('id, title');
      
      if (error) {
        console.error(error);
        return [];
      }
      
      return data;
    },
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      // Generate embedding for the query
      const embedding = await generateEmbedding(query);
      
      // Search for similar chunks using the embedding
      const { data, error } = await supabase.rpc('match_chunks', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5
      });
      
      if (error) {
        throw error;
      }
      
      setResults(data || []);
    } catch (error) {
      console.error('Error searching chunks:', error);
      toast({
        variant: "destructive",
        title: "Search error",
        description: error instanceof Error ? error.message : "An error occurred during the search",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          className="mb-4"
          onClick={() => navigate('/dashboard/knowledge')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Knowledge Base
        </Button>
        <h1 className="text-2xl font-bold">Retrieval Test</h1>
        <p className="text-muted-foreground">Test how well your knowledge chunks can answer questions</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
          <CardDescription>
            Type a question to test how well your knowledge chunks can retrieve relevant information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Type your question here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? "Searching..." : "Search"}
              {!isSearching && <Search className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Results</h2>
          {results.map((result, index) => (
            <Card key={result.id} className="border">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">
                    Chunk from: {result.document_title || "Untitled"}
                  </CardTitle>
                  <Badge className="ml-2">
                    {(result.similarity * 100).toFixed(1)}% match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea 
                  readOnly 
                  value={result.content}
                  className="min-h-[100px] bg-muted/50"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="text-center py-8">
          <p>Searching for relevant chunks...</p>
        </div>
      )}

      {!isSearching && query && results.length === 0 && (
        <div className="text-center py-8 bg-muted rounded-lg">
          <p className="text-muted-foreground">No matching chunks found. Try a different query.</p>
        </div>
      )}
    </div>
  );
}
