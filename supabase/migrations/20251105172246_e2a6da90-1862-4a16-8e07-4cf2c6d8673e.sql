-- Update all functions to work with TEXT user_ids
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND conversation_participants.user_id = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;

  IF conversation_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_id, auth.uid()::text), (conversation_id, other_user_id);
  END IF;

  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_conversation(
  group_name TEXT,
  participant_ids TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
  participant_id TEXT;
BEGIN
  INSERT INTO conversations (name, is_group)
  VALUES (group_name, true)
  RETURNING id INTO conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, auth.uid()::text);

  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    IF participant_id != auth.uid()::text THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conversation_id, participant_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_message_read(message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO message_reads (message_id, user_id)
  VALUES (message_id, auth.uid()::text)
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;