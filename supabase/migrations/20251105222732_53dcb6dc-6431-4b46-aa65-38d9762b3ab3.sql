-- Enable realtime for chat tables safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads';
  END IF;
END
$$;

-- Ensure full row data for updates (good practice even if we mostly use INSERT)
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reads REPLICA IDENTITY FULL;