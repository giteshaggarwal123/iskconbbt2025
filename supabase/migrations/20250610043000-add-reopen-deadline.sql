
-- Add reopen_deadline column to polls table
ALTER TABLE public.polls 
ADD COLUMN reopen_deadline TIMESTAMP WITH TIME ZONE;

-- Create function to reopen poll with time limit
CREATE OR REPLACE FUNCTION public.reopen_poll_with_deadline(poll_id_param uuid, minutes_param integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update poll status back to active with new deadline
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

-- Create function to auto-close reopened polls
CREATE OR REPLACE FUNCTION public.auto_close_reopened_polls()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.polls 
  SET status = 'completed', updated_at = now()
  WHERE status = 'active' 
    AND reopen_deadline IS NOT NULL 
    AND reopen_deadline < now();
$$;
