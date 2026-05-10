import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Manually load .env.local
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
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking schema for table: group_members...');
  const { data, error } = await supabase.from('group_members').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Successfully connected!');
    if (data.length === 0) {
      console.log('Table is empty, but we can still check columns if we can find them.');
      // Fallback to a query that returns columns even if no rows
      const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'group_members' });
      if (colError) {
         console.log('Note: RPC "get_table_columns" not available. Try adding a row to see columns.');
      } else {
         console.log('Columns:', cols);
      }
    } else {
      console.log('Columns found in first row:', Object.keys(data[0]));
    }
  }
}

checkSchema();
