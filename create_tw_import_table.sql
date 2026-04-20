-- ==============================================================================
-- TW ATTENDANCE PERSISTENCE: temporary import list
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tw_import_list (
    discord_name TEXT PRIMARY KEY,
    status TEXT NOT NULL, -- 'Accepted' or 'Maybe'
    matched_player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tw_import_list ENABLE ROW LEVEL SECURITY;

-- Reuse the get_my_role_weight helper (requires secure_hierarchy.sql v2.5 to be already run)
DROP POLICY IF EXISTS "TW Import Officer access" ON public.tw_import_list;

CREATE POLICY "TW Import Officer access" ON public.tw_import_list
FOR ALL USING (get_my_role_weight() >= 3);

-- Verification
-- SELECT * FROM public.tw_import_list;
