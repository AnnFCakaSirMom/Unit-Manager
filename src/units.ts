// units.ts
import type { UnitTiers } from './types';

export const DEFAULT_UNIT_TIERS: UnitTiers = {
    "Legendary": [
        { name: "Cataphract Lancers" }, { name: "Chevaliers" }, { name: "Empire Chariot" },
        { name: "Falconetti Gunners" }, { name: "Fire Lancers" }, { name: "Hashashins" },
        { name: "Houndsmen" }, { name: "Hwarang" }, { name: "Iron Reapers" },
        { name: "Kheshigs" }, { name: "Liao's Rangers" }, { name: "Lionroar Crew" },
        { name: "Modao Battalion" }, { name: "Monastic Knights" }, { name: "Order of the Dragon" },
        { name: "Orochi Samurai" }, { name: "Pavise Crossbowmen" }, { name: "Queen's Knights" },
        { name: "Rattan Rangers" }, { name: "Retiarii" }, { name: "Royal Longbowmen" },
        { name: "Shenji Grenadiers" }, { name: "Shieldmaidens" }, { name: "Silahdars" },
        { name: "Siphonarioi" }, { name: "Spartan Chosen" }, { name: "Sunward Phalanx" },
        { name: "Tercio Arquebusiers" }, { name: "Varangian Guards" }, { name: "Winged Hussars" },
        { name: "Xuanjia Heavy Cavalry" }, { name: "Yanyuedao Cavalry" }, { name: "Zweihanders" }
    ],
    "Epic": [
        { name: "Armiger Lancers" }, { name: "Axe Raiders" }, { name: "Azaps" },
        { name: "Banner Guards" }, { name: "Berserkers" }, { name: "Claymores" },
        { name: "Companion Cavalry" }, { name: "Crescent Monks" }, { name: "Dagger-Axe Lancers" },
        { name: "Fortebraccio Pikemen" }, { name: "Galahad Spearmen" }, { name: "Greyhair Garrison" },
        { name: "Halberd Elite" }, { name: "Halberdier Sergeants" }, { name: "Huskarls" },
        { name: "Imperial Archers" }, { name: "Imperial Arquebusiers" }, { name: "Imperial Javelineers" },
        { name: "Imperial Pike Guards" }, { name: "Imperial Spear Guards" }, { name: "Javelin Sergeants" },
        { name: "Khevtuul Cavalry" }, { name: "Kriegsbruders" }, { name: "Kriegsrat Fusiliers" },
        { name: "Laconic Javelins" }, { name: "Lancastrian Billmen" }, { name: "Matchlock Ashigaru" },
        { name: "Men-at-Arms" }, { name: "Myrmillones" }, { name: "Onna-Musha" },
        { name: "Palace Guards" }, { name: "Perceval's Royal Guard" }, { name: "Prefecture Heavy Cavalry" },
        { name: "Sipahis" }, { name: "Spear Sergeants" }, { name: "Swinefeathers" },
        { name: "Symmachean Paladins" }, { name: "Symmachean Stalwarts" }, { name: "Tiger Fists" },
        { name: "Tseregs" }, { name: "Vassal Longbowmen" }, { name: "Wuwei Mansion Guard" },
        { name: "Yeomen" }, { name: "Yorkist Household Knights" }
    ],
    "Rare": [
        { name: "Alchemists" }, { name: "Bagpipers" }, { name: "Bedivere Rangers" },
        { name: "Black Dragon Javelineers" }, { name: "Black Dragon Pikemen" }, { name: "Black Dragon Spearmen" },
        { name: "Condottieri Guards" }, { name: "Cudgel Monks" }, { name: "Demesne Arbalists" },
        { name: "Demesne Arquebusiers" }, { name: "Dimachaeri" }, { name: "Doppelsoldner" },
        { name: "Feathered Crossbowmen" }, { name: "Halberdiers" }, { name: "Helot Auxilary" },
        { name: "Incendiary Archers" }, { name: "Ironcap Spearmen" }, { name: "Janissaries" },
        { name: "Jangjus" }, { name: "Khorchins" }, { name: "Landsknechts" },
        { name: "Mace Sergeants" }, { name: "Naginata Monks" }, { name: "Namkhan Archers" },
        { name: "Outriders" }, { name: "Prefecture Archers" }, { name: "Prefecture Guards" },
        { name: "Prefecture Pikemen" }, { name: "Psiloi Slingers" }, { name: "Qin's Footbow" },
        { name: "Rattan Marksmen" }, { name: "Rattan Vipers" }, { name: "Reitar Pistoleers" },
        { name: "Ronin" }, { name: "Schutzdieners" }, { name: "Selemchid Cavalry" },
        { name: "Silla Guards" }, { name: "Sons of Fenrir" }, { name: "Squires" },
        { name: "Vanguard Archers" }, { name: "Wuxing Pikemen" }, { name: "Zykalian Militia" }
    ],
    "Uncommon": [
        { name: "Black Dragon Archers" }, { name: "Coutiliers" }, { name: "Demesne Archers" },
        { name: "Demesne Crossbowmen" }, { name: "Demesne Javelineers" }, { name: "Demesne Spearmen" },
        { name: "Ironcap Archers" }, { name: "Ironcap Arquebusiers" }, { name: "Ironcap Bowriders" },
        { name: "Ironcap Scout Cavalry" }, { name: "Ironcap Swordsmen" }, { name: "Javelin Militia" },
        { name: "Pike Militia" }, { name: "Rattan Pikemen" }, { name: "Rattan Roundshields" },
        { name: "Sea Stag Deathdealers" }
    ],
    "Common": [
        { name: "Demesne Pikemen" }, { name: "Levy Bowmen" }, { name: "Martellatori" },
        { name: "Serfs" }, { name: "Spear Militia" }, { name: "Sword Militia" },
        { name: "Tenant Farmers" }, { name: "Village Watchmen" }, { name: "Woodcutters" }
    ]
};