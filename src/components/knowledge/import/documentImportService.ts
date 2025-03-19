
import { supabase } from "@/integrations/supabase/client";
import { 
  ChunkingMethod, 
  ChunkingOptions, 
  generateChunks 
} from "../utils/chunkingUtils";
import { ImportDocumentFormValues } from "./ImportDocumentFormTypes";

export async function saveChunkWithEmbedding(content: string, documentId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('knowledge-base', {
      body: { action: 'save_chunk', content, document_id: documentId }
    });
    
    if (error) {
      console.error('Error saving chunk:', error);
      throw new Error('Error saving chunk');
    }
    
    return data;
  } catch (error) {
    console.error('Error in saveChunkWithEmbedding:', error);
    throw error;
  }
}

export async function createDocument(values: ImportDocumentFormValues, pdfFile: File | null) {
  // Create document
  const { data: documentData, error: documentError } = await supabase
    .from("knowledge_documents")
    .insert({
      title: values.title,
      content: values.content || "",
      chunking_method: values.chunkingMethod,
      file_type: pdfFile ? 'pdf' : 'text'
    })
    .select("id")
    .single();
  
  if (documentError) {
    console.error("Document error:", documentError);
    throw documentError;
  }
  
  console.log("Document created with ID:", documentData.id);
  return documentData.id;
}

export async function processAndSaveChunks(values: ImportDocumentFormValues, documentId: string) {
  // Generate chunks
  const options: ChunkingOptions = {
    method: values.chunkingMethod as ChunkingMethod,
    lineBreakPattern: values.lineBreakPattern,
  };
  
  const documentChunks = generateChunks(values.content || "", options);
  
  // Insert chunks
  if (documentChunks.length > 0) {
    const chunksToInsert = documentChunks.map((chunk, index) => ({
      document_id: documentId,
      content: chunk,
      sequence: index + 1,
      metadata: JSON.stringify({
        chunkingMethod: values.chunkingMethod,
        index: index + 1,
        totalChunks: documentChunks.length,
        lineBreakPattern: values.lineBreakPattern,
      }),
    }));
    
    // Save chunks with embeddings through Edge Function
    for (const chunk of chunksToInsert) {
      await saveChunkWithEmbedding(chunk.content, documentId);
    }
    
    console.log("Inserted", chunksToInsert.length, "chunks");
  }
  
  return documentChunks.length;
}

export async function uploadPdfFile(pdfFile: File, documentId: string) {
  if (!pdfFile) return;
  
  const filePath = `documents/${documentId}/${pdfFile.name}`;
  const { error: uploadError } = await supabase
    .storage
    .from('documents')
    .upload(filePath, pdfFile);
  
  if (uploadError) {
    console.error("PDF upload error:", uploadError);
    throw uploadError;
  }
  
  console.log("PDF uploaded successfully");
  
  // Update document with file path
  const { error: updateError } = await supabase
    .from("knowledge_documents")
    .update({ file_path: filePath })
    .eq("id", documentId);
  
  if (updateError) {
    console.error("Error updating document with file path:", updateError);
    throw updateError;
  }
  
  return filePath;
}
