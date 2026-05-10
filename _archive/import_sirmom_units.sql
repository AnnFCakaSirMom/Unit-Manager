-- ============================================================
-- IMPORT: SirMom Units → profile_units
-- FÖRBEREDELSE: Kör detta först för att hitta ditt profile.id
-- ============================================================
--   SELECT id FROM profiles WHERE display_name = 'SirMom';
--   Kopiera det ID:t och ersätt 'SIRMOM_PROFILE_ID' nedan.
-- ============================================================

DO $$
DECLARE
    v_profile_id UUID := 'c87015b4-c06f-4ef8-8948-ca4d46d8e702'; -- << BYTA UT DETTA

    -- units (is_owned = true)
    v_units TEXT[] := ARRAY[
        'Shieldmaidens','Xuanjia Heavy Cavalry','Modao Battalion','Iron Reapers',
        'Shenji Grenadiers','Silahdars','Spartan Chosen','Sunward Phalanx',
        'Hashashins','Pavise Crossbowmen','Winged Hussars','Hwarang',
        'Falconetti Gunners','Tercio Arquebusiers','Liao''s Rangers',
        'Cataphract Lancers','Kheshigs','Yanyuedao Cavalry','Rattan Rangers',
        'Men-at-Arms','Wuwei Mansion Guard','Imperial Pike Guards','Palace Guards',
        'Imperial Spear Guards','Symmachean Paladins','Azaps','Halberdier Sergeants',
        'Symmachean Stalwarts','Fortebraccio Pikemen','Berserkers','Crescent Monks',
        'Banner Guards','Axe Raiders','Perceval''s Royal Guard','Greyhair Garrison',
        'Claymores','Tseregs','Myrmillones','Tiger Fists','Onna-Musha',
        'Imperial Javelineers','Laconic Javelins','Armiger Lancers','Imperial Archers',
        'Kriegsrat Fusiliers','Prefecture Heavy Cavalry','Vassal Longbowmen',
        'Camel Lancers','Dagger-Axe Lancers','Imperial Arquebusiers','Sipahis',
        'Matchlock Ashigaru','Companion Cavalry','Kriegsbruders','Swinefeathers',
        'Javelin Sergeants','Alchemists','Halberdiers','Jangjus','Mace Sergeants',
        'Qin''s Footbow','Ronin','Sons of Fenrir','Zykalian Militia','Bagpipers',
        'Helot Auxilary','Janissaries','Prefecture Guards','Rattan Marksmen',
        'Schutzdieners','Bedivere Rangers','Condottieri Guards','Dimachaeri',
        'Incendiary Archers','Namkhan Archers','Prefecture Pikemen','Cudgel Monks',
        'Feathered Crossbowmen','Ironcap Spearmen','Landsknechts','Outriders',
        'Psiloi Slingers','Reitar Pistoleers','Silla Guards','Wuxing Pikemen',
        'Pike Militia','Coutiliers','Demesne Archers','Ironcap Swordsmen',
        'Tenant Farmers','Martellatori','Serfs','Village Watchmen',
        'Ironcap Scout Cavalry','Rattan Roundshields','Woodcutters','Spear Militia',
        'Demesne Pikemen','Rattan Pikemen','Spear Sergeants','Squires',
        'Demesne Javelineers','Javelin Militia','Sword Militia','Demesne Arquebusiers',
        'Demesne Arbalists','Rattan Vipers','Vanguard Archers','Prefecture Archers',
        'Ironcap Arquebusiers','Ironcap Archers','Demesne Crossbowmen','Levy Bowmen',
        'Archer Militia','Fire Lancers','Yeomen','Ironcap Bowriders','Demesne Spearmen',
        'Monastic Knights','Houndsmen','Siphonarioi','Galahad Spearmen','Khorchins',
        'Khevtuul Cavalry','Varangian Guards','Halberd Elite','Empire Chariot',
        'Orochi Samurai','Doppelsoldner','Lancastrian Billmen','Zealot'
    ];

    -- preparedUnits (is_prepared = true) — subset of units
    v_prepared TEXT[] := ARRAY[
        'Shieldmaidens','Xuanjia Heavy Cavalry','Modao Battalion','Iron Reapers',
        'Shenji Grenadiers','Silahdars','Spartan Chosen','Sunward Phalanx',
        'Hashashins','Pavise Crossbowmen','Winged Hussars','Hwarang',
        'Falconetti Gunners','Tercio Arquebusiers','Liao''s Rangers',
        'Cataphract Lancers','Kheshigs','Yanyuedao Cavalry','Rattan Rangers',
        'Men-at-Arms','Wuwei Mansion Guard','Imperial Pike Guards','Palace Guards',
        'Imperial Spear Guards','Symmachean Paladins','Azaps','Halberdier Sergeants',
        'Symmachean Stalwarts','Fortebraccio Pikemen','Berserkers','Crescent Monks',
        'Banner Guards','Axe Raiders','Perceval''s Royal Guard','Greyhair Garrison',
        'Claymores','Tseregs','Myrmillones','Tiger Fists','Onna-Musha',
        'Armiger Lancers','Imperial Archers','Kriegsrat Fusiliers',
        'Prefecture Heavy Cavalry','Vassal Longbowmen','Camel Lancers',
        'Dagger-Axe Lancers','Imperial Arquebusiers','Sipahis','Companion Cavalry',
        'Kriegsbruders','Swinefeathers','Alchemists','Halberdiers','Jangjus',
        'Mace Sergeants','Sons of Fenrir','Zykalian Militia','Bagpipers','Janissaries',
        'Prefecture Guards','Rattan Marksmen','Schutzdieners','Bedivere Rangers',
        'Condottieri Guards','Dimachaeri','Incendiary Archers','Namkhan Archers',
        'Prefecture Pikemen','Cudgel Monks','Feathered Crossbowmen','Ironcap Spearmen',
        'Landsknechts','Outriders','Psiloi Slingers','Reitar Pistoleers','Silla Guards',
        'Pike Militia','Coutiliers','Tenant Farmers','Martellatori','Village Watchmen',
        'Ironcap Scout Cavalry','Monastic Knights','Houndsmen','Siphonarioi',
        'Galahad Spearmen','Empire Chariot','Varangian Guards','Doppelsoldner',
        'Orochi Samurai','Ronin','Halberd Elite'
    ];

    -- masteryUnits (is_mastery = true)
    v_mastery TEXT[] := ARRAY[
        'Men-at-Arms','Imperial Pike Guards','Imperial Spear Guards',
        'Symmachean Paladins','Azaps','Halberdier Sergeants','Symmachean Stalwarts',
        'Imperial Archers','Prefecture Heavy Cavalry','Vassal Longbowmen',
        'Dagger-Axe Lancers','Sipahis','Halberdiers','Mace Sergeants',
        'Prefecture Guards','Rattan Marksmen','Incendiary Archers','Ironcap Spearmen',
        'Outriders','Pike Militia','Ironcap Scout Cavalry','Palace Guards',
        'Coutiliers','Berserkers'
    ];

    -- favoriteUnits (is_favorite = true)
    v_favorites TEXT[] := ARRAY['Wuwei Mansion Guard'];

    v_unit TEXT;
    v_row RECORD;

