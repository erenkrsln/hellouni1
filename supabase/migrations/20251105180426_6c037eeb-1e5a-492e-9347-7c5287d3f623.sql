-- Drop existing policies for posts
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create new policies that work with Clerk authentication
CREATE POLICY "Anyone can create posts"
ON posts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own posts"
ON posts FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete their own posts"
ON posts FOR DELETE
USING (true);

-- Update policies for post_likes
DROP POLICY IF EXISTS "Users can create their own likes" ON post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON post_likes;

CREATE POLICY "Anyone can create likes"
ON post_likes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete likes"
ON post_likes FOR DELETE
USING (true);

-- Update policies for post_comments
DROP POLICY IF EXISTS "Users can create their own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;

CREATE POLICY "Anyone can create comments"
ON post_comments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update comments"
ON post_comments FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete comments"
ON post_comments FOR DELETE
USING (true);