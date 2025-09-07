ALTER TABLE public.profiles
ADD COLUMN phone_number TEXT;

-- Optional: Add a unique constraint if phone numbers should be unique per profile
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);

-- Optional: Add an index for faster lookups
-- CREATE INDEX idx_profiles_phone_number ON public.profiles (phone_number);
