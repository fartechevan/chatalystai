import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateEmbedding } from "@/lib/embeddings";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface KnowledgeChunk {
  id: string;
  content: string;
  similarity: number;
}

interface RetrievalTestProps {
  documentId: string;
}

export function RetrievalTest({ documentId }: RetrievalTestProps) {
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<KnowledgeChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    setIsLoading(true);
    try {
      const questionEmbedding = await generateEmbedding(question);

      const { data, error } = await supabase.rpc("match_knowledge_chunks", {
        query_embedding: questionEmbedding,
        match_threshold: 0.7,
        match_count: 3,
        document_id: documentId,
      });

      if (error) {
        throw error;
      }

      setResults(data);
    } catch (error) {
      console.error("Error during retrieval test:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3>Retrieval Test</h3>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="question" className="text-right">
            Question
          </Label>
          <Textarea
            id="question"
            className="col-span-3"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleTest} disabled={isLoading}>
        {isLoading ? "Testing..." : "Test"}
      </Button>
      <div>
        <h4>Results:</h4>
        {results.map((result) => (
          <div key={result.id}>
            <p>{result.content}</p>
            <p>Similarity: {result.similarity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
