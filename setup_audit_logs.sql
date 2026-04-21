-- 1. Create the audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    actor_id UUID REFERENCES public.profiles(id),
    actor_nickname TEXT,
    action_type TEXT NOT NULL, -- 'SMALL_CHANGE', 'MAJOR_CHANGE'
    action_detail TEXT NOT NULL,
    target_id TEXT,
    target_name TEXT,
    old_data JSONB,
    new_data JSONB,
    is_suspicious BOOLEAN DEFAULT false
);

-- 2. Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Only Admin/Owner can read logs
-- We check the 'role' column in the 'profiles' table for the user making the request
CREATE POLICY "Admins and Owners can view audit logs" 
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('Admin', 'Owner')
  )
);

-- 4. Create Policy: Authenticated users can insert logs (to allow the app to write logs)
CREATE POLICY "Authenticated users can insert audit logs" 
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Function to cleanup old logs (Retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs() 
RETURNS void AS $$
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To automate this, you could setup a cron job in Supabase (pg_cron extension)
-- SELECT cron.schedule('0 0 * * *', 'SELECT public.cleanup_old_audit_logs()');
