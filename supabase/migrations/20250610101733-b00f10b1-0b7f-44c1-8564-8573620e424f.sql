
-- Add missing view_count and download_count columns to poll_attachments table
ALTER TABLE public.poll_attachments 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;
