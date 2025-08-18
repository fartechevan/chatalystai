-- Fix CASCADE DELETE constraint for knowledge_chunks_document_id_fkey
-- This migration drops the existing foreign key constraint and recreates it with CASCADE DELETE

-- First, check the current constraint
SELECT conname, confdeltype 
FROM pg_constraint 
WHERE conname = 'knowledge_chunks_document_id_fkey';

-- Drop the existing foreign key constraint
ALTER TABLE knowledge_chunks 
DROP CONSTRAINT IF EXISTS knowledge_chunks_document_id_fkey;

-- Recreate the foreign key constraint with CASCADE DELETE
ALTER TABLE knowledge_chunks 
ADD CONSTRAINT knowledge_chunks_document_id_fkey 
FOREIGN KEY (document_id) 
REFERENCES knowledge_documents(id) 
ON DELETE CASCADE;

-- Verify the constraint was created with CASCADE DELETE
SELECT conname, confdeltype 
FROM pg_constraint 
WHERE conname = 'knowledge_chunks_document_id_fkey';

-- Grant necessary permissions to ensure proper access
GRANT ALL PRIVILEGES ON knowledge_chunks TO authenticated;
GRANT SELECT, DELETE ON knowledge_chunks TO anon;
GRANT ALL PRIVILEGES ON knowledge_documents TO authenticated;
GRANT SELECT, DELETE ON knowledge_documents TO anon;

-- Test the CASCADE DELETE by showing related records (for verification)
SELECT 
    kd.id as document_id,
    kd.title,
    COUNT(kc.id) as chunk_count
FROM knowledge_documents kd
LEFT JOIN knowledge_chunks kc ON kd.id = kc.document_id
GROUP BY kd.id, kd.title
ORDER BY kd.created_at DESC
LIMIT 5;