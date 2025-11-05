-- Fix get_or_create_conversation to accept current_user_id as parameter
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  current_user_id TEXT,
  other_user_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Find existing conversation between the two users
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id
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

  -- Create new conversation if none exists
  IF conversation_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_id, current_user_id), (conversation_id, other_user_id);
  END IF;

  RETURN conversation_id;
END;
$$;

-- Fix create_group_conversation to accept current_user_id as parameter
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  current_user_id TEXT,
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

  -- Add current user first
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, current_user_id);

  -- Add other participants
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    IF participant_id != current_user_id THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conversation_id, participant_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN conversation_id;
END;
$$;

-- Fix mark_message_read to accept user_id as parameter
CREATE OR REPLACE FUNCTION public.mark_message_read(
  msg_id UUID,
  user_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO message_reads (message_id, user_id)
  VALUES (msg_id, user_id)
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;