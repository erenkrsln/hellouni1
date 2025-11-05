-- Add name and type to conversations
ALTER TABLE public.conversations 
ADD COLUMN name TEXT,
ADD COLUMN is_group BOOLEAN DEFAULT false;

-- Create message_reads table for read receipts
CREATE TABLE public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- RLS for message_reads
CREATE POLICY "Users can view read receipts in their conversations"
ON public.message_reads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    INNER JOIN public.conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reads.message_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.message_reads FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.messages m
    INNER JOIN public.conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reads.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Function to create a group conversation
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  group_name TEXT,
  participant_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
  participant_id UUID;
BEGIN
  -- Create conversation
  INSERT INTO conversations (name, is_group)
  VALUES (group_name, true)
  RETURNING id INTO conversation_id;

  -- Add creator
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, auth.uid());

  -- Add all participants
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    IF participant_id != auth.uid() THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conversation_id, participant_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN conversation_id;
END;
$$;

-- Function to mark message as read
CREATE OR REPLACE FUNCTION public.mark_message_read(message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO message_reads (message_id, user_id)
  VALUES (message_id, auth.uid())
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;

-- Enable realtime for message_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;