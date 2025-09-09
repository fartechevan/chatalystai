CREATE TABLE whatsapp_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: Add an index for faster lookups on token and phone_number
CREATE INDEX idx_whatsapp_logins_token ON whatsapp_logins (token);
CREATE INDEX idx_whatsapp_logins_phone_number ON whatsapp_logins (phone_number);
