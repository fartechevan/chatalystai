
import { Routes, Route } from "react-router-dom";
import { KnowledgeBaseLayout } from "@/components/knowledge/KnowledgeBaseLayout";
import { ChunkEditor } from "@/components/knowledge/ChunkEditor";
import { RetrievalTest } from "@/components/knowledge/RetrievalTest";

export default function KnowledgeBase() {
  return (
    <Routes>
      <Route index element={<KnowledgeBaseLayout />} />
      <Route path="document/:documentId/edit" element={<ChunkEditor />} />
      <Route path="retrieval-test" element={<RetrievalTest />} />
    </Routes>
  );
}
