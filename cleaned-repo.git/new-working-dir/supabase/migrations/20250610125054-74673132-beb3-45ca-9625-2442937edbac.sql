
-- First, create the helper functions that the policies need
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Special case for super admin email
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND email = 'cs@iskconbureau.in'
  ) THEN
    RETURN 'super_admin'::app_role;
  END IF;
  
  -- Get role from user_roles table
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Default to member if no role found
  RETURN COALESCE(user_role, 'member'::app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check if user is admin or super admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean AS $$
DECLARE
  user_role app_role;
BEGIN
  user_role := public.get_current_user_role();
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_current_user_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now apply the corrected RLS policies
-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Create new policies for profiles table
-- View policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin_or_super_admin());

-- Update policies
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- Insert policies
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.is_admin_or_super_admin());

-- Delete policy (only super admins, and not the protected account)
CREATE POLICY "Super admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  public.is_super_admin_user() AND 
  id != auth.uid() AND 
  email != 'cs@iskconbureau.in'
);

-- User roles table policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Protect super admin role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage member roles" ON public.user_roles;

-- Create new policies for user_roles table
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin_or_super_admin());

CREATE POLICY "Super admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_super_admin_user())
WITH CHECK (public.is_super_admin_user());
