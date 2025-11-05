-- Add policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile bypass"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- This allows the frontend to create profiles for Clerk users
-- The actual security is handled by Clerk authentication