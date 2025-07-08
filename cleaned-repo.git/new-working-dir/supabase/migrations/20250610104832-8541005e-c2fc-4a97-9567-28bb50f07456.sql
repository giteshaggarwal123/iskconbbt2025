
-- Add foreign key constraint to document_analytics table to link to profiles
ALTER TABLE public.document_analytics 
ADD CONSTRAINT fk_document_analytics_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to document_views table to link to profiles  
ALTER TABLE public.document_views 
ADD CONSTRAINT fk_document_views_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
