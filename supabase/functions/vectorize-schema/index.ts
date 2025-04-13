/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js"; // Need this for insert
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts"; 
import { corsHeaders } from "../_shared/cors.ts";
import OpenAI from "https://esm.sh/openai@4.52.7";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// Function to generate embedding
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002", 
      input: text.replaceAll("\n", " "), 
    });
    // Add robust check for embedding data
    if (embeddingResponse?.data?.[0]?.embedding) {
       return embeddingResponse.data[0].embedding;
    }
    console.error("Invalid embedding response structure:", embeddingResponse);
    return null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null; 
  }
}

// Create a database pool
const databaseUrl = Deno.env.get("SUPABASE_DB_URL")!; 
const pool = new Pool(databaseUrl, 3, true);

serve(async (_req) => {
  let client = null; 
  try {
    // Get connection from the pool
    client = await pool.connect();
    console.log("Database connection for introspection successful.");

    // Use Supabase client for inserting embeddings later (needs SERVICE_ROLE_KEY)
     const supabaseAdminClient = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
       { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
     );

    // 1. Introspect Schema (Example for public schema)
    // Fetch table names using the connection pool
    const tablesResult = await client.queryObject<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE' -- Exclude views etc.
    `);

     if (!tablesResult || tablesResult.rows.length === 0) throw new Error("Could not fetch tables from public schema.");
     const tables = tablesResult.rows.map(t => t.table_name);
     console.log(`Found tables: ${tables.join(', ')}`);

    const embeddingsToInsert = [];

    for (const tableName of tables) { 
      if (tableName === 'schema_embeddings') {
         console.log(`Skipping ${tableName} table.`);
         continue; 
      }
      console.log(`Processing table: ${tableName}`);

      // Generate/fetch table description (placeholder)
      const tableDescription = `Table named ${tableName}.`; // TODO: Enhance with comments if possible
      const tableEmbedding = await generateEmbedding(tableDescription);
      if (tableEmbedding) {
        embeddingsToInsert.push({
          schema_name: 'public',
          table_name: tableName,
          column_name: null, 
          description: tableDescription,
          embedding: tableEmbedding,
        });
         console.log(`  Generated embedding for table ${tableName}`);
      } else {
         console.warn(`  Failed to generate embedding for table ${tableName}`);
      }

      // Fetch column names and types for the table using the connection pool
       const columnsResult = await client.queryObject<{ column_name: string; data_type: string }>(
         `SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1`, 
         [tableName] 
       );

       if (!columnsResult || columnsResult.rows.length === 0) {
          console.log(`  No columns found for table ${tableName}.`);
          continue; 
       }
       console.log(`  Found columns: ${columnsResult.rows.map(c=>c.column_name).join(', ')}`);

      for (const column of columnsResult.rows) { 
        const columnName = column.column_name;
        const columnType = column.data_type;
        // Generate/fetch column description (placeholder)
        const columnDescription = `Column named ${columnName} of type ${columnType} in table ${tableName}.`; // TODO: Enhance
        const columnEmbedding = await generateEmbedding(columnDescription);
        if (columnEmbedding) {
          embeddingsToInsert.push({
            schema_name: 'public',
            table_name: tableName,
            column_name: columnName,
            description: columnDescription,
            embedding: columnEmbedding,
          });
           console.log(`    Generated embedding for column ${columnName}`);
        } else {
           console.warn(`    Failed to generate embedding for column ${columnName}`);
        }
      }
    }

    // 3. Store Embeddings (using the Supabase Admin Client)
    if (embeddingsToInsert.length > 0) {
       console.log(`Attempting to delete existing embeddings...`);
       const { error: deleteError } = await supabaseAdminClient
         .from('schema_embeddings')
         .delete()
         .neq('id', '00000000-0000-0000-0000-000000000000'); 
       if (deleteError) {
          console.error("Error deleting existing embeddings:", deleteError);
          throw deleteError; // Throw error if deletion fails
       }
       console.log(`Existing embeddings deleted. Attempting to insert ${embeddingsToInsert.length} new embeddings...`);

      const { error: insertError } = await supabaseAdminClient
        .from("schema_embeddings")
        .insert(embeddingsToInsert as any); // Use 'as any' to bypass potential local type errors
      if (insertError) {
         console.error("Error inserting new embeddings:", insertError);
         throw insertError; // Throw error if insertion fails
      }
       console.log(`Successfully inserted ${embeddingsToInsert.length} embeddings.`);
    } else {
       console.log("No new embeddings generated to insert.");
    }

    return new Response(
      JSON.stringify({ success: true, message: `Generated and stored embeddings for ${embeddingsToInsert.length} schema items.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in vectorize-schema function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
     if (client) {
       try {
         await client.release();
         console.log("Database connection released.");
       } catch (releaseError) {
         console.error("Error releasing database connection:", releaseError);
       }
     }
  }
});
