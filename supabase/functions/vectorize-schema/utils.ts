
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts"; // Use fully qualified URL
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"; // Use fully qualified URL
import OpenAI from "https://esm.sh/openai@4.52.7"; // Use fully qualified URL
import { Database } from "../_shared/database.types.ts";
import { generateEmbedding as sharedGenerateEmbedding } from "../_shared/openaiUtils.ts"; // Use shared embedding function

// Interface for structured schema information
interface SchemaItem {
  schema_name: string;
  table_name: string;
  column_name: string | null; // Null for table-level items
  data_type: string | null; // Added for columns, null for tables
  description: string; // Fetched or generated description
}

// Interface for the data to be inserted into schema_embeddings
interface EmbeddingInsertData {
  schema_name: string;
  table_name: string;
  column_name: string | null;
  data_type: string | null; // Added
  description: string;
  embedding: number[]; // The actual embedding vector
}

/**
 * Introspects the public database schema to fetch tables, columns, and their comments.
 *
 * @param dbPoolClient A connected client from the deno-postgres pool.
 * @returns An array of SchemaItem objects representing tables and columns.
 * @throws Error on database query failure.
 */
export async function introspectSchema(dbPoolClient: PoolClient): Promise<SchemaItem[]> {
  const schemaItems: SchemaItem[] = [];

  try {
    console.log("Introspecting public schema...");
    // Query to get tables and their comments
    const tablesResult = await dbPoolClient.queryObject<{ table_name: string; description: string | null }>(`
      SELECT
          t.table_name,
          pg_catalog.obj_description(c.oid, 'pg_class') as description
      FROM
          information_schema.tables t
      JOIN
          pg_catalog.pg_class c ON c.relname = t.table_name
      JOIN
          pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE
          t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND n.nspname = 'public'; -- Ensure correct namespace join
    `);

    if (!tablesResult) throw new Error("Could not fetch tables from public schema.");
    console.log(`Found ${tablesResult.rows.length} tables.`);

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      // Skip the embeddings table itself
      if (tableName === 'schema_embeddings') {
         console.log(`Skipping ${tableName} table.`);
         continue;
      }

      const tableDescription = table.description || `Table named ${tableName}.`; // Use comment or fallback
      schemaItems.push({
        schema_name: 'public',
        table_name: tableName,
        column_name: null,
        data_type: null, // For table-level items
        description: tableDescription,
      });
      console.log(`  Processing table: ${tableName} (Description: ${tableDescription.substring(0, 50)}...)`);

      // Query to get columns and their comments for the current table
      const columnsResult = await dbPoolClient.queryObject<{ column_name: string; data_type: string; description: string | null }>(`
        SELECT
            a.attname as column_name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
            pg_catalog.col_description(c.oid, a.attnum) as description
        FROM
            pg_catalog.pg_attribute a
        JOIN
            pg_catalog.pg_class c ON a.attrelid = c.oid
        JOIN
            pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE
            c.relname = $1
            AND n.nspname = 'public'
            AND a.attnum > 0
            AND NOT a.attisdropped
        ORDER BY
            a.attnum;
      `, [tableName]);

      if (!columnsResult) {
          console.warn(`  Could not fetch columns for table ${tableName}.`);
          continue;
      }
      console.log(`    Found ${columnsResult.rows.length} columns.`);

      for (const column of columnsResult.rows) {
        const columnName = column.column_name;
        const columnType = column.data_type;
        const columnDescription = column.description || `Column named ${columnName} of type ${columnType} in table ${tableName}.`; // Use comment or fallback
        schemaItems.push({
          schema_name: 'public',
          table_name: tableName,
          column_name: columnName,
          data_type: columnType, // Assign fetched data_type
          description: columnDescription,
        });
         console.log(`      Column: ${columnName} (Type: ${columnType}, Description: ${columnDescription.substring(0, 50)}...)`);
      }
    }
    console.log("Schema introspection complete.");
    return schemaItems;

  } catch (error) {
    console.error("Error during schema introspection:", error);
    throw new Error(`Schema introspection failed: ${error.message}`);
  }
}

/**
 * Generates embeddings for schema items (tables and columns).
 *
 * @param openaiClient Initialized OpenAI client.
 * @param schemaItems Array of schema items with descriptions.
 * @returns Array of data objects ready for insertion into schema_embeddings table.
 */
export async function generateSchemaEmbeddings(
  openaiClient: OpenAI,
  schemaItems: SchemaItem[]
): Promise<EmbeddingInsertData[]> {
  const embeddingsToInsert: EmbeddingInsertData[] = [];
  console.log(`Generating embeddings for ${schemaItems.length} schema items...`);

  for (const item of schemaItems) {
    // Use the description fetched/generated during introspection
    const embedding = await sharedGenerateEmbedding(item.description, openaiClient);
    if (embedding) {
      embeddingsToInsert.push({
        schema_name: item.schema_name,
        table_name: item.table_name,
        column_name: item.column_name,
        data_type: item.data_type, // Pass data_type
        description: item.description,
        embedding: embedding,
      });
       console.log(`  Generated embedding for: ${item.table_name}${item.column_name ? '.' + item.column_name : ''} (Type: ${item.data_type})`);
    } else {
       console.warn(`  Failed to generate embedding for: ${item.table_name}${item.column_name ? '.' + item.column_name : ''}`);
    }
    // Optional: Add a small delay to avoid hitting rate limits if processing many items
    // await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`Generated ${embeddingsToInsert.length} embeddings.`);
  return embeddingsToInsert;
}

/**
 * Deletes existing embeddings and inserts new ones into the schema_embeddings table.
 *
 * @param supabaseClient Supabase client instance (Service Role required).
 * @param embeddings Array of embedding data to insert.
 * @throws Error on database delete or insert failure.
 */
export async function storeEmbeddingsDb(
  supabaseClient: SupabaseClient<Database>,
  embeddings: EmbeddingInsertData[]
): Promise<void> {
  if (embeddings.length === 0) {
    console.log("No new embeddings generated to store.");
    return;
  }

  try {
    // 1. Delete existing embeddings (excluding potential placeholder row)
    console.log(`Attempting to delete existing embeddings...`);
    const { error: deleteError } = await supabaseClient
      .from('schema_embeddings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Avoid deleting potential placeholder

    if (deleteError) {
      console.error("Error deleting existing embeddings:", deleteError);
      throw new Error(`Failed to delete existing embeddings: ${deleteError.message}`);
    }
    console.log(`Existing embeddings deleted. Attempting to insert ${embeddings.length} new embeddings...`);

    // 2. Insert new embeddings
    // Need to cast embedding array to string format expected by pgvector
    const insertData = embeddings.map(e => ({
        schema_name: e.schema_name,
        table_name: e.table_name,
        column_name: e.column_name,
        data_type: e.data_type, // Include data_type
        description: e.description,
        embedding: JSON.stringify(e.embedding) // Cast to string '[1,2,3]'
    }));

    // Define the type expected by the 'schema_embeddings' table insert
    type SchemaEmbeddingInsert = Database["public"]["Tables"]["schema_embeddings"]["Insert"];

    const { error: insertError } = await supabaseClient
      .from("schema_embeddings")
      .insert(insertData as SchemaEmbeddingInsert[]); // Use specific type assertion

    if (insertError) {
      console.error("Error inserting new embeddings:", insertError);
      throw new Error(`Failed to insert new embeddings: ${insertError.message}`);
    }
    console.log(`Successfully inserted ${embeddings.length} embeddings.`);

  } catch (error) {
     console.error("Error storing embeddings in DB:", error);
     throw error; // Re-throw the error to be caught by the main handler
  }
}
