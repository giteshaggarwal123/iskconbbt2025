-- Add manual_attendees field to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS manual_attendees text[] DEFAULT '{}';

-- Add comment to explain the field
COMMENT ON COLUMN public.meetings.manual_attendees IS 'Array of manual email addresses for external attendees who are not registered users'; 