/**
 * merge_json_to_supabase.js
 * Safely merges unit data from a local JSON file into Supabase.
 * Matches profiles by name since IDs might differ.
 */
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CONFIGURATION
const JSON_FILE_PATH = 'C:/Users/SudanWarrior/Desktop/Program/conquerors-blade-data.json';
const DRY_RUN = process.argv.includes('--execute') ? false : true;

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    acc[key.trim()] = value.join('=').trim();
    return acc;
  }, {});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Required credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to canonicalize names for matching
const cleanName = (n) => n?.toString().trim();

async function runMerge() {
  console.log(`\n=== UNIT MANAGER MERGE TOOL (v2: Name Matching) ===`);
  console.log(`Target: ${JSON_FILE_PATH}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (Simulating)' : 'EXECUTION (Writing to database)'}\n`);

  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`Error: JSON file not found at ${JSON_FILE_PATH}`);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));
  const jsonPlayers = rawData.players || [];
  console.log(`Found ${jsonPlayers.length} players in JSON file.\n`);

  // Fetch all existing profiles and their units from Supabase
  console.log('Fetching 202 profiles from Supabase...');
  const { data: existingProfiles, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      discord_nickname,
      display_name,
      profile_units (
        unit_name,
        is_owned,
        is_prepared,
        is_mastery,
        is_favorite
      )
    `);

  if (profileError) {
    console.error('Error fetching profiles:', profileError.message);
    return;
  }

  // Create name maps for matching
  const nameMap = new Map();
  existingProfiles.forEach(p => {
    if (p.display_name) nameMap.set(cleanName(p.display_name), p);
    if (p.discord_nickname) nameMap.set(cleanName(p.discord_nickname), p);
  });

  let totalUpdated = 0;
  let totalCreated = 0;
  let totalAlreadyCorrect = 0;
  let totalUnitsAdded = 0;

  for (const jp of jsonPlayers) {
    const ep = nameMap.get(cleanName(jp.name));
    
    if (!ep) {
      // 1. CREATE NEW PROFILE (if missing from Supabase entirely)
      console.log(`[NEW] player "${jp.name}" not in Supabase. Plan: Create profile.`);
      if (!DRY_RUN) {
        const profileData = {
          id: jp.id,
          discord_nickname: jp.name,
          display_name: jp.name,
          total_leadership: jp.totalLeadership || 0,
          joined_date: jp.joinedDate || null,
          inactive_date: jp.inactiveDate || null,
          not_in_house: jp.notInHouse || false,
          role: 'Member',
          discord_aliases: jp.aliases || []
        };
        await supabase.from('profiles').upsert(profileData);
        const allUnits = new Set([...jp.units, ...jp.preparedUnits, ...jp.masteryUnits, ...jp.favoriteUnits]);
        const unitsToInsert = Array.from(allUnits).map(unit_name => ({
          profile_id: jp.id,
          unit_name,
          is_owned: jp.units.includes(unit_name),
          is_prepared: jp.preparedUnits.includes(unit_name),
          is_mastery: jp.masteryUnits.includes(unit_name),
          is_favorite: jp.favoriteUnits.includes(unit_name),
        }));
        if (unitsToInsert.length > 0) await supabase.from('profile_units').insert(unitsToInsert);
      }
      totalCreated++;
      totalUnitsAdded += (new Set([...jp.units, ...jp.preparedUnits, ...jp.masteryUnits, ...jp.favoriteUnits])).size;
      continue;
    }

    // 2. MERGE EXISTING PROFILE
    const existingUnits = new Map(ep.profile_units.map(u => [u.unit_name, u]));
    const unitsToUpsert = [];
    let playerUnitsToFill = 0;

    const jsonAllUnits = new Set([...jp.units, ...jp.preparedUnits, ...jp.masteryUnits, ...jp.favoriteUnits]);

    for (const unitName of jsonAllUnits) {
      const eu = existingUnits.get(unitName);
      
      const jsonOwned = jp.units.includes(unitName);
      const jsonPrep = jp.preparedUnits.includes(unitName);
      const jsonMast = jp.masteryUnits.includes(unitName);
      const jsonFav = jp.favoriteUnits.includes(unitName);

      if (!eu) {
        // Unit missing entirely
        unitsToUpsert.push({
          profile_id: ep.id,
          unit_name: unitName,
          is_owned: jsonOwned,
          is_prepared: jsonPrep,
          is_mastery: jsonMast,
          is_favorite: jsonFav
        });
        playerUnitsToFill++;
      } else {
        // Unit exists, merge 'true' values from JSON that are 'false' in Supabase
        const needsUpdate = 
          (jsonOwned && !eu.is_owned) ||
          (jsonPrep  && !eu.is_prepared) ||
          (jsonMast  && !eu.is_mastery) ||
          (jsonFav   && !eu.is_favorite);

        if (needsUpdate) {
          unitsToUpsert.push({
            profile_id: ep.id,
            unit_name: unitName,
            is_owned:    eu.is_owned || jsonOwned,
            is_prepared: eu.is_prepared || jsonPrep,
            is_mastery:  eu.is_mastery || jsonMast,
            is_favorite: eu.is_favorite || jsonFav
          });
          playerUnitsToFill++;
        }
      }
    }

    if (playerUnitsToFill > 0) {
      console.log(`[UPDATE] player "${cleanName(jp.name)}" - Found ${playerUnitsToFill} missing unit markers.`);
      if (!DRY_RUN) {
        const { error: upsertErr } = await supabase.from('profile_units').upsert(unitsToUpsert);
        if (upsertErr) console.error(`  Failed units for ${jp.name}:`, upsertErr.message);
      }
      totalUpdated++;
      totalUnitsAdded += playerUnitsToFill;
    } else {
      totalAlreadyCorrect++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`- Profiles matched and already correct: ${totalAlreadyCorrect}`);
  console.log(`- Profiles to update with missing units: ${totalUpdated}`);
  console.log(`- Total missing unit markers to be filled: ${totalUnitsAdded}`);
  console.log(`- JSON players that still don't exist in Supabase: ${totalCreated}`);

  if (DRY_RUN) {
    console.log(`\n>>> To perform the actual merge, run this command with the --execute flag.`);
  } else {
    console.log(`\n>>> Merge completed successfully!`);
  }
}

runMerge().catch(err => console.error('Script failed:', err));