BEGIN
    -- Rensa befintliga rader för denna profil (säker reset)
    DELETE FROM profile_units WHERE profile_id = v_profile_id;

    -- Bygg upp en komplett lista av alla unika unit-namn
    -- och sätt rätt flaggor baserat på vilka arrayer de finns i
    FOR v_unit IN SELECT DISTINCT unnest(v_units) LOOP
        INSERT INTO profile_units (profile_id, unit_name, is_owned, is_prepared, is_mastery, is_favorite)
        VALUES (
            v_profile_id,
            v_unit,
            true,                                        -- alla i v_units är owned
            v_unit = ANY(v_prepared),
            v_unit = ANY(v_mastery),
            v_unit = ANY(v_favorites)
        );
    END LOOP;

    RAISE NOTICE 'Import klar! Importerade % units för SirMom.', array_length(v_units, 1);
END $$;

-- ============================================================
-- VERIFIERING: Räkna importerade rader
-- Förväntat: ~130 owned, ~90 prepared, ~24 mastery, 1 favorite
-- ============================================================
SELECT
    COUNT(*) FILTER (WHERE is_owned)    AS owned,
    COUNT(*) FILTER (WHERE is_prepared) AS prepared,
    COUNT(*) FILTER (WHERE is_mastery)  AS mastery,
    COUNT(*) FILTER (WHERE is_favorite) AS favorites
FROM profile_units
WHERE profile_id = 'c87015b4-c06f-4ef8-8948-ca4d46d8e702'; -- << byt ut även här
