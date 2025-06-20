-- Create the contacts table
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id),
    phone_number TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    metadata JSONB DEFAULT '{}',
    company_name TEXT,
    company_address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments to the table and columns
COMMENT ON TABLE public.contacts IS 'Stores contact information, similar to customers but potentially for a broader use case.';
COMMENT ON COLUMN public.contacts.id IS 'Unique identifier for the contact.';
COMMENT ON COLUMN public.contacts.team_id IS 'Foreign key referencing the team this contact belongs to.';
COMMENT ON COLUMN public.contacts.phone_number IS 'Primary phone number for the contact.';
COMMENT ON COLUMN public.contacts.name IS 'Full name of the contact.';
COMMENT ON COLUMN public.contacts.email IS 'Email address of the contact.';
COMMENT ON COLUMN public.contacts.metadata IS 'JSONB field for storing additional custom data about the contact.';
COMMENT ON COLUMN public.contacts.company_name IS 'Name of the company the contact is associated with.';
COMMENT ON COLUMN public.contacts.company_address IS 'Address of the company the contact is associated with.';
COMMENT ON COLUMN public.contacts.created_at IS 'Timestamp of when the contact was created.';
COMMENT ON COLUMN public.contacts.updated_at IS 'Timestamp of when the contact was last updated.';

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts table
CREATE POLICY "Allow team members to read contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = contacts.team_id
    AND tu.user_id = auth.uid()
  )
);

CREATE POLICY "Allow team members to insert contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = contacts.team_id
    AND tu.user_id = auth.uid()
  )
);

CREATE POLICY "Allow team owners or admins to update contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = contacts.team_id
    AND tu.user_id = auth.uid()
    AND (tu.role = 'owner' OR tu.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = contacts.team_id
    AND tu.user_id = auth.uid()
    AND (tu.role = 'owner' OR tu.role = 'admin')
  )
);

CREATE POLICY "Allow team owners to delete contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = contacts.team_id
    AND tu.user_id = auth.uid()
    AND tu.role = 'owner'
  )
);

-- Trigger to update "updated_at" timestamp
CREATE OR REPLACE FUNCTION public.update_contacts_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now()); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_modtime
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_contacts_updated_at_column();
