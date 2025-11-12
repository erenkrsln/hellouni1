-- Update profiles table for username-based authentication
-- Make username and email required and unique
ALTER TABLE public.profiles 
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT profiles_username_unique UNIQUE (username),
  ADD CONSTRAINT profiles_email_unique UNIQUE (email);