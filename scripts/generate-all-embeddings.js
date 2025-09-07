import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use local Supabase instance
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function getAllChunksWithoutEmbeddings() {
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('id, content')
    .is('embedding', null)
    .limit(100); // Process in batches
  
  if (error) {
    console.error('Error fetching chunks:', error);
    throw error;
  }
  
  return data;
}

async function updateChunkEmbedding(chunkId, embedding) {
  const { error } = await supabase
    .from('knowledge_chunks')
    .update({ embedding })
    .eq('id', chunkId);
  
  if (error) {
    console.error(`Error updating chunk ${chunkId}:`, error);
    throw error;
  }
}

async function generateAllEmbeddings() {
  console.log('🚀 Starting comprehensive embedding generation...');
  
  try {
    // Get all chunks without embeddings
    const chunks = await getAllChunksWithoutEmbeddings();
    console.log(`📊 Found ${chunks.length} chunks without embeddings`);
    
    if (chunks.length === 0) {
      console.log('✅ All chunks already have embeddings!');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n📝 Processing chunk ${i + 1}/${chunks.length}: ${chunk.id}`);
      
      try {
        // Generate embedding
        console.log('🔄 Generating embedding...');
        const embedding = await generateEmbedding(chunk.content);
        
        // Update in database
        console.log('💾 Updating database...');
        await updateChunkEmbedding(chunk.id, embedding);
        
        successCount++;
        console.log(`✅ Successfully processed chunk ${chunk.id}`);
        
        // Rate limiting - wait between requests
        if (i < chunks.length - 1) {
          console.log('⏳ Waiting 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to process chunk ${chunk.id}:`, error.message);
        
        // Continue with next chunk even if one fails
        continue;
      }
    }
    
    console.log('\n🎉 Embedding generation complete!');
    console.log(`✅ Successfully processed: ${successCount} chunks`);
    console.log(`❌ Failed to process: ${errorCount} chunks`);
    
    // Verify final count
    const remainingChunks = await getAllChunksWithoutEmbeddings();
    console.log(`📊 Remaining chunks without embeddings: ${remainingChunks.length}`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllEmbeddings().catch(console.error);
}

export { generateAllEmbeddings };