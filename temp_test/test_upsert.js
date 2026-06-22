import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqwlypzvgufqnveyyspm.supabase.co';
const supabaseAnonKey = 'sb_publishable_u99zEgEB8snzxYmKBEN_HQ_cCyHP-f0';

async function test() {
  console.log('Initializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Signing in as mohannad...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'mohannad@diploma.local',
    password: 'Mohannad123'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const user = authData.user;
  console.log('Logged in successfully. User ID:', user.id);

  // Let's download the current data first
  const { data: existingData, error: fetchError } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  const payload = existingData?.data || {
    username: 'mohannad',
    diplomas: [],
    students: [],
    sessions: [],
    announcements: [],
    tasks: [],
    config: null
  };

  // Let's add some simulated imported students (with some undefined fields or weird fields, or just standard fields)
  payload.students.push({
    id: `st-import-${Date.now()}-1`,
    name: 'طالب تجريبي مستورد',
    parentName: 'ولي أمر تجريبي',
    phone: '+966500000001',
    email: 'test@example.com',
    notes: 'مستورد من ملف CSV للعمليات المعينة',
    joinedDate: '2026-06-22',
    diplomaIds: ['dip-1']
  });

  console.log('Attempting to upsert data with new students...');
  const { data: upsertData, error: upsertError } = await supabase
    .from('user_data')
    .upsert({
      user_id: user.id,
      data: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('Upsert failed with error:', JSON.stringify(upsertError, null, 2));
  } else {
    console.log('Upsert succeeded!', upsertData);
  }
}

test().catch(console.error);
