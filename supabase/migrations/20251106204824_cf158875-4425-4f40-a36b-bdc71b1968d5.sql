-- Create user_follows table for follow/unfollow functionality
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view follows
CREATE POLICY "Follows are viewable by everyone"
ON public.user_follows
FOR SELECT
USING (true);

-- Policy: Users can follow others (insert their own follows)
CREATE POLICY "Users can follow others"
ON public.user_follows
FOR INSERT
WITH CHECK (follower_id = auth.uid()::text);

-- Policy: Users can unfollow (delete their own follows)
CREATE POLICY "Users can unfollow"
ON public.user_follows
FOR DELETE
USING (follower_id = auth.uid()::text);

-- Create indexes for better performance
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_user_follows_created_at ON public.user_follows(created_at DESC);