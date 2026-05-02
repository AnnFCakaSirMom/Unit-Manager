-- ============================================================
-- RLS FIX: Profile Save for Members
-- PURPOSE: Fixes "new row violates row-level security policy"
--          by allowing 'upsert' (INSERT) for self and 
--          simplifying the role-change protection.
-- ============================================================

-- 1. Tillåt INSERT för ens egen profil (krävs för .upsert())
-- Tidigare krävdes Gatekeeper+ (weight 4) vilket blockerade medlemmar.
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
CREATE POLICY "Profiles insert" ON public.profiles
FOR INSERT WITH CHECK (
  get_my_role_weight() >= 4 
  OR (user_id = auth.uid()) -- Tillåt att man skapar sin egen rad
);

-- 2. Förbättra UPDATE-policyn
-- Vi ser till att kontrollen av rollen är stabilare.
DROP POLICY IF EXISTS "Profiles update hierarchy" ON public.profiles;
CREATE POLICY "Profiles update hierarchy" ON public.profiles
FOR UPDATE USING (
  user_id = auth.uid() OR can_manage_role_weight(role)
) WITH CHECK (
  (
    user_id = auth.uid() 
    AND (
      -- Om man uppdaterar sig själv får man inte byta sin egen roll.
      -- Vi kollar att den föreslagna rollen matchar den befintliga.
      role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id)
    )
  ) 
  OR 
  (can_manage_role_weight(role)) -- Admins kan fortfarande byta roller på andra
);

-- 3. Verifiering
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'profiles';
