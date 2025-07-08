-- Add a column to track locked folders
ALTER TABLE public.folders 
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;

-- Create the ISKCON CONFIDENTIAL folder as a locked folder
INSERT INTO public.folders (name, parent_folder_id, created_by, is_locked, is_hidden)
SELECT 
  'ISKCON CONFIDENTIAL',
  NULL,
  id,
  TRUE,
  FALSE
FROM public.profiles 
WHERE email = 'atd@iskconbureau.in'
LIMIT 1;

-- Add RLS policies for locked folders
CREATE POLICY "Only admins can view locked folders" 
ON public.folders 
FOR SELECT 
USING (
  NOT is_locked OR 
  public.is_admin_or_super_admin()
);

CREATE POLICY "Only admins can create locked folders" 
ON public.folders 
FOR INSERT 
WITH CHECK (
  NOT is_locked OR 
  public.is_admin_or_super_admin()
);

CREATE POLICY "Only admins can update locked folders" 
ON public.folders 
FOR UPDATE 
USING (
  NOT is_locked OR 
  public.is_admin_or_super_admin()
)
WITH CHECK (
  NOT is_locked OR 
  public.is_admin_or_super_admin()
);

CREATE POLICY "Only admins can delete locked folders" 
ON public.folders 
FOR DELETE 
USING (
  NOT is_locked OR 
  public.is_admin_or_super_admin()
);

-- Add RLS policies for documents in locked folders
CREATE POLICY "Only admins can view documents in locked folders" 
ON public.documents 
FOR SELECT 
USING (
  folder_id IS NULL OR
  NOT EXISTS (
    SELECT 1 FROM public.folders 
    WHERE id = folder_id AND is_locked = TRUE
  ) OR
  public.is_admin_or_super_admin()
);

CREATE POLICY "Only admins can create documents in locked folders" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  folder_id IS NULL OR
  NOT EXISTS (
    SELECT 1 FROM public.folders 
    WHERE id = folder_id AND is_locked = TRUE
  ) OR
  public.is_admin_or_super_admin()
);

CREATE POLICY "Only admins can update documents in locked folders" 
ON public.documents 
FOR UPDATE 
USING (
  folder_id IS NULL OR
  NOT EXISTS (
    SELECT 1 FROM public.folders 
    WHERE id = folder_id AND is_locked = TRUE
  ) OR
  public.is_admin_or_super_admin()
)
WITH CHECK (
  folder_id IS NULL OR
  NOT EXISTS (
    SELECT 1 FROM public.folders 
    WHERE id = folder_id AND is_locked = TRUE
  ) OR
  public.is_admin_or_super_admin()
);

CREATE POLICY "Only admins can delete documents in locked folders" 
ON public.documents 
FOR DELETE 
USING (
  folder_id IS NULL OR
  NOT EXISTS (
    SELECT 1 FROM public.folders 
    WHERE id = folder_id AND is_locked = TRUE
  ) OR
  public.is_admin_or_super_admin()
);
