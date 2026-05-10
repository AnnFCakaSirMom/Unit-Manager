
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pgfptmszzflgwysvtalc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZnB0bXN6emZsZ3d5c3Z0YWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDg3ODAsImV4cCI6MjA5MjA4NDc4MH0.bFLGUwnj2MGuSaKbSpAZNIYc2RK-bNzEwx7QRm4dwYU'
);

async function checkRecentLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log('Recent Audit Logs:');
  data.forEach(log => {
    console.log(`[${log.created_at}] ${log.action_type}: ${log.action_detail}`);
  });
}

checkRecentLogs();
