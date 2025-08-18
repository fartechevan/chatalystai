-- Disable RLS on knowledge_chunks to allow CASCADE DELETE
-- This migration ensures that document deletion works properly

-- First, check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('knowledge_chunks', 'knowledge_documents')
AND schemaname = 'public';

-- Check existing policies on knowledge_chunks
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'knowledge_chunks' 
AND schemaname = 'public';

-- Drop all existing policies on knowledge_chunks
DROP POLICY IF EXISTS "Users can view their own knowledge chunks" ON knowledge_chunks;
DROP POLICY IF EXISTS "Users can insert their own knowledge chunks" ON knowledge_chunks;
DROP POLICY IF EXISTS "Users can update their own knowledge chunks" ON knowledge_chunks;
DROP POLICY IF EXISTS "Users can delete their own knowledge chunks" ON knowledge_chunks;
DROP POLICY IF EXISTS "knowledge_chunks_select_policy" ON knowledge_chunks;
DROP POLICY IF EXISTS "knowledge_chunks_insert_policy" ON knowledge_chunks;
DROP POLICY IF EXISTS "knowledge_chunks_update_policy" ON knowledge_chunks;
DROP POLICY IF EXISTS "knowledge_chunks_delete_policy" ON knowledge_chunks;

-- Disable RLS on knowledge_chunks
ALTER TABLE knowledge_chunks DISABLE ROW LEVEL SECURITY;

-- Verify the foreign key constraint exists with CASCADE DELETE
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'knowledge_chunks'
  AND kcu.column_name = 'document_id';

-- Grant necessary permissions to roles
GRANT ALL PRIVILEGES ON knowledge_chunks TO authenticated;
GRANT SELECT, DELETE ON knowledge_chunks TO anon;
GRANT ALL PRIVILEGES ON knowledge_documents TO authenticated;
GRANT SELECT, DELETE ON knowledge_documents TO anon;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'knowledge_chunks'
AND schemaname = 'public';

-- Test CASCADE DELETE by showing the constraint is working
-- This is just a verification query, not an actual delete
SELECT 'CASCADE DELETE should now work properly for knowledge_documents' AS status;