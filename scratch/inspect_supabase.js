import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  console.log('Using Service Role Key:', !!envConfig.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from('profiles').select('id, discord_nickname, display_name').limit(5);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('--- Supabase Sample ---');
    console.table(data);
    const { count, error: countErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log('Total profile count:', count);
  }
}

inspect();
