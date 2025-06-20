ALTER TABLE "public"."broadcasts"
ADD COLUMN IF NOT EXISTS "image_url" TEXT NULL,
ADD COLUMN IF NOT EXISTS "status" TEXT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS "recipient_count" INTEGER NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "integration_config_id" UUID NULL,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add foreign key constraint for integration_config_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'broadcasts_integration_config_id_fkey'
    ) THEN
        ALTER TABLE "public"."broadcasts"
        ADD CONSTRAINT "broadcasts_integration_config_id_fkey"
        FOREIGN KEY ("integration_config_id")
        REFERENCES "public"."integrations_config"("id")
        ON DELETE SET NULL;
    END IF;
END
$$;

-- Update existing trigger or create new one for updated_at
CREATE OR REPLACE TRIGGER set_broadcasts_updated_at
BEFORE UPDATE ON "public"."broadcasts"
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

COMMENT ON COLUMN "public"."broadcasts"."image_url" IS 'URL of the image attached to the broadcast.';
COMMENT ON COLUMN "public"."broadcasts"."status" IS 'Status of the broadcast (e.g., draft, scheduled, sent, failed).';
COMMENT ON COLUMN "public"."broadcasts"."scheduled_at" IS 'Timestamp when the broadcast is scheduled to be sent.';
COMMENT ON COLUMN "public"."broadcasts"."recipient_count" IS 'Estimated or actual number of recipients for the broadcast.';
COMMENT ON COLUMN "public"."broadcasts"."integration_config_id" IS 'FK to integrations_config table, specifying which configured instance to send from.';
COMMENT ON COLUMN "public"."broadcasts"."updated_at" IS 'Timestamp of the last update to the broadcast record.';

-- Also add image_url to message_logs table as it was added in send-message-handler
ALTER TABLE "public"."message_logs"
ADD COLUMN IF NOT EXISTS "media_url" TEXT NULL;

COMMENT ON COLUMN "public"."message_logs"."media_url" IS 'URL of the media sent, if applicable (e.g., for images, videos).';
