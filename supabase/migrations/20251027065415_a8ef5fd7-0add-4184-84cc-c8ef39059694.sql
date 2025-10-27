-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update reps table RLS policies
DROP POLICY IF EXISTS "Authenticated users can create reps" ON public.reps;
DROP POLICY IF EXISTS "Authenticated users can update reps" ON public.reps;
DROP POLICY IF EXISTS "Authenticated users can delete reps" ON public.reps;

CREATE POLICY "Only admins can create reps"
  ON public.reps
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update reps"
  ON public.reps
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete reps"
  ON public.reps
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update daily_rep_assignments RLS policies
DROP POLICY IF EXISTS "System can create assignments" ON public.daily_rep_assignments;

CREATE POLICY "Only service role can create assignments"
  ON public.daily_rep_assignments
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Update focus_areas RLS policies
DROP POLICY IF EXISTS "Authenticated users can create focus areas" ON public.focus_areas;
DROP POLICY IF EXISTS "Authenticated users can update focus areas" ON public.focus_areas;
DROP POLICY IF EXISTS "Authenticated users can delete focus areas" ON public.focus_areas;

CREATE POLICY "Only admins can create focus areas"
  ON public.focus_areas
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update focus areas"
  ON public.focus_areas
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete focus areas"
  ON public.focus_areas
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));