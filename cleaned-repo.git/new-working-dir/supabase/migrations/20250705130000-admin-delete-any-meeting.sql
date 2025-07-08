-- Allow any admin or super_admin to delete any meeting
CREATE OR REPLACE POLICY "Admin or super_admin can delete any meeting" ON public.meetings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  ); 