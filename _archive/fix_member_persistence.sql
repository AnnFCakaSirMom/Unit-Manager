-- ==============================================================================
-- THE SHIELD v2.7: Member Persistence & Name Locking
-- ==============================================================================

-- 1. Tillåt medlemmar att spara sin egen profil (krävs för att 'upsert' ska fungera)
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
CREATE POLICY "Profiles insert" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR get_my_role_weight() >= 4
);

-- 2. Uppdatera regler: Medlemmar kan ändra sin data, men INTE Namn eller Roll
DROP POLICY IF EXISTS "Profiles update hierarchy" ON public.profiles;
CREATE POLICY "Profiles update hierarchy" ON public.profiles
FOR UPDATE USING (
  user_id = auth.uid() OR can_manage_role_weight(role)
) WITH CHECK (
  (
    user_id = auth.uid() 
    AND (
      -- Kontrollera att känsliga fält är oförändrade för vanliga medlemmar
      role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id) AND
      display_name = (SELECT p.display_name FROM public.profiles p WHERE p.id = profiles.id) AND
      discord_nickname = (SELECT p.discord_nickname FROM public.profiles p WHERE p.id = profiles.id)
    )
  ) 
  OR 
  (can_manage_role_weight(role)) -- Admins/Officers kan fortfarande ändra allt
);
