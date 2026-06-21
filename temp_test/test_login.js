import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqwlypzvgufqnveyyspm.supabase.co';
const supabaseAnonKey = 'sb_publishable_u99zEgEB8snzxYmKBEN_HQ_cCyHP-f0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUser(email, password) {
  console.log(`Testing login for ${email}...`);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      console.log(`❌ Login failed: ${error.status} - ${error.message}`);
    } else {
      console.log(`✅ Login success! User ID: ${data.user.id}`);
    }
  } catch (err) {
    console.error(`💥 Unexpected error:`, err);
  }
}

async function run() {
  await testUser('mohannad@diploma.local', 'Mohannad123');
  await testUser('nariman@diploma.local', 'Nariman123');
  await testUser('ziad@diploma.local', 'Ziad123');
}

run();
