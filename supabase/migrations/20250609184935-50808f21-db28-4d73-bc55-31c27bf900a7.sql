
-- Add RSVP response column to meeting_attendees table
ALTER TABLE public.meeting_attendees 
ADD COLUMN IF NOT EXISTS rsvp_response text CHECK (rsvp_response IN ('yes', 'no', 'maybe')) DEFAULT NULL;

-- Add timestamp for when RSVP was submitted
ALTER TABLE public.meeting_attendees 
ADD COLUMN IF NOT EXISTS rsvp_submitted_at timestamp with time zone DEFAULT NULL;

-- Add RSVP enabled flag to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS rsvp_enabled boolean DEFAULT true;

-- Create index for better performance on RSVP queries
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_rsvp 
ON public.meeting_attendees(meeting_id, rsvp_response);
