import { supabase } from './src/services/supabase';

async function checkSchema() {
  const { data, error } = await supabase.from('group_members').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

checkSchema();
