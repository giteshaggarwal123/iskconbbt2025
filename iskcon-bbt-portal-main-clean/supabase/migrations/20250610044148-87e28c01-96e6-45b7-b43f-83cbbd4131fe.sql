-- Add reopen_deadline column to polls table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'polls' 
        AND column_name = 'reopen_deadline'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.polls ADD COLUMN reopen_deadline TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create or replace function to auto-close reopened polls
CREATE OR REPLACE FUNCTION public.auto_close_reopened_polls()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.polls 
  SET status = 'completed', updated_at = now()
  WHERE status = 'active' 
    AND (
      (reopen_deadline IS NOT NULL AND reopen_deadline < now())
      OR (reopen_deadline IS NULL AND deadline < now())
    );
$$;

-- Create or replace function to reopen poll with time limit
CREATE OR REPLACE FUNCTION public.reopen_poll_with_deadline(poll_id_param uuid, minutes_param integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate new deadline
  UPDATE public.polls 
  SET 
    status = 'active', 
    updated_at = now(),
    reopen_deadline = now() + (minutes_param || ' minutes')::interval
  WHERE id = poll_id_param 
    AND status = 'completed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found or not in completed status';
  END IF;
END;
$$;
