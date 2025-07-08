-- Assign super_admin role to the user atd@iskconbureau.in
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM public.profiles 
WHERE email = 'atd@iskconbureau.in'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = profiles.id
);

-- If the profile doesn't exist, create it first
INSERT INTO public.profiles (id, email, first_name, last_name)
SELECT '6ab3186f-7dae-46b3-8dd5-5256c560658e'::uuid, 'atd@iskconbureau.in', 'System', 'Administrator'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'atd@iskconbureau.in'
);

-- Then assign the role
INSERT INTO public.user_roles (user_id, role)
SELECT '6ab3186f-7dae-46b3-8dd5-5256c560658e'::uuid, 'super_admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '6ab3186f-7dae-46b3-8dd5-5256c560658e'::uuid
);
