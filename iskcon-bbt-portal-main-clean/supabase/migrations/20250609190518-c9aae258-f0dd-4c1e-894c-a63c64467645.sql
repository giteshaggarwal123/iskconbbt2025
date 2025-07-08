
-- Enable real-time for meeting_attendees table
ALTER TABLE public.meeting_attendees REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_attendees;
