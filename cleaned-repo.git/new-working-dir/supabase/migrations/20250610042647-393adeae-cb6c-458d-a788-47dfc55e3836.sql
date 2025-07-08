
-- Create function to reopen a completed poll
CREATE OR REPLACE FUNCTION public.reopen_poll(poll_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update poll status back to active
  UPDATE public.polls 
  SET status = 'active', updated_at = now()
  WHERE id = poll_id_param 
    AND status = 'completed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found or not in completed status';
  END IF;
END;
$$;

-- Create function to reset votes for a specific user on a poll
CREATE OR REPLACE FUNCTION public.reset_user_poll_votes(poll_id_param uuid, user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all votes for the specific user on this poll
  DELETE FROM public.poll_votes 
  WHERE poll_id = poll_id_param 
    AND user_id = user_id_param;
END;
$$;

-- Create function to reset all votes for a poll
CREATE OR REPLACE FUNCTION public.reset_all_poll_votes(poll_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all votes for this poll
  DELETE FROM public.poll_votes 
  WHERE poll_id = poll_id_param;
END;
$$;
