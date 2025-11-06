-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- User who receives the notification
  actor_id TEXT NOT NULL, -- User who triggered the notification
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
  post_id UUID, -- Only for like and comment notifications
  comment_id UUID, -- Only for comment notifications
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid()::text);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Function to create notification for post likes
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id TEXT;
BEGIN
  -- Get the post author
  SELECT user_id INTO post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  -- Don't create notification if user likes their own post
  IF post_author_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id)
    VALUES (post_author_id, NEW.user_id, 'like', NEW.post_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Function to create notification for comments
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id TEXT;
BEGIN
  -- Get the post author
  SELECT user_id INTO post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  -- Don't create notification if user comments on their own post
  IF post_author_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (post_author_id, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Function to create notification for follows
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');

  RETURN NEW;
END;
$$;

-- Trigger for like notifications
CREATE TRIGGER trigger_like_notification
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.create_like_notification();

-- Trigger for comment notifications
CREATE TRIGGER trigger_comment_notification
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();

-- Trigger for follow notifications
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON public.user_follows
FOR EACH ROW
EXECUTE FUNCTION public.create_follow_notification();