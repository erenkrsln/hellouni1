-- Fix profiles policies to work with Clerk
-- Since we use Clerk, we cannot use auth.uid() to restrict access

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view others basic info" ON profiles;

-- Allow viewing all profiles (names and avatars are not sensitive)
-- Email addresses are still visible but this is needed for the app to function
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);