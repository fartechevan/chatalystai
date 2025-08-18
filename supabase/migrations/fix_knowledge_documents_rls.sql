-- Check for documents with NULL user_id and enable RLS properly
-- First, let's see if there are any documents with NULL user_id
SELECT COUNT(*) as null_user_id_count FROM knowledge_documents WHERE user_id IS NULL;

-- Enable RLS on knowledge_documents table
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Update the RLS policy to handle NULL user_id values properly
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete their own documents" ON knowledge_documents;

-- Create a new policy that allows deletion only for documents with matching user_id
-- This will prevent deletion of documents with NULL user_id unless user is admin
CREATE POLICY "Users can delete their own documents" ON knowledge_documents
    FOR DELETE
    USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_documents TO authenticated;
GRANT SELECT ON knowledge_documents TO anon;

-- Optional: Update any existing documents with NULL user_id to have a proper user_id
-- This query would need to be run manually with appropriate user_id values
-- UPDATE knowledge_documents SET user_id = 'appropriate-user-uuid' WHERE user_id IS NULL;