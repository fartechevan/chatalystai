
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateEmbedding } from "@/lib/embeddings";
import { Search } from "lucide-react";

interface RetrievalTestProps {
  documentId: string;
}

interface ChunkResult {
  id: string;
  content: string;
  title: string;
  similarity: number;
}

export function RetrievalTest({ documentId }: RetrievalTestProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ChunkResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      
      // Search for similar chunks using vector similarity
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/match_document_chunks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            query_embedding: queryEmbedding,
            match_threshold: 0.5, 
            match_count: 5,
            p_document_id: documentId
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error from Supabase: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResults(data as ChunkResult[]);
    } catch (err) {
      console.error("Error during retrieval test:", err);
      setError("Failed to perform retrieval test. Please check if OpenAI API key is set.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">Knowledge Retrieval Test</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex gap-2 mb-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your document..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Searching..." : <Search className="h-4 w-4 mr-2" />}
            Test
          </Button>
        </div>
        
        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}
        
        {results.length > 0 ? (
          <div className="space-y-4">
            <h3 className="font-medium">Results:</h3>
            {results.map((result, index) => (
              <Card key={result.id} className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{result.title || `Chunk ${index + 1}`}</h4>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">
                      {(result.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{result.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !isLoading && query && (
          <p className="text-muted-foreground text-sm">No results found. Try a different query.</p>
        )}
      </CardContent>
    </div>
  );
}
