-- Enable Row Level Security on meetings table
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Allow meeting creator or admin/super_admin to delete meetings
CREATE POLICY "Meeting creator or admin can delete" ON public.meetings
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  ); 