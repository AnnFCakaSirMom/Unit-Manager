-- Lägg till order_index i group_members för att bevara sorteringen
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Kommentar: Vi behöver inte uppdatera befintlig data manuellt, 
-- appen kommer att skriva över det nästa gång du sparar en grupp.
