
-- First, let's see what policies already exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'meeting_attendees';

-- Drop and recreate the policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view meeting attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Users can create their own RSVP responses" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Users can update their own RSVP responses" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Users can delete their own RSVP responses" ON public.meeting_attendees;

-- Create the correct policies
CREATE POLICY "Users can view meeting attendees" 
ON public.meeting_attendees 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own RSVP responses" 
ON public.meeting_attendees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVP responses" 
ON public.meeting_attendees 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RSVP responses" 
ON public.meeting_attendees 
FOR DELETE 
USING (auth.uid() = user_id);
