import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env file
function loadEnvFile(envPath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(envPath, 'utf-8')
    const env: Record<string, string> = {}
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=').replace(/^["']|["']$/g, '')
        }
      }
    }
    
    return env
  } catch (error) {
    console.error('Error loading .env file:', error)
    return {}
  }
}

// Load environment variables
dotenv.config()
const envVars = loadEnvFile('.env')
const SUPABASE_URL = envVars.VITE_SUPABASE_URL || envVars.COOLIFY_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.COOLIFY_SUPABASE_URL || 'https://yrnbbkljrdwoyqjpswtv.supabase.co'
const OPENAI_API_KEY = envVars.OPENAI_API_KEY || process.env.OPENAI_API_KEY

// Try multiple possible service role key names
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SERVICE_ROLE_KEY

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required environment variables:')
  console.error('SUPABASE_URL:', !!SUPABASE_URL)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY)
  console.error('OPENAI_API_KEY:', !!OPENAI_API_KEY)
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Tried the following environment variable names:')
    console.error('- SUPABASE_SERVICE_ROLE_KEY')
    console.error('- SUPABASE_SERVICE_KEY')
    console.error('- SERVICE_ROLE_KEY')
  }
  
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

async function generateEmbeddingsForChunks() {
  console.log('Starting embedding generation for knowledge chunks...')
  
  // Get all chunks without embeddings for the Chattalyst agent documents
  const { data: chunks, error } = await supabase
    .from('knowledge_chunks')
    .select('id, content, document_id')
    .in('document_id', [
      'ce7c1d85-a798-4743-abdb-1ca36ec7ab05', // Merged document_v11_pruned
      'ca8cb28f-4243-4b55-9399-1678c3b6e99d', // Chattalyst knowledge
      '2c735d28-d136-4cff-9254-d2e7334bc9cc'  // Chattalyst OOC
    ])
    .is('embedding', null)

  if (error) {
    console.error('Error fetching chunks:', error)
    return
  }

  if (!chunks || chunks.length === 0) {
    console.log('No chunks found without embeddings')
    return
  }

  console.log(`Found ${chunks.length} chunks without embeddings`)

  let processed = 0
  const batchSize = 5 // Process in small batches to avoid rate limits

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`)
    
    const promises = batch.map(async (chunk) => {
      try {
        console.log(`Generating embedding for chunk ${chunk.id}...`)
        const embedding = await generateEmbedding(chunk.content)
        
        const { error: updateError } = await supabase
          .from('knowledge_chunks')
          .update({ embedding })
          .eq('id', chunk.id)
        
        if (updateError) {
          console.error(`Error updating chunk ${chunk.id}:`, updateError)
          return false
        }
        
        console.log(`✓ Updated chunk ${chunk.id}`)
        return true
      } catch (error) {
        console.error(`Error processing chunk ${chunk.id}:`, error)
        return false
      }
    })
    
    const results = await Promise.all(promises)
    processed += results.filter(Boolean).length
    
    // Add a small delay between batches to respect rate limits
    if (i + batchSize < chunks.length) {
      console.log('Waiting 2 seconds before next batch...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log(`\n✅ Embedding generation complete!`)
  console.log(`Successfully processed: ${processed}/${chunks.length} chunks`)
  
  // Verify the results
  const { data: updatedChunks, error: verifyError } = await supabase
    .from('knowledge_chunks')
    .select('id')
    .in('document_id', [
      'ce7c1d85-a798-4743-abdb-1ca36ec7ab05',
      'ca8cb28f-4243-4b55-9399-1678c3b6e99d',
      '2c735d28-d136-4cff-9254-d2e7334bc9cc'
    ])
    .not('embedding', 'is', null)
  
  if (!verifyError && updatedChunks) {
    console.log(`\n📊 Total chunks with embeddings: ${updatedChunks.length}`)
  }
}

// Check if this is the main module for Node.js
if (require.main === module) {
  generateEmbeddingsForChunks().catch(console.error)
}