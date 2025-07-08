
-- Create the ISKCON Repository folder (if it doesn't exist)
INSERT INTO public.folders (name, parent_folder_id, created_by, is_locked, is_hidden)
SELECT 
  'ISKCON Repository',
  NULL,
  id,
  FALSE,
  FALSE
FROM public.profiles 
WHERE email = 'cs@iskconbureau.in'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Create the Meeting Transcripts subfolder inside ISKCON Repository
INSERT INTO public.folders (name, parent_folder_id, created_by, is_locked, is_hidden)
SELECT 
  'Meeting Transcripts',
  ir.id,
  p.id,
  FALSE,
  FALSE
FROM public.profiles p
CROSS JOIN public.folders ir
WHERE p.email = 'cs@iskconbureau.in'
  AND ir.name = 'ISKCON Repository'
  AND ir.parent_folder_id IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;
