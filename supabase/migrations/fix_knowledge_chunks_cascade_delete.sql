-- Check and fix CASCADE DELETE issue for knowledge_chunks
-- First, let's check the current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('knowledge_chunks', 'knowledge_documents');

-- Check existing policies on knowledge_chunks
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'knowledge_chunks';

-- Disable RLS on knowledge_chunks to allow CASCADE DELETE to work properly
ALTER TABLE public.knowledge_chunks DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might interfere
DROP POLICY IF EXISTS "Allow authenticated users to delete chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Allow authenticated users to insert chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Allow authenticated users to read chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Allow authenticated users to update chunks" ON public.knowledge_chunks;

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

-- Grant permissions to authenticated users for direct table access
GRANT ALL PRIVILEGES ON public.knowledge_chunks TO authenticated;
GRANT ALL PRIVILEGES ON public.knowledge_documents TO authenticated;

-- Also grant to anon role for any unauthenticated operations
GRANT SELECT, DELETE ON public.knowledge_chunks TO anon;
GRANT SELECT, DELETE ON public.knowledge_documents TO anon;