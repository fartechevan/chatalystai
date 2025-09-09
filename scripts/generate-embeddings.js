import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yrnbbkljrdwoyqjpswtv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required environment variables:');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  console.error('OPENAI_API_KEY:', !!OPENAI_API_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

async function generateEmbeddingsForChunks() {
  console.log('Starting embedding generation for knowledge chunks...');
  
  // Get all chunks without embeddings for the Chattalyst agent documents
  const { data: chunks, error } = await supabase
    .from('knowledge_chunks')
    .select('id, content, document_id')
    .in('document_id', [
      'ce7c1d85-a798-4743-abdb-1ca36ec7ab05', // Merged document_v11_pruned
      'ca8cb28f-4243-4b55-9399-1678c3b6e99d', // Chattalyst knowledge
      '2c735d28-d136-4cff-9254-d2e7334bc9cc'  // Chattalyst OOC
    ])
    .is('embedding', null);

  if (error) {
    console.error('Error fetching chunks:', error);
    return;
  }

  if (!chunks || chunks.length === 0) {
    console.log('No chunks found without embeddings');
    return;
  }

  console.log(`Found ${chunks.length} chunks without embeddings`);

  let processed = 0;
  const batchSize = 3; // Process in small batches to avoid rate limits

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`);
    
    for (const chunk of batch) {
      try {
        console.log(`Generating embedding for chunk ${chunk.id}...`);
        const embedding = await generateEmbedding(chunk.content);
        
        const { error: updateError } = await supabase
          .from('knowledge_chunks')
          .update({ embedding })
          .eq('id', chunk.id);
        
        if (updateError) {
          console.error(`Error updating chunk ${chunk.id}:`, updateError);
        } else {
          console.log(`✓ Updated chunk ${chunk.id}`);
          processed++;
        }
      } catch (error) {
        console.error(`Error processing chunk ${chunk.id}:`, error.message);
      }
      
      // Small delay between chunks to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Add a delay between batches
    if (i + batchSize < chunks.length) {
      console.log('Waiting 3 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\n✅ Embedding generation complete!`);
  console.log(`Successfully processed: ${processed}/${chunks.length} chunks`);
  
  // Verify the results
  const { data: updatedChunks, error: verifyError } = await supabase
    .from('knowledge_chunks')
    .select('id')
    .in('document_id', [
      'ce7c1d85-a798-4743-abdb-1ca36ec7ab05',
      'ca8cb28f-4243-4b55-9399-1678c3b6e99d',
      '2c735d28-d136-4cff-9254-d2e7334bc9cc'
    ])
    .not('embedding', 'is', null);
  
  if (!verifyError && updatedChunks) {
    console.log(`\n📊 Total chunks with embeddings: ${updatedChunks.length}`);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  generateEmbeddingsForChunks().catch(console.error);
}

export { generateEmbeddingsForChunks };