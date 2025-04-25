/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "std/http/server.ts"; // Use import map alias
import { Pool, PoolClient } from "postgres"; // Use import map alias, import PoolClient
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts"; // Use Service Role for insert
import { openai } from "../_shared/openaiUtils.ts"; // Use shared OpenAI client
import {
  introspectSchema,
  generateSchemaEmbeddings,
  storeEmbeddingsDb,
} from "./utils.ts";

// Create a database pool (outside handler for reuse if function is invoked multiple times)
// Ensure SUPABASE_DB_URL includes the password and is configured correctly.
const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
if (!databaseUrl) {
    throw new Error("Missing environment variable: SUPABASE_DB_URL");
}
const pool = new Pool(databaseUrl, 3, true); // 3 connections, lazy connect

serve(async (_req) => { // Request object is not used
  // Handle CORS preflight requests (though likely not needed if triggered internally)
  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let dbPoolClient: PoolClient | null = null; // Explicitly type the client from the pool

  try {
    // 1. Check OpenAI client availability
    if (!openai) {
      throw new Error("OpenAI client is not initialized (API key likely missing).");
    }

    // 2. Get DB Connection from Pool for Introspection
    console.log("Connecting to database pool for introspection...");
    dbPoolClient = await pool.connect();
    console.log("Database connection successful.");

    // 3. Create Supabase Admin Client for Storing Embeddings
    const supabaseAdminClient = createSupabaseServiceRoleClient();

    // 4. Introspect Schema
    const schemaItems = await introspectSchema(dbPoolClient);

    // 5. Generate Embeddings
    const embeddingsToInsert = await generateSchemaEmbeddings(openai, schemaItems);

    // 6. Store Embeddings in DB
    await storeEmbeddingsDb(supabaseAdminClient, embeddingsToInsert);

    // 7. Return Success Response
    return new Response(
      JSON.stringify({ success: true, message: `Generated and stored embeddings for ${embeddingsToInsert.length} schema items.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in vectorize-schema handler:", error.message);
    // Determine status code based on error type if possible
    let status = 500;
     if (error.message === "OpenAI client is not initialized (API key likely missing).") status = 503;
     if (error.message.startsWith("Schema introspection failed")) status = 500; // Or more specific DB error code
     if (error.message.startsWith("Failed to delete") || error.message.startsWith("Failed to insert")) status = 500; // DB write error

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    // Ensure the database connection is released
    if (dbPoolClient) {
      try {
        await dbPoolClient.release();
        console.log("Database connection released.");
      } catch (releaseError) {
        console.error("Error releasing database connection:", releaseError);
      }
    }
  }
});
