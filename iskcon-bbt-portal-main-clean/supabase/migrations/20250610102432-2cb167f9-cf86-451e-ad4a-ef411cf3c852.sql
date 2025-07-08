
-- Create database functions for incrementing view and download counts
CREATE OR REPLACE FUNCTION public.increment_view_count(table_name text, attachment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF table_name = 'meeting_attachments' THEN
    UPDATE public.meeting_attachments 
    SET view_count = view_count + 1 
    WHERE id = attachment_id;
  ELSIF table_name = 'poll_attachments' THEN
    UPDATE public.poll_attachments 
    SET view_count = view_count + 1 
    WHERE id = attachment_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_download_count(table_name text, attachment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF table_name = 'meeting_attachments' THEN
    UPDATE public.meeting_attachments 
    SET download_count = download_count + 1 
    WHERE id = attachment_id;
  ELSIF table_name = 'poll_attachments' THEN
    UPDATE public.poll_attachments 
    SET download_count = download_count + 1 
    WHERE id = attachment_id;
  END IF;
END;
$function$;

-- Create table to track member-wise analytics
CREATE TABLE IF NOT EXISTS public.document_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('document', 'meeting_attachment', 'poll_attachment')),
  user_id uuid NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('view', 'download')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  device_type text,
  user_agent text
);

-- Enable RLS
ALTER TABLE public.document_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all analytics" 
  ON public.document_analytics 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create their own analytics" 
  ON public.document_analytics 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
