
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pgfptmszzflgwysvtalc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZnB0bXN6emZsZ3d5c3Z0YWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDg3ODAsImV4cCI6MjA5MjA4NDc4MH0.bFLGUwnj2MGuSaKbSpAZNIYc2RK-bNzEwx7QRm4dwYU'
);

const playerId = "8686e204-05fc-4bd8-8147-cfa41562ee8d";
const data = {
  "id": "8686e204-05fc-4bd8-8147-cfa41562ee8d",
  "name": "Paralyzed",
  "role": "Admin",
  "units": ["Vassal Longbowmen","Yeomen","Alchemists","Condottieri Guards","Demesne Arbalists","Demesne Arquebusiers","Dimachaeri","Halberdiers","Incendiary Archers","Ironcap Spearmen","Mace Sergeants","Naginata Monks","Outriders","Prefecture Guards","Prefecture Pikemen","Psiloi Slingers","Rattan Marksmen","Ronin","Sons of Fenrir","Squires","Vanguard Archers","Wuxing Pikemen","Zykalian Militia","Coutiliers","Demesne Archers","Demesne Crossbowmen","Demesne Spearmen","Ironcap Archers","Ironcap Arquebusiers","Ironcap Scout Cavalry","Ironcap Swordsmen","Javelin Militia","Pike Militia","Rattan Pikemen","Archer Militia","Demesne Pikemen","Levy Bowmen","Serfs","Spear Militia","Sword Militia","Tenant Farmers","Village Watchmen","Woodcutters","Sunward Phalanx","Halberdier Sergeants","Javelin Sergeants","Fire Lancers","Schutzdieners","Azaps","Sipahis","Janissaries","Rattan Vipers","Royal Longbowmen","Cataphract Lancers","Falconetti Gunners","Iron Reapers","Orochi Samurai","Pavise Crossbowmen","Rattan Rangers","Shenji Grenadiers","Shieldmaidens","Siphonarioi","Tercio Arquebusiers","Winged Hussars","Xuanjia Heavy Cavalry","Camel Lancers","Companion Cavalry","Crescent Monks","Dagger-Axe Lancers","Fortebraccio Pikemen","Imperial Archers","Imperial Arquebusiers","Imperial Javelineers","Kriegsrat Fusiliers","Matchlock Ashigaru","Men-at-Arms","Myrmillones","Onna-Musha","Prefecture Heavy Cavalry","Spear Sergeants","Symmachean Paladins","Symmachean Stalwarts","Berserkers","Chevaliers"],
  "joinedDate": "2023-04-08",
  "masteryUnits": ["Vassal Longbowmen","Condottieri Guards","Incendiary Archers","Ironcap Spearmen","Rattan Marksmen","Zykalian Militia","Ironcap Scout Cavalry","Pike Militia","Rattan Pikemen","Serfs","Dagger-Axe Lancers","Fortebraccio Pikemen","Imperial Archers","Men-at-Arms","Prefecture Heavy Cavalry","Symmachean Paladins","Symmachean Stalwarts"],
  "favoriteUnits": [],
  "preparedUnits": ["Vassal Longbowmen","Condottieri Guards","Dimachaeri","Incendiary Archers","Ironcap Spearmen","Rattan Marksmen","Sons of Fenrir","Zykalian Militia","Ironcap Scout Cavalry","Pike Militia","Rattan Pikemen","Serfs","Sunward Phalanx","Cataphract Lancers","Falconetti Gunners","Iron Reapers","Orochi Samurai","Rattan Rangers","Shenji Grenadiers","Shieldmaidens","Siphonarioi","Camel Lancers","Fortebraccio Pikemen","Imperial Archers","Men-at-Arms","Myrmillones","Onna-Musha","Prefecture Heavy Cavalry","Symmachean Paladins","Symmachean Stalwarts","Berserkers"],
  "totalLeadership": 788
};

async function restore() {
  console.log(`Starting restoration for player: ${data.name} (${playerId})`);

  // 1. Update Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      total_leadership: data.totalLeadership,
      joined_date: data.joinedDate
    })
    .eq('id', playerId);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    return;
  }
  console.log('Profile basic info updated.');

  // 2. Clear Units
  const { error: deleteError } = await supabase
    .from('profile_units')
    .delete()
    .eq('profile_id', playerId);

  if (deleteError) {
    console.error('Error clearing old units:', deleteError);
    return;
  }
  console.log('Old unit data cleared.');

  // 3. Prepare units for insertion
  const allUnits = new Set([...data.units, ...data.preparedUnits, ...data.masteryUnits, ...data.favoriteUnits]);
  const unitsToInsert = Array.from(allUnits).map(unitName => ({
    profile_id: playerId,
    unit_name: unitName,
    is_owned: data.units.includes(unitName),
    is_prepared: data.preparedUnits.includes(unitName),
    is_mastery: data.masteryUnits.includes(unitName),
    is_favorite: data.favoriteUnits.includes(unitName)
  }));

  if (unitsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('profile_units')
      .insert(unitsToInsert);

    if (insertError) {
      console.error('Error inserting units:', insertError);
      return;
    }
    console.log(`Successfully restored ${unitsToInsert.length} units.`);
  }

  console.log('Restoration complete!');
}

restore();
