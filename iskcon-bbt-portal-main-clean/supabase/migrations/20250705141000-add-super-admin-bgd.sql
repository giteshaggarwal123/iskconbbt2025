-- Assign super_admin role to the user bgd@iskconbureau.in
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM public.profiles 
WHERE email = 'bgd@iskconbureau.in'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = profiles.id AND role = 'super_admin'
);

-- If the profile doesn't exist, create it first
INSERT INTO public.profiles (id, email, first_name, last_name)
SELECT gen_random_uuid(), 'bgd@iskconbureau.in', 'Basu', 'Gopal'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'bgd@iskconbureau.in'
);

-- Then assign the role (again, in case the profile was just created)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM public.profiles 
WHERE email = 'bgd@iskconbureau.in'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = profiles.id AND role = 'super_admin'
); 