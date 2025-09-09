-- Fix foreign key constraint for broadcast_recipients to include ON DELETE CASCADE
-- This resolves the error: "update or delete on table 'broadcasts' violates foreign key constraint 'broadcast_recipients_broadcast_id_fkey'"

-- Drop the existing foreign key constraint
ALTER TABLE "public"."broadcast_recipients" 
DROP CONSTRAINT IF EXISTS "broadcast_recipients_broadcast_id_fkey";

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE "public"."broadcast_recipients" 
ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" 
FOREIGN KEY ("broadcast_id") 
REFERENCES "public"."broadcasts"("id") 
ON DELETE CASCADE;