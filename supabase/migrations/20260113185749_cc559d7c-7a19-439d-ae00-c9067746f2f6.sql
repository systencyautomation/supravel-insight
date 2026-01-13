-- Drop existing SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that requires authentication AND only allows viewing own profile
CREATE POLICY "Authenticated users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = id);